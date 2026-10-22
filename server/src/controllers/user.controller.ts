import { Request, Response, NextFunction } from 'express';
import { query } from '../db/pool.js';

export async function getUserProfile(req: Request, res: Response, next: NextFunction): Promise<void> {
  const userId = req.session.user?.id;
  try {
    const result = await query(
      'SELECT id, name, email, role, phone, created_at FROM users WHERE id = $1',
      [userId]
    );

    if (result.rowCount === 0) {
      res.status(404).json({ error: 'User not found', code: 'USER_NOT_FOUND' });
      return;
    }

    res.status(200).json({ user: result.rows[0] });
  } catch (error) {
    next(error);
  }
}

export async function listStaffUsers(_req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await query(
      `SELECT id, name, email, role, phone, created_at 
       FROM users 
       WHERE role IN ('cashier', 'manager') 
       ORDER BY role ASC, name ASC`
    );

    res.status(200).json({ staff: result.rows });
  } catch (error) {
    next(error);
  }
}
