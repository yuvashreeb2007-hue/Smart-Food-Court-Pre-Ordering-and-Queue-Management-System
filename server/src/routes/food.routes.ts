import { Router } from 'express';
import {
  listFood,
  getFoodById,
  createFood,
  updateFood,
  toggleAvailability,
  deleteFood,
  uploadFoodImage,
} from '../controllers/food.controller.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { validateBody } from '../middleware/validate.js';
import { createFoodSchema, updateFoodSchema, toggleAvailabilitySchema } from '../validators/food.js';
import { upload, processUploadedImage } from '../middleware/upload.js';

const router = Router();

// Public routes
router.get('/', listFood);
router.get('/:id', getFoodById);

// Staff routes
router.post(
  '/',
  requireAuth,
  requireRole('manager'),
  validateBody(createFoodSchema),
  createFood
);

router.put(
  '/:id',
  requireAuth,
  requireRole('manager'),
  validateBody(updateFoodSchema),
  updateFood
);

router.patch(
  '/:id/availability',
  requireAuth,
  requireRole('cashier', 'manager'),
  validateBody(toggleAvailabilitySchema),
  toggleAvailability
);

router.delete(
  '/:id',
  requireAuth,
  requireRole('manager'),
  deleteFood
);

router.post(
  '/upload-image',
  requireAuth,
  requireRole('cashier', 'manager'),
  upload.single('image'),
  processUploadedImage,
  uploadFoodImage
);

export default router;
