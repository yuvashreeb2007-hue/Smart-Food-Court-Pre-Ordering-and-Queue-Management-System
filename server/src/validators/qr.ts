import { z } from 'zod';

export const verifyQrSchema = z.object({
  qrToken: z.string().uuid('Valid QR token UUID is required'),
});

export type VerifyQrInput = z.infer<typeof verifyQrSchema>;
