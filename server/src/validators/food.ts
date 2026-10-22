import { z } from 'zod';

export const createFoodSchema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters').max(150),
  categoryId: z.coerce.number().int().positive('Category ID must be a positive integer'),
  description: z.string().trim().max(1000).optional().default(''),
  price: z.coerce.number().positive('Price must be greater than zero'),
  isAvailable: z.boolean().optional().default(true),
  stockQty: z.coerce.number().int().min(0, 'Stock cannot be negative').optional().default(50),
  preparationTimeMinutes: z.coerce.number().int().min(0).optional().default(10),
  isVegetarian: z.boolean().optional().default(true),
});

export const updateFoodSchema = createFoodSchema.partial();

export const toggleAvailabilitySchema = z.object({
  isAvailable: z.boolean({ required_error: 'isAvailable boolean is required' }),
});

export const createCategorySchema = z.object({
  name: z.string().trim().min(2).max(100),
  displayOrder: z.coerce.number().int().optional().default(0),
});

export type CreateFoodInput = z.infer<typeof createFoodSchema>;
export type UpdateFoodInput = z.infer<typeof updateFoodSchema>;
export type ToggleAvailabilityInput = z.infer<typeof toggleAvailabilitySchema>;
export type CreateCategoryInput = z.infer<typeof createCategorySchema>;
