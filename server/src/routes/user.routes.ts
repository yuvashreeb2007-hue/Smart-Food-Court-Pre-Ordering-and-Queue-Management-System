import { Router } from 'express';
import { getUserProfile, listStaffUsers } from '../controllers/user.controller.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

const router = Router();

router.get('/profile', requireAuth, getUserProfile);
router.get('/staff', requireAuth, requireRole('manager'), listStaffUsers);

export default router;
