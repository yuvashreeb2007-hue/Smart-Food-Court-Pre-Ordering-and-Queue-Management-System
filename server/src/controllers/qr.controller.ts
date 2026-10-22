import { Request, Response, NextFunction } from 'express';
import { withTransaction } from '../db/pool.js';
import { VerifyQrInput } from '../validators/qr.js';

export async function verifyOrderQr(req: Request<{}, {}, VerifyQrInput>, res: Response, next: NextFunction): Promise<void> {
  const { qrToken } = req.body;
  const staffUserId = req.session?.user?.id;

  try {
    const verificationResult = await withTransaction(async (client) => {
      // Fetch order by opaque QR token with row lock
      const orderRes = await client.query<{
        id: string;
        token_number: number;
        status: string;
        payment_status: string;
        qr_used: boolean;
        customer_name: string | null;
        total_amount: string;
      }>(
        `SELECT id, token_number, status, payment_status, qr_used, customer_name, total_amount
         FROM orders 
         WHERE qr_token = $1 
         FOR UPDATE`,
        [qrToken]
      );

      if (orderRes.rowCount === 0) {
        throw { status: 404, message: 'Invalid QR code. Order not found.', code: 'INVALID_QR_TOKEN' };
      }

      const order = orderRes.rows[0];

      // Single-use verification guard
      if (order.qr_used) {
        throw {
          status: 409,
          message: `Order Token #${order.token_number} has already been collected and redeemed. Single-use token is consumed.`,
          code: 'QR_ALREADY_USED',
        };
      }

      // Payment verification guard
      if (order.payment_status !== 'paid') {
        throw {
          status: 400,
          message: `Order Token #${order.token_number} cannot be collected because payment is ${order.payment_status}.`,
          code: 'ORDER_NOT_PAID',
        };
      }

      // Readiness status check
      if (order.status !== 'ready') {
        throw {
          status: 400,
          message: `Order Token #${order.token_number} is currently "${order.status}". It must be "ready" before counter pickup.`,
          code: 'ORDER_NOT_READY',
        };
      }

      // Mark atomically as collected
      await client.query(
        `UPDATE orders 
         SET qr_used = true, 
             status = 'completed', 
             updated_at = NOW() 
         WHERE id = $1`,
        [order.id]
      );

      await client.query(
        `INSERT INTO order_status_history (order_id, from_status, to_status, changed_by, notes)
         VALUES ($1, 'ready', 'completed', $2, 'Collected at counter via QR code scan verification')`,
        [order.id, staffUserId]
      );

      return {
        verified: true,
        orderId: order.id,
        tokenNumber: order.token_number,
        customerName: order.customer_name,
        totalAmount: parseFloat(order.total_amount),
        previousStatus: 'ready',
        newStatus: 'completed',
        message: `Token #${order.token_number} verified and marked as collected.`,
      };
    });

    res.status(200).json(verificationResult);
  } catch (error: any) {
    if (error.status) {
      res.status(error.status).json({ error: error.message, code: error.code });
      return;
    }
    next(error);
  }
}
