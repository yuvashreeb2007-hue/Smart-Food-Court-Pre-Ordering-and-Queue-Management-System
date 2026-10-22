import { Router } from 'express';
import { getPaymentStatus, handlePaymentWebhook } from '../controllers/payment.controller.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

router.get('/:orderId/status', requireAuth, getPaymentStatus);
router.post('/webhook', handlePaymentWebhook);

export default router;
