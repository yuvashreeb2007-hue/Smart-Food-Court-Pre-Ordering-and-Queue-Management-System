import { Router } from 'express';
import { createRefund, listRefunds } from '../controllers/refund.controller.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { validateBody } from '../middleware/validate.js';
import { createRefundSchema } from '../validators/refund.js';

const router = Router();

// Manager only
router.post('/', requireAuth, requireRole('manager'), validateBody(createRefundSchema), createRefund);
router.get('/', requireAuth, requireRole('manager'), listRefunds);

export default router;
