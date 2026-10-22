import { Router } from 'express';
import { verifyOrderQr } from '../controllers/qr.controller.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { validateBody } from '../middleware/validate.js';
import { verifyQrSchema } from '../validators/qr.js';

const router = Router();

// Cashier and Manager only
router.post('/verify', requireAuth, requireRole('cashier', 'manager'), validateBody(verifyQrSchema), verifyOrderQr);

export default router;
