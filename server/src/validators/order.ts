import { z } from 'zod';

export const orderItemInputSchema = z.object({
  foodItemId: z.coerce.number().int().positive('Valid foodItemId is required'),
  quantity: z.coerce.number().int().min(1, 'Quantity must be at least 1').max(50, 'Max 50 items per line'),
});

export const createOnlineOrderSchema = z.object({
  items: z.array(orderItemInputSchema).min(1, 'Order must contain at least 1 item'),
  customerName: z.string().trim().max(100).optional(),
  customerPhone: z.string().trim().max(20).optional(),
});

export const createCounterOrderSchema = z.object({
  items: z.array(orderItemInputSchema).min(1, 'Order must contain at least 1 item'),
  paymentMethod: z.enum(['cash', 'card', 'upi'], {
    required_error: 'Valid counter paymentMethod (cash, card, upi) is required',
  }),
  customerName: z.string().trim().max(100).optional().default('Counter Walk-in'),
  customerPhone: z.string().trim().max(20).optional(),
});

export const updateOrderStatusSchema = z.object({
  status: z.enum(['ordered', 'preparing', 'ready', 'completed'], {
    required_error: 'Status must be one of: ordered, preparing, ready, completed',
  }),
  notes: z.string().trim().max(500).optional(),
});

export type CreateOnlineOrderInput = z.infer<typeof createOnlineOrderSchema>;
export type CreateCounterOrderInput = z.infer<typeof createCounterOrderSchema>;
export type UpdateOrderStatusInput = z.infer<typeof updateOrderStatusSchema>;
