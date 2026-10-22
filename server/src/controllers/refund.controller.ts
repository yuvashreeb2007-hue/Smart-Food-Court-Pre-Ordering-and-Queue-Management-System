import { Request, Response, NextFunction } from 'express';
import { query, withTransaction } from '../db/pool.js';
import { CreateRefundInput } from '../validators/refund.js';
import { logger } from '../utils/logger.js';

export async function createRefund(req: Request<{}, {}, CreateRefundInput>, res: Response, next: NextFunction): Promise<void> {
  const managerId = req.session?.user?.id;
  const { orderId, amount, reason, refundType, paymentReference, notes } = req.body;

  try {
    const refundRecord = await withTransaction(async (client) => {
      // 1. Verify target order exists
      const orderRes = await client.query<{
        id: string;
        token_number: number;
        total_amount: string;
        payment_status: string;
        order_type: string;
      }>(
        'SELECT id, token_number, total_amount, payment_status, order_type FROM orders WHERE id = $1 FOR UPDATE',
        [orderId]
      );

      if (orderRes.rowCount === 0) {
        throw new Error('Target order not found');
      }

      const order = orderRes.rows[0];
      const orderTotal = parseFloat(order.total_amount);

      // 2. Fetch prior refunds for this order
      const priorRefunds = await client.query<{ sum: string | null }>(
        'SELECT COALESCE(SUM(amount), 0) AS sum FROM refunds WHERE order_id = $1',
        [orderId]
      );

      const alreadyRefunded = parseFloat(priorRefunds.rows[0].sum || '0');
      const remainingRefundable = Math.round((orderTotal - alreadyRefunded) * 100) / 100;

      if (amount > remainingRefundable) {
        throw new Error(
          `Requested refund of ₹${amount} exceeds remaining refundable balance of ₹${remainingRefundable} (Order total: ₹${orderTotal}, prior refunds: ₹${alreadyRefunded}).`
        );
      }

      // Initial status:
      // In-person cash: 'recorded' (explicitly manual counter return)
      // Electronic: 'processing' (pending verified gateway confirmation)
      const initialStatus = refundType === 'in_person_cash' ? 'recorded' : 'processing';

      const insertRes = await client.query<{
        id: string;
        order_id: string;
        manager_id: string;
        amount: string;
        reason: string;
        status: string;
        refund_type: string;
        notes: string | null;
        created_at: string;
      }>(
        `INSERT INTO refunds (
          order_id, manager_id, amount, reason, payment_reference,
          status, refund_type, notes
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING *`,
        [
          orderId,
          managerId,
          amount,
          reason.trim(),
          paymentReference?.trim() || null,
          initialStatus,
          refundType,
          notes?.trim() || (refundType === 'in_person_cash' ? 'In-person cash refund issued at manager desk.' : null),
        ]
      );

      logger.info('Manager recorded order refund', {
        refundId: insertRes.rows[0].id,
        orderId,
        amount,
        refundType,
        status: initialStatus,
      });

      return {
        refund: insertRes.rows[0],
        orderToken: order.token_number,
        remainingRefundable: Math.round((remainingRefundable - amount) * 100) / 100,
      };
    });

    res.status(201).json({
      message: 'Refund record created and audited successfully',
      ...refundRecord,
    });
  } catch (error: any) {
    if (error.message.includes('exceeds remaining') || error.message.includes('Target order not found')) {
      res.status(400).json({ error: error.message, code: 'REFUND_VALIDATION_ERROR' });
      return;
    }
    next(error);
  }
}

export async function listRefunds(_req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await query(
      `SELECT 
        r.id,
        r.order_id,
        o.token_number,
        r.amount,
        r.reason,
        r.status,
        r.refund_type,
        u.name AS manager_name,
        r.payment_reference,
        r.notes,
        r.created_at
      FROM refunds r
      JOIN orders o ON r.order_id = o.id
      JOIN users u ON r.manager_id = u.id
      ORDER BY r.created_at DESC`
    );

    res.status(200).json({ refunds: result.rows });
  } catch (error) {
    next(error);
  }
}
