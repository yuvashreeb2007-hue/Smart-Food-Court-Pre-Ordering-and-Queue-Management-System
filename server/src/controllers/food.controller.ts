import { Request, Response, NextFunction } from 'express';
import { query } from '../db/pool.js';
import { CreateFoodInput, UpdateFoodInput, ToggleAvailabilityInput } from '../validators/food.js';

export async function listFood(req: Request, res: Response, next: NextFunction): Promise<void> {
  const { category_id, search, available_only } = req.query;

  try {
    let sql = `
      SELECT 
        f.id,
        f.category_id,
        c.name AS category_name,
        f.name,
        f.description,
        f.price,
        f.image_path,
        f.is_available,
        f.preparation_time_minutes,
        f.is_vegetarian,
        f.created_at
      FROM food_items f
      JOIN categories c ON f.category_id = c.id
      WHERE f.deleted_at IS NULL
    `;
    const params: any[] = [];

    if (category_id) {
      params.push(Number(category_id));
      sql += ` AND f.category_id = $${params.length}`;
    }

    if (available_only === 'true') {
      sql += ' AND f.is_available = true';
    }

    if (search && typeof search === 'string' && search.trim() !== '') {
      params.push(`%${search.trim().toLowerCase()}%`);
      sql += ` AND (LOWER(f.name) LIKE $${params.length} OR LOWER(COALESCE(f.description, '')) LIKE $${params.length} OR LOWER(c.name) LIKE $${params.length})`;
    }

    sql += ' ORDER BY c.display_order ASC, f.name ASC';

    const result = await query(sql, params);

    // CRITICAL: Notice stock_qty is completely omitted to protect inventory privacy
    res.status(200).json({ foodItems: result.rows });
  } catch (error) {
    next(error);
  }
}

export async function getFoodById(req: Request, res: Response, next: NextFunction): Promise<void> {
  const id = Number(req.params.id);
  if (isNaN(id)) {
    res.status(400).json({ error: 'Invalid food item ID', code: 'INVALID_ID' });
    return;
  }

  try {
    const result = await query(
      `SELECT 
        f.id,
        f.category_id,
        c.name AS category_name,
        f.name,
        f.description,
        f.price,
        f.image_path,
        f.is_available,
        f.preparation_time_minutes,
        f.is_vegetarian,
        f.created_at
      FROM food_items f
      JOIN categories c ON f.category_id = c.id
      WHERE f.id = $1 AND f.deleted_at IS NULL`,
      [id]
    );

    if (result.rowCount === 0) {
      res.status(404).json({ error: 'Food item not found', code: 'NOT_FOUND' });
      return;
    }

    res.status(200).json({ foodItem: result.rows[0] });
  } catch (error) {
    next(error);
  }
}

export async function createFood(req: Request<{}, {}, CreateFoodInput>, res: Response, next: NextFunction): Promise<void> {
  const {
    name,
    categoryId,
    description,
    price,
    isAvailable,
    stockQty,
    preparationTimeMinutes,
    isVegetarian,
  } = req.body;

  try {
    const catCheck = await query('SELECT id FROM categories WHERE id = $1', [categoryId]);
    if (catCheck.rowCount === 0) {
      res.status(400).json({ error: 'Category does not exist', code: 'CATEGORY_NOT_FOUND' });
      return;
    }

    // Default image if none provided yet
    const imagePath = (req as any).savedImagePath || '/uploads/default-food.jpg';

    const result = await query(
      `INSERT INTO food_items (
        category_id, name, description, price, image_path,
        is_available, stock_qty, preparation_time_minutes, is_vegetarian
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING 
        id, category_id, name, description, price, image_path,
        is_available, preparation_time_minutes, is_vegetarian, created_at`,
      [
        categoryId,
        name.trim(),
        description?.trim() || '',
        price,
        imagePath,
        isAvailable ?? true,
        stockQty ?? 50, // Stored internally in backend
        preparationTimeMinutes ?? 10,
        isVegetarian ?? true,
      ]
    );

    res.status(201).json({
      message: 'Food item created successfully',
      foodItem: result.rows[0],
    });
  } catch (error) {
    next(error);
  }
}

export async function updateFood(req: Request<{ id: string }, {}, UpdateFoodInput>, res: Response, next: NextFunction): Promise<void> {
  const id = Number(req.params.id);
  if (isNaN(id)) {
    res.status(400).json({ error: 'Invalid food item ID', code: 'INVALID_ID' });
    return;
  }

  const {
    name,
    categoryId,
    description,
    price,
    isAvailable,
    stockQty,
    preparationTimeMinutes,
    isVegetarian,
  } = req.body;

  try {
    const existing = await query('SELECT id FROM food_items WHERE id = $1 AND deleted_at IS NULL', [id]);
    if (existing.rowCount === 0) {
      res.status(404).json({ error: 'Food item not found', code: 'NOT_FOUND' });
      return;
    }

    const updates: string[] = [];
    const params: any[] = [id];

    if (name !== undefined) {
      params.push(name.trim());
      updates.push(`name = $${params.length}`);
    }
    if (categoryId !== undefined) {
      params.push(categoryId);
      updates.push(`category_id = $${params.length}`);
    }
    if (description !== undefined) {
      params.push(description.trim());
      updates.push(`description = $${params.length}`);
    }
    if (price !== undefined) {
      params.push(price);
      updates.push(`price = $${params.length}`);
    }
    if (isAvailable !== undefined) {
      params.push(isAvailable);
      updates.push(`is_available = $${params.length}`);
    }
    if (stockQty !== undefined) {
      params.push(stockQty);
      updates.push(`stock_qty = $${params.length}`);
    }
    if (preparationTimeMinutes !== undefined) {
      params.push(preparationTimeMinutes);
      updates.push(`preparation_time_minutes = $${params.length}`);
    }
    if (isVegetarian !== undefined) {
      params.push(isVegetarian);
      updates.push(`is_vegetarian = $${params.length}`);
    }

    if ((req as any).savedImagePath) {
      params.push((req as any).savedImagePath);
      updates.push(`image_path = $${params.length}`);
    }

    updates.push('updated_at = NOW()');

    const result = await query(
      `UPDATE food_items 
       SET ${updates.join(', ')} 
       WHERE id = $1 
       RETURNING 
         id, category_id, name, description, price, image_path,
         is_available, preparation_time_minutes, is_vegetarian, updated_at`,
      params
    );

    res.status(200).json({
      message: 'Food item updated successfully',
      foodItem: result.rows[0],
    });
  } catch (error) {
    next(error);
  }
}

export async function toggleAvailability(req: Request<{ id: string }, {}, ToggleAvailabilityInput>, res: Response, next: NextFunction): Promise<void> {
  const id = Number(req.params.id);
  if (isNaN(id)) {
    res.status(400).json({ error: 'Invalid food item ID', code: 'INVALID_ID' });
    return;
  }

  const { isAvailable } = req.body;

  try {
    const result = await query(
      `UPDATE food_items 
       SET is_available = $1, updated_at = NOW() 
       WHERE id = $2 AND deleted_at IS NULL 
       RETURNING id, name, is_available, updated_at`,
      [isAvailable, id]
    );

    if (result.rowCount === 0) {
      res.status(404).json({ error: 'Food item not found', code: 'NOT_FOUND' });
      return;
    }

    res.status(200).json({
      message: `Food item marked as ${isAvailable ? 'Available' : 'Unavailable'}`,
      foodItem: result.rows[0],
    });
  } catch (error) {
    next(error);
  }
}

export async function deleteFood(req: Request<{ id: string }>, res: Response, next: NextFunction): Promise<void> {
  const id = Number(req.params.id);
  if (isNaN(id)) {
    res.status(400).json({ error: 'Invalid food item ID', code: 'INVALID_ID' });
    return;
  }

  try {
    const result = await query(
      'UPDATE food_items SET deleted_at = NOW() WHERE id = $1 AND deleted_at IS NULL RETURNING id, name',
      [id]
    );

    if (result.rowCount === 0) {
      res.status(404).json({ error: 'Food item not found', code: 'NOT_FOUND' });
      return;
    }

    res.status(200).json({
      message: 'Food item removed from active menu',
      id,
    });
  } catch (error) {
    next(error);
  }
}

export async function uploadFoodImage(req: Request, res: Response): Promise<void> {
  const savedImagePath = (req as any).savedImagePath;
  if (!savedImagePath) {
    res.status(400).json({ error: 'No image file was saved', code: 'UPLOAD_FAILED' });
    return;
  }

  res.status(200).json({
    message: 'Food image uploaded successfully from device',
    imagePath: savedImagePath,
  });
}
