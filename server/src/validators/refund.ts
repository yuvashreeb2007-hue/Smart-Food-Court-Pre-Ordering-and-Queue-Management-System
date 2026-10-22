import { z } from 'zod';

export const createRefundSchema = z.object({
  orderId: z.string().uuid('Valid order UUID is required'),
  amount: z.coerce.number().positive('Refund amount must be greater than zero'),
  reason: z.string().trim().min(3, 'Reason must be at least 3 characters').max(500),
  refundType: z.enum(['in_person_cash', 'electronic'], {
    required_error: 'refundType must be in_person_cash or electronic',
  }),
  paymentReference: z.string().trim().max(255).optional(),
  notes: z.string().trim().max(1000).optional(),
});

export type CreateRefundInput = z.infer<typeof createRefundSchema>;
