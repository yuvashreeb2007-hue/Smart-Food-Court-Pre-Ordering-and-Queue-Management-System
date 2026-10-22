import { Router } from 'express';
import {
  createOnlineOrder,
  createCounterOrder,
  listOrders,
  getOrderById,
  updateOrderStatus,
  getOrderBill,
} from '../controllers/order.controller.js';
import { requireAuth, requireRole, optionalAuth } from '../middleware/auth.js';
import { validateBody } from '../middleware/validate.js';
import {
  createOnlineOrderSchema,
  createCounterOrderSchema,
  updateOrderStatusSchema,
} from '../validators/order.js';

const router = Router();

// Create online order (authenticated customer required)
router.post('/online', requireAuth, validateBody(createOnlineOrderSchema), createOnlineOrder);

// Create counter/offline order (Cashier / Manager only)
router.post(
  '/counter',
  requireAuth,
  requireRole('cashier', 'manager'),
  validateBody(createCounterOrderSchema),
  createCounterOrder
);

// List orders (authenticated, scoped by role inside controller)
router.get('/', requireAuth, listOrders);

// Get single order details (authenticated, ownership enforced inside controller)
router.get('/:id', requireAuth, getOrderById);

// Update status (Cashier / Manager only)
router.patch(
  '/:id/status',
  requireAuth,
  requireRole('cashier', 'manager'),
  validateBody(updateOrderStatusSchema),
  updateOrderStatus
);

// Get order printable bill (authenticated, ownership enforced inside controller)
router.get('/:id/bill', requireAuth, getOrderBill);

export default router;
