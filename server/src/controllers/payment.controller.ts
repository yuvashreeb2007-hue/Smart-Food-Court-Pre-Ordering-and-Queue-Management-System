import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { query, withTransaction } from '../db/pool.js';
import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';

export async function getPaymentStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
  const { orderId } = req.params;

  try {
    const result = await query<{
      order_id: string;
      user_id: string | null;
      payment_status: string;
      total_amount: string;
      payment_method: string;
      provider: string | null;
      provider_reference: string | null;
      record_status: string | null;
    }>(
      `SELECT o.id AS order_id, o.user_id, o.payment_status, o.total_amount, o.payment_method,
              pr.provider, pr.provider_reference, pr.status AS record_status
       FROM orders o
       LEFT JOIN payment_records pr ON o.id = pr.order_id
       WHERE o.id = $1`,
      [orderId]
    );

    if (result.rowCount === 0) {
      res.status(404).json({ error: 'Order not found', code: 'ORDER_NOT_FOUND' });
      return;
    }

    const row = result.rows[0];
    const user = req.session?.user;

    // Customer privacy check: customers can only view payment status of their own orders
    if (user?.role === 'customer' && (!row.user_id || row.user_id !== user.id)) {
      res.status(403).json({ error: 'Access denied to this payment status', code: 'FORBIDDEN' });
      return;
    }

    res.status(200).json({
      orderId,
      paymentMethod: row.payment_method,
      paymentStatus: (row as any).payment_status,
      totalAmount: (row as any).total_amount,
      provider: env.PAYMENT_PROVIDER,
      integrationStatus: env.PAYMENT_PROVIDER === 'pending' ? 'PENDING_GATEWAY_CREDENTIALS' : 'CONFIGURED',
      notice: 'Real UPI gateway integration pending (Phase 5). Unpaid orders remain in pending state.',
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Webhook handler for genuine payment provider notifications.
 * Verifies webhook signatures and applies state changes idempotently.
 */
export async function handlePaymentWebhook(req: Request, res: Response, next: NextFunction): Promise<void> {
  const signature = req.headers['x-provider-signature'] as string | undefined;

  // If payment provider credentials are not yet configured:
  if (!env.PAYMENT_KEY_SECRET || env.PAYMENT_PROVIDER === 'pending') {
    res.status(200).json({
      status: 'ignored',
      message: 'Payment provider integration is pending. Webhook received but credentials not configured.',
    });
    return;
  }

  // Webhook signature verification
  try {
    const rawBody = JSON.stringify(req.body);
    const expectedSignature = crypto
      .createHmac('sha256', env.PAYMENT_WEBHOOK_SECRET)
      .update(rawBody)
      .digest('hex');

    if (!signature || signature !== expectedSignature) {
      res.status(401).json({ error: 'Invalid webhook signature', code: 'INVALID_SIGNATURE' });
      return;
    }

    const { event, orderId, providerReference, amount } = req.body;

    if (event === 'payment.captured' || event === 'payment.success') {
      await withTransaction(async (client) => {
        // Idempotent payment recording
        const existing = await client.query(
          'SELECT id FROM payment_records WHERE provider_reference = $1 AND status = $2',
          [providerReference, 'success']
        );

        if (existing.rowCount && existing.rowCount > 0) {
          logger.info('Duplicate payment webhook ignored', { providerReference });
          return;
        }

        await client.query(
          `INSERT INTO payment_records (order_id, provider, provider_reference, amount, status, raw_payload)
           VALUES ($1, $2, $3, $4, 'success', $5)`,
          [orderId, env.PAYMENT_PROVIDER, providerReference, amount, req.body]
        );

        await client.query(
          `UPDATE orders 
           SET payment_status = 'paid', updated_at = NOW() 
           WHERE id = $1`,
          [orderId]
        );
      });
    }

    res.status(200).json({ received: true });
  } catch (error) {
    next(error);
  }
}
