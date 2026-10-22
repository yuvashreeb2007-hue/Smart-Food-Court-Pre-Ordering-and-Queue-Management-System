import { Router } from 'express';
import healthRoutes from './health.routes.js';
import authRoutes from './auth.routes.js';
import userRoutes from './user.routes.js';
import categoryRoutes from './category.routes.js';
import foodRoutes from './food.routes.js';
import orderRoutes from './order.routes.js';
import paymentRoutes from './payment.routes.js';
import refundRoutes from './refund.routes.js';
import qrRoutes from './qr.routes.js';

const router = Router();

router.use('/health', healthRoutes);
router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/categories', categoryRoutes);
router.use('/food', foodRoutes);
router.use('/orders', orderRoutes);
router.use('/payments', paymentRoutes);
router.use('/refunds', refundRoutes);
router.use('/qr', qrRoutes);

export default router;
