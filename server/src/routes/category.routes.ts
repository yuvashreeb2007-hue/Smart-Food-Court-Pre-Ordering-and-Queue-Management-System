import { Router } from 'express';
import { listCategories, createCategory } from '../controllers/category.controller.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { validateBody } from '../middleware/validate.js';
import { createCategorySchema } from '../validators/food.js';

const router = Router();

router.get('/', listCategories);
router.post('/', requireAuth, requireRole('manager'), validateBody(createCategorySchema), createCategory);

export default router;
