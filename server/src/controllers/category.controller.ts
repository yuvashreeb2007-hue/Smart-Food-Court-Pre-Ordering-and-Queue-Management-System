import { Request, Response, NextFunction } from 'express';
import { query } from '../db/pool.js';
import { CreateCategoryInput } from '../validators/food.js';

export async function listCategories(_req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await query(
      'SELECT id, name, display_order, is_active FROM categories WHERE is_active = true ORDER BY display_order ASC, name ASC'
    );
    res.status(200).json({ categories: result.rows });
  } catch (error) {
    next(error);
  }
}

export async function createCategory(req: Request<{}, {}, CreateCategoryInput>, res: Response, next: NextFunction): Promise<void> {
  const { name, displayOrder } = req.body;
  try {
    const existing = await query('SELECT id FROM categories WHERE lower(name) = lower($1)', [name.trim()]);
    if (existing.rowCount && existing.rowCount > 0) {
      res.status(409).json({ error: 'A category with this name already exists', code: 'CATEGORY_EXISTS' });
      return;
    }

    const result = await query(
      'INSERT INTO categories (name, display_order, is_active) VALUES ($1, $2, true) RETURNING *',
      [name.trim(), displayOrder || 0]
    );

    res.status(201).json({ category: result.rows[0] });
  } catch (error) {
    next(error);
  }
}
