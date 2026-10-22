import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import pg from 'pg';
import { query, withTransaction } from '../db/pool.js';
import { allocateDailyToken } from '../utils/tokens.js';
import {
  CreateOnlineOrderInput,
  CreateCounterOrderInput,
  UpdateOrderStatusInput,
} from '../validators/order.js';
import { logger } from '../utils/logger.js';

interface CalculatedOrderItem {
  foodItemId: number;
  foodName: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
}

/**
 * Checks idempotency key table. Returns stored response if valid retry, or throws if payload mismatch.
 */
async function checkIdempotency(
  key: string,
  scope: string,
  userId: string | null,
  payload: any
): Promise<{ exists: boolean; status?: number; body?: any; error?: string }> {
  const requestHash = crypto.createHash('sha256').update(JSON.stringify(payload)).digest('hex');

  const result = await query<{
    request_hash: string;
    response_status: number;
    response_body: any;
    user_id: string | null;
  }>(
    'SELECT request_hash, response_status, response_body, user_id FROM idempotency_keys WHERE key = $1 AND scope = $2',
    [key, scope]
  );

  if (result.rowCount && result.rowCount > 0) {
    const existing = result.rows[0];
    if (existing.request_hash !== requestHash) {
      return {
        exists: true,
        error: 'Idempotency key reuse with different request payload is prohibited.',
      };
    }
    return {
      exists: true,
      status: existing.response_status,
      body: existing.response_body,
    };
  }

  return { exists: false };
}

export async function createOnlineOrder(req: Request<{}, {}, CreateOnlineOrderInput>, res: Response, next: NextFunction): Promise<void> {
  const idempotencyKey = (req.headers['idempotency-key'] as string | undefined)?.trim();
  const userId = req.session?.user?.id;
  if (!userId) {
    res.status(401).json({ error: 'Authentication required to create online order', code: 'UNAUTHORIZED' });
    return;
  }
  const { items, customerName, customerPhone } = req.body;

  // 1. Idempotency Check
  if (idempotencyKey) {
    const idemp = await checkIdempotency(idempotencyKey, 'online_order', userId, req.body);
    if (idemp.exists) {
      if (idemp.error) {
        res.status(422).json({ error: idemp.error, code: 'IDEMPOTENCY_PAYLOAD_MISMATCH' });
        return;
      }
      res.status(idemp.status!).json(idemp.body);
      return;
    }
  }

  try {
    const orderResult = await withTransaction(async (client) => {
      // 2. Fetch and lock food items from DB to prevent race conditions on stock
      const foodItemIds = items.map(i => i.foodItemId);
      const foodRows = await client.query<{
        id: number;
        name: string;
        price: string;
        is_available: boolean;
        stock_qty: number;
      }>(
        `SELECT id, name, price, is_available, stock_qty 
         FROM food_items 
         WHERE id = ANY($1::int[]) AND deleted_at IS NULL 
         FOR UPDATE`,
        [foodItemIds]
      );

      const foodMap = new Map(foodRows.rows.map(f => [f.id, f]));

      // Validate all items exist and are available
      const calculatedItems: CalculatedOrderItem[] = [];
      let calculatedTotal = 0;

      for (const reqItem of items) {
        const dbItem = foodMap.get(reqItem.foodItemId);
        if (!dbItem) {
          throw new Error(`Food item #${reqItem.foodItemId} does not exist`);
        }

        if (!dbItem.is_available) {
          throw new Error(`"${dbItem.name}" is currently marked as unavailable`);
        }

        // Validate internal stock protection
        if (dbItem.stock_qty < reqItem.quantity) {
          throw new Error(`Insufficient stock for "${dbItem.name}". Only ${dbItem.stock_qty} available.`);
        }

        const unitPrice = parseFloat(dbItem.price);
        const lineTotal = Math.round(unitPrice * reqItem.quantity * 100) / 100;
        calculatedTotal += lineTotal;

        calculatedItems.push({
          foodItemId: dbItem.id,
          foodName: dbItem.name,
          quantity: reqItem.quantity,
          unitPrice,
          lineTotal,
        });

        // Decrement internal stock quantity transactionally
        await client.query(
          `UPDATE food_items 
           SET stock_qty = stock_qty - $1, 
               is_available = CASE WHEN stock_qty - $1 <= 0 THEN false ELSE is_available END,
               updated_at = NOW() 
           WHERE id = $2`,
          [reqItem.quantity, dbItem.id]
        );
      }

      // 3. Concurrency-safe daily token allocation (shared sequence starting at 101)
      const tokenAllocation = await allocateDailyToken(client);

      // 4. Insert orders row
      // RULE: Online orders start as payment_status = 'pending'
      const orderInsert = await client.query<{
        id: string;
        order_type: string;
        token_number: number;
        business_date: string;
        status: string;
        total_amount: string;
        payment_method: string;
        payment_status: string;
        qr_token: string;
        customer_name: string | null;
        customer_phone: string | null;
        created_at: string;
      }>(
        `INSERT INTO orders (
          user_id, order_type, token_number, business_date, status,
          total_amount, payment_method, payment_status, customer_name, customer_phone
        ) VALUES ($1, 'online', $2, $3, 'ordered', $4, 'upi', 'pending', $5, $6)
        RETURNING *`,
        [
          userId,
          tokenAllocation.tokenNumber,
          tokenAllocation.businessDate,
          calculatedTotal,
          customerName?.trim() || req.session?.user?.name || 'Online Customer',
          customerPhone?.trim() || null,
        ]
      );

      const createdOrder = orderInsert.rows[0];

      // 5. Insert order items
      for (const item of calculatedItems) {
        await client.query(
          `INSERT INTO order_items (order_id, food_item_id, food_name, quantity, unit_price, line_total)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [createdOrder.id, item.foodItemId, item.foodName, item.quantity, item.unitPrice, item.lineTotal]
        );
      }

      // 6. Record status history
      await client.query(
        `INSERT INTO order_status_history (order_id, from_status, to_status, changed_by, notes)
         VALUES ($1, NULL, 'ordered', $2, 'Online pre-order created')`,
        [createdOrder.id, userId]
      );

      const responsePayload = {
        message: 'Online pre-order created successfully',
        order: {
          ...createdOrder,
          items: calculatedItems,
        },
      };

      // 7. Store idempotency key if provided
      if (idempotencyKey) {
        const requestHash = crypto.createHash('sha256').update(JSON.stringify(req.body)).digest('hex');
        await client.query(
          `INSERT INTO idempotency_keys (key, scope, user_id, request_hash, response_status, response_body)
           VALUES ($1, 'online_order', $2, $3, 201, $4)`,
          [idempotencyKey, userId, requestHash, responsePayload]
        );
      }

      return responsePayload;
    });

    res.status(201).json(orderResult);
  } catch (error: any) {
    // Concurrent idempotency retry handling: unique violation indicates another simultaneous transaction committed this key
    if (idempotencyKey && (error.code === '23505' || error.message?.includes('idempotency_keys'))) {
      const idemp = await checkIdempotency(idempotencyKey, 'online_order', userId, req.body);
      if (idemp.exists) {
        if (idemp.error) {
          res.status(422).json({ error: idemp.error, code: 'IDEMPOTENCY_PAYLOAD_MISMATCH' });
          return;
        }
        res.status(idemp.status!).json(idemp.body);
        return;
      }
    }

    if (
      error.message.includes('unavailable') ||
      error.message.includes('Insufficient stock') ||
      error.message.includes('does not exist')
    ) {
      res.status(400).json({ error: error.message, code: 'STOCK_OR_AVAILABILITY_ERROR' });
      return;
    }
    next(error);
  }
}

export async function createCounterOrder(req: Request<{}, {}, CreateCounterOrderInput>, res: Response, next: NextFunction): Promise<void> {
  const idempotencyKey = (req.headers['idempotency-key'] as string | undefined)?.trim();
  const staffUserId = req.session?.user?.id || null;
  const { items, paymentMethod, customerName, customerPhone } = req.body;

  // 1. Idempotency Check
  if (idempotencyKey) {
    const idemp = await checkIdempotency(idempotencyKey, 'counter_order', staffUserId, req.body);
    if (idemp.exists) {
      if (idemp.error) {
        res.status(422).json({ error: idemp.error, code: 'IDEMPOTENCY_PAYLOAD_MISMATCH' });
        return;
      }
      res.status(idemp.status!).json(idemp.body);
      return;
    }
  }

  try {
    const orderResult = await withTransaction(async (client) => {
      const foodItemIds = items.map(i => i.foodItemId);
      const foodRows = await client.query<{
        id: number;
        name: string;
        price: string;
        is_available: boolean;
        stock_qty: number;
      }>(
        `SELECT id, name, price, is_available, stock_qty 
         FROM food_items 
         WHERE id = ANY($1::int[]) AND deleted_at IS NULL 
         FOR UPDATE`,
        [foodItemIds]
      );

      const foodMap = new Map(foodRows.rows.map(f => [f.id, f]));
      const calculatedItems: CalculatedOrderItem[] = [];
      let calculatedTotal = 0;

      for (const reqItem of items) {
        const dbItem = foodMap.get(reqItem.foodItemId);
        if (!dbItem) {
          throw new Error(`Food item #${reqItem.foodItemId} does not exist`);
        }
        if (!dbItem.is_available) {
          throw new Error(`"${dbItem.name}" is currently marked as unavailable`);
        }
        if (dbItem.stock_qty < reqItem.quantity) {
          throw new Error(`Insufficient stock for "${dbItem.name}". Only ${dbItem.stock_qty} available.`);
        }

        const unitPrice = parseFloat(dbItem.price);
        const lineTotal = Math.round(unitPrice * reqItem.quantity * 100) / 100;
        calculatedTotal += lineTotal;

        calculatedItems.push({
          foodItemId: dbItem.id,
          foodName: dbItem.name,
          quantity: reqItem.quantity,
          unitPrice,
          lineTotal,
        });

        // Deduct inventory
        await client.query(
          `UPDATE food_items 
           SET stock_qty = stock_qty - $1, 
               is_available = CASE WHEN stock_qty - $1 <= 0 THEN false ELSE is_available END,
               updated_at = NOW() 
           WHERE id = $2`,
          [reqItem.quantity, dbItem.id]
        );
      }

      // Shared daily token sequence
      const tokenAllocation = await allocateDailyToken(client);

      // Counter orders confirmed by cashier are marked paid
      const orderInsert = await client.query<{
        id: string;
        order_type: string;
        token_number: number;
        business_date: string;
        status: string;
        total_amount: string;
        payment_method: string;
        payment_status: string;
        qr_token: string;
        customer_name: string | null;
        customer_phone: string | null;
        created_at: string;
      }>(
        `INSERT INTO orders (
          user_id, order_type, token_number, business_date, status,
          total_amount, payment_method, payment_status, customer_name, customer_phone
        ) VALUES (NULL, 'offline', $1, $2, 'ordered', $3, $4, 'paid', $5, $6)
        RETURNING *`,
        [
          tokenAllocation.tokenNumber,
          tokenAllocation.businessDate,
          calculatedTotal,
          paymentMethod,
          customerName || 'Counter Walk-in',
          customerPhone || null,
        ]
      );

      const createdOrder = orderInsert.rows[0];

      // Insert line items
      for (const item of calculatedItems) {
        await client.query(
          `INSERT INTO order_items (order_id, food_item_id, food_name, quantity, unit_price, line_total)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [createdOrder.id, item.foodItemId, item.foodName, item.quantity, item.unitPrice, item.lineTotal]
        );
      }

      // Status history
      await client.query(
        `INSERT INTO order_status_history (order_id, from_status, to_status, changed_by, notes)
         VALUES ($1, NULL, 'ordered', $2, 'Counter offline order placed by staff')`,
        [createdOrder.id, staffUserId]
      );

      const responsePayload = {
        message: 'Counter offline order created successfully',
        order: {
          ...createdOrder,
          items: calculatedItems,
        },
      };

      if (idempotencyKey) {
        const requestHash = crypto.createHash('sha256').update(JSON.stringify(req.body)).digest('hex');
        await client.query(
          `INSERT INTO idempotency_keys (key, scope, user_id, request_hash, response_status, response_body)
           VALUES ($1, 'counter_order', $2, $3, 201, $4)`,
          [idempotencyKey, staffUserId, requestHash, responsePayload]
        );
      }

      return responsePayload;
    });

    res.status(201).json(orderResult);
  } catch (error: any) {
    // Concurrent idempotency retry handling for counter orders
    if (idempotencyKey && (error.code === '23505' || error.message?.includes('idempotency_keys'))) {
      const idemp = await checkIdempotency(idempotencyKey, 'counter_order', staffUserId, req.body);
      if (idemp.exists) {
        if (idemp.error) {
          res.status(422).json({ error: idemp.error, code: 'IDEMPOTENCY_PAYLOAD_MISMATCH' });
          return;
        }
        res.status(idemp.status!).json(idemp.body);
        return;
      }
    }

    if (
      error.message.includes('unavailable') ||
      error.message.includes('Insufficient stock') ||
      error.message.includes('does not exist')
    ) {
      res.status(400).json({ error: error.message, code: 'STOCK_OR_AVAILABILITY_ERROR' });
      return;
    }
    next(error);
  }
}

export async function listOrders(req: Request, res: Response, next: NextFunction): Promise<void> {
  const user = req.session?.user;
  const { status, type, date, limit = '50', offset = '0' } = req.query;

  try {
    let sql = `
      SELECT 
        o.id,
        o.order_type,
        o.token_number,
        o.business_date,
        o.status,
        o.total_amount,
        o.payment_method,
        o.payment_status,
        o.qr_token,
        o.qr_used,
        o.customer_name,
        o.customer_phone,
        o.created_at,
        json_agg(
          json_build_object(
            'id', oi.id,
            'foodItemId', oi.food_item_id,
            'foodName', oi.food_name,
            'quantity', oi.quantity,
            'unitPrice', oi.unit_price,
            'lineTotal', oi.line_total
          )
        ) AS items
      FROM orders o
      LEFT JOIN order_items oi ON o.id = oi.order_id
      WHERE 1=1
    `;
    const params: any[] = [];

    // Role-based scoping:
    // If Customer: only see their own orders
    if (!user || user.role === 'customer') {
      if (!user) {
        res.status(401).json({ error: 'Authentication required to list customer orders', code: 'UNAUTHORIZED' });
        return;
      }
      params.push(user.id);
      sql += ` AND o.user_id = $${params.length}`;
    }

    // Manager 7-day rolling window restriction (Section 8 & 13)
    if (user?.role === 'manager' && !date) {
      sql += ` AND o.business_date >= (CURRENT_DATE - INTERVAL '7 days')`;
    }

    if (status && typeof status === 'string') {
      params.push(status);
      sql += ` AND o.status = $${params.length}`;
    }

    if (type && typeof type === 'string') {
      params.push(type);
      sql += ` AND o.order_type = $${params.length}`;
    }

    if (date && typeof date === 'string') {
      params.push(date);
      sql += ` AND o.business_date = $${params.length}`;
    }

    sql += ` GROUP BY o.id ORDER BY o.created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(Math.min(parseInt(limit as string, 10) || 50, 100));
    params.push(parseInt(offset as string, 10) || 0);

    const result = await query(sql, params);
    res.status(200).json({ orders: result.rows });
  } catch (error) {
    next(error);
  }
}

export async function getOrderById(req: Request, res: Response, next: NextFunction): Promise<void> {
  const { id } = req.params;
  const user = req.session?.user;

  try {
    const result = await query(
      `SELECT 
        o.id,
        o.user_id,
        o.order_type,
        o.token_number,
        o.business_date,
        o.status,
        o.total_amount,
        o.payment_method,
        o.payment_status,
        o.qr_token,
        o.qr_used,
        o.customer_name,
        o.customer_phone,
        o.created_at,
        json_agg(
          json_build_object(
            'id', oi.id,
            'foodItemId', oi.food_item_id,
            'foodName', oi.food_name,
            'quantity', oi.quantity,
            'unitPrice', oi.unit_price,
            'lineTotal', oi.line_total
          )
        ) AS items
      FROM orders o
      LEFT JOIN order_items oi ON o.id = oi.order_id
      WHERE o.id = $1
      GROUP BY o.id`,
      [id]
    );

    if (result.rowCount === 0) {
      res.status(404).json({ error: 'Order not found', code: 'ORDER_NOT_FOUND' });
      return;
    }

    const order = result.rows[0];

    // Ownership authorization (Prevent Insecure Direct Object References - IDOR)
    if (user?.role === 'customer' && (!order.user_id || order.user_id !== user.id)) {
      res.status(403).json({ error: 'Access denied to this order record', code: 'FORBIDDEN' });
      return;
    }

    res.status(200).json({ order });
  } catch (error) {
    next(error);
  }
}

export async function updateOrderStatus(req: Request<{ id: string }, {}, UpdateOrderStatusInput>, res: Response, next: NextFunction): Promise<void> {
  const { id } = req.params;
  const { status: nextStatus, notes } = req.body;
  const staffUserId = req.session?.user?.id;

  try {
    const orderRes = await query<{
      id: string;
      status: string;
      order_type: string;
      payment_status: string;
      token_number: number;
    }>(
      'SELECT id, status, order_type, payment_status, token_number FROM orders WHERE id = $1',
      [id]
    );

    if (orderRes.rowCount === 0) {
      res.status(404).json({ error: 'Order not found', code: 'ORDER_NOT_FOUND' });
      return;
    }

    const order = orderRes.rows[0];
    const currentStatus = order.status;

    // MANDATORY STATUS TRANSITION SEQUENCE: ordered → preparing → ready → completed
    const allowedTransitions: Record<string, string[]> = {
      ordered: ['preparing'],
      preparing: ['ready'],
      ready: ['completed'],
      completed: [],
    };

    if (!allowedTransitions[currentStatus]?.includes(nextStatus)) {
      res.status(400).json({
        error: `Invalid status transition from "${currentStatus}" to "${nextStatus}". Approved sequence is ordered → preparing → ready → completed.`,
        code: 'INVALID_STATUS_TRANSITION',
      });
      return;
    }

    // MANDATORY SECURITY RULE:
    // "An unpaid online order must NEVER be marked ready or completed."
    if (order.order_type === 'online' && order.payment_status === 'pending') {
      if (nextStatus === 'ready' || nextStatus === 'completed') {
        res.status(400).json({
          error: `Order #${order.token_number} is UNPAID (Payment: Pending). Unpaid online orders cannot move to ready or completed.`,
          code: 'UNPAID_ORDER_CANNOT_PROCEED',
        });
        return;
      }
    }

    // Apply update in a transaction
    await withTransaction(async (client) => {
      await client.query(
        `UPDATE orders 
         SET status = $1::varchar, 
             qr_used = CASE WHEN $1::varchar = 'completed' THEN true ELSE qr_used END,
             updated_at = NOW() 
         WHERE id = $2`,
        [nextStatus, id]
      );

      await client.query(
        `INSERT INTO order_status_history (order_id, from_status, to_status, changed_by, notes)
         VALUES ($1, $2, $3, $4, $5)`,
        [id, currentStatus, nextStatus, staffUserId, notes || null]
      );
    });

    res.status(200).json({
      message: `Order #${order.token_number} status updated to ${nextStatus}`,
      orderId: id,
      previousStatus: currentStatus,
      newStatus: nextStatus,
    });
  } catch (error) {
    next(error);
  }
}

export async function getOrderBill(req: Request, res: Response, next: NextFunction): Promise<void> {
  const { id } = req.params;
  const copyType = (req.query.type as string) || 'customer';
  const user = req.session?.user;

  try {
    const result = await query(
      `SELECT 
        o.id,
        o.user_id,
        o.token_number,
        o.order_type,
        o.business_date,
        o.status,
        o.total_amount,
        o.payment_method,
        o.payment_status,
        o.customer_name,
        o.created_at,
        json_agg(
          json_build_object(
            'foodName', oi.food_name,
            'quantity', oi.quantity,
            'unitPrice', oi.unit_price,
            'lineTotal', oi.line_total
          )
        ) AS items
      FROM orders o
      JOIN order_items oi ON o.id = oi.order_id
      WHERE o.id = $1
      GROUP BY o.id`,
      [id]
    );

    if (result.rowCount === 0) {
      res.status(404).json({ error: 'Order not found', code: 'ORDER_NOT_FOUND' });
      return;
    }

    const bill = result.rows[0];

    // Ownership authorization on printable bill (IDOR prevention)
    if (user?.role === 'customer' && (!bill.user_id || bill.user_id !== user.id)) {
      res.status(403).json({ error: 'Access denied to this bill record', code: 'FORBIDDEN' });
      return;
    }

    res.status(200).json({
      bill: {
        header: 'SMART FOOD COURT',
        facility: 'Campus Center, Ground Floor',
        timezone: 'Asia/Kolkata',
        copyType: copyType === 'kitchen' ? 'KITCHEN_COPY_KOT' : 'CUSTOMER_RECEIPT',
        ...bill,
      },
    });
  } catch (error) {
    next(error);
  }
}
