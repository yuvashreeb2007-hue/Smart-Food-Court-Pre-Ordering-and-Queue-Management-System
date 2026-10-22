import { pool, withTransaction, closePool } from './pool.js';
import { env } from '../config/env.js';
import { hashPassword } from '../utils/password.js';
import { logger } from '../utils/logger.js';

interface SeedResult {
  cashierCreated: boolean;
  managerCreated: boolean;
  categoriesSeeded: number;
  foodItemsSeeded: number;
}

export async function seedDatabase(): Promise<SeedResult> {
  logger.info('Starting idempotent database seeder...');

  const result: SeedResult = {
    cashierCreated: false,
    managerCreated: false,
    categoriesSeeded: 0,
    foodItemsSeeded: 0,
  };

  await withTransaction(async (client) => {
    // 1. Seed Cashier staff account
    const existingCashier = await client.query(
      'SELECT id, email, role FROM users WHERE email = $1',
      [env.SEED_CASHIER_EMAIL.toLowerCase().trim()]
    );

    if (existingCashier.rowCount === 0) {
      const cashierHash = await hashPassword(env.SEED_CASHIER_PASSWORD);
      await client.query(
        `INSERT INTO users (name, email, password_hash, role, phone)
         VALUES ($1, $2, $3, $4, $5)`,
        [
          'Main Counter Cashier',
          env.SEED_CASHIER_EMAIL.toLowerCase().trim(),
          cashierHash,
          'cashier',
          '+91 98000 11223',
        ]
      );
      result.cashierCreated = true;
      logger.info('Created initial Cashier staff account', { email: env.SEED_CASHIER_EMAIL });
    } else {
      logger.info('Cashier account already exists; skipping to avoid overwriting credentials', {
        email: env.SEED_CASHIER_EMAIL,
      });
    }

    // 2. Seed Food Court Manager staff account
    const existingManager = await client.query(
      'SELECT id, email, role FROM users WHERE email = $1',
      [env.SEED_MANAGER_EMAIL.toLowerCase().trim()]
    );

    if (existingManager.rowCount === 0) {
      const managerHash = await hashPassword(env.SEED_MANAGER_PASSWORD);
      await client.query(
        `INSERT INTO users (name, email, password_hash, role, phone)
         VALUES ($1, $2, $3, $4, $5)`,
        [
          'Campus Food Court Manager',
          env.SEED_MANAGER_EMAIL.toLowerCase().trim(),
          managerHash,
          'manager',
          '+91 98000 99887',
        ]
      );
      result.managerCreated = true;
      logger.info('Created initial Food Court Manager staff account', { email: env.SEED_MANAGER_EMAIL });
    } else {
      logger.info('Manager account already exists; skipping to avoid overwriting credentials', {
        email: env.SEED_MANAGER_EMAIL,
      });
    }

    // 2b. Seed sample Customer account for convenient testing
    const sampleCustomerEmail = 'student@college.edu';
    const existingCustomer = await client.query(
      'SELECT id, email, role FROM users WHERE email = $1',
      [sampleCustomerEmail]
    );

    if (existingCustomer.rowCount === 0) {
      const customerHash = await hashPassword('StudentSecurePass2026!');
      await client.query(
        `INSERT INTO users (name, email, password_hash, role, phone)
         VALUES ($1, $2, $3, 'customer', $4)`,
        [
          'Aditya Sharma (Student)',
          sampleCustomerEmail,
          customerHash,
          '+91 98765 43210',
        ]
      );
      logger.info('Created sample Student Customer account for testing', { email: sampleCustomerEmail });
    }

    // 3. Seed initial categories if empty
    const catCount = await client.query('SELECT count(*) AS count FROM categories');
    if (parseInt(catCount.rows[0].count, 10) === 0) {
      const initialCategories = [
        { name: 'South Indian', displayOrder: 1 },
        { name: 'North Indian & Meals', displayOrder: 2 },
        { name: 'Snacks & Chaat', displayOrder: 3 },
        { name: 'Beverages & Shakes', displayOrder: 4 },
        { name: 'Desserts', displayOrder: 5 },
      ];

      for (const cat of initialCategories) {
        await client.query(
          'INSERT INTO categories (name, display_order, is_active) VALUES ($1, $2, true)',
          [cat.name, cat.displayOrder]
        );
      }
      result.categoriesSeeded = initialCategories.length;
      logger.info(`Seeded ${initialCategories.length} default food categories`);
    }

    // 4. Seed initial food items if empty
    const foodCount = await client.query('SELECT count(*) AS count FROM food_items WHERE deleted_at IS NULL');
    if (parseInt(foodCount.rows[0].count, 10) === 0) {
      const catRows = await client.query<{ id: number; name: string }>('SELECT id, name FROM categories');
      const catMap = new Map<string, number>(catRows.rows.map(r => [r.name, r.id]));

      const initialFoods = [
        {
          catName: 'South Indian',
          name: 'Crispy Butter Masala Dosa',
          description: 'Golden fermented crepe roasted in fresh butter, stuffed with spiced potato masala, served with coconut chutney & sambar.',
          price: 95.00,
          image: '/uploads/masala-dosa.jpg',
          available: true,
          stock: 45,
          prep: 12,
          veg: true,
        },
        {
          catName: 'South Indian',
          name: 'Steamed Idli & Medu Vada Combo',
          description: 'Two pillow-soft steamed rice cakes paired with a crisp golden lentil donut, served with piping hot drumstick sambar.',
          price: 75.00,
          image: '/uploads/idli-vada.jpg',
          available: true,
          stock: 30,
          prep: 8,
          veg: true,
        },
        {
          catName: 'North Indian & Meals',
          name: 'Amritsari Chole Bhature',
          description: 'Two fluffy balloon bhaturas paired with slow-cooked dark chickpea curry, pickled onions and fried green chili.',
          price: 130.00,
          image: '/uploads/chole-bhature.jpg',
          available: true,
          stock: 25,
          prep: 15,
          veg: true,
        },
        {
          catName: 'North Indian & Meals',
          name: 'Paneer Makhani Rice Bowl',
          description: 'Char-grilled cottage cheese cubes simmered in a velvety tomato-cashew butter gravy over fragrant jeera basmati rice.',
          price: 165.00,
          image: '/uploads/paneer-rice.jpg',
          available: true,
          stock: 20,
          prep: 14,
          veg: true,
        },
        {
          catName: 'North Indian & Meals',
          name: 'Hyderabadi Veg Dum Biryani',
          description: 'Long-grain basmati layered with marinated garden vegetables, saffron and fried onions, slow-cooked on dum.',
          price: 150.00,
          image: '/uploads/veg-biryani.jpg',
          available: false, // Intentionally unavailable for testing
          stock: 0,
          prep: 18,
          veg: true,
        },
        {
          catName: 'Snacks & Chaat',
          name: 'Dahi Papdi Chaat',
          description: 'Crisp flour crackers topped with seasoned boiled potatoes, sweetened yogurt, tamarind chutney and fresh coriander.',
          price: 80.00,
          image: '/uploads/dahi-papdi.jpg',
          available: true,
          stock: 40,
          prep: 6,
          veg: true,
        },
        {
          catName: 'Snacks & Chaat',
          name: 'Mumbai Pav Bhaji (Extra Butter)',
          description: 'Spicy mashed mixed vegetable bhaji topped with a generous dollop of butter, served with two toasted soft pav buns.',
          price: 110.00,
          image: '/uploads/pav-bhaji.jpg',
          available: true,
          stock: 35,
          prep: 10,
          veg: true,
        },
        {
          catName: 'Beverages & Shakes',
          name: 'Traditional South Filter Coffee',
          description: 'Strong chicory decoction frothed with boiling whole milk, served piping hot in a brass dabarah and tumbler.',
          price: 40.00,
          image: '/uploads/filter-coffee.jpg',
          available: true,
          stock: 100,
          prep: 4,
          veg: true,
        },
        {
          catName: 'Beverages & Shakes',
          name: 'Fresh Mango Lassi',
          description: 'Thick creamy churned yogurt blended with sweet Alphonso mango pulp, garnished with crushed green cardamom & pistachios.',
          price: 70.00,
          image: '/uploads/mango-lassi.jpg',
          available: true,
          stock: 50,
          prep: 5,
          veg: true,
        },
        {
          catName: 'Desserts',
          name: 'Hot Gulab Jamun with Vanilla Ice Cream',
          description: 'Two melt-in-the-mouth milk-solid dumplings soaked in rose-cardamom sugar syrup, served with a scoop of vanilla ice cream.',
          price: 85.00,
          image: '/uploads/gulab-jamun.jpg',
          available: true,
          stock: 25,
          prep: 5,
          veg: true,
        },
      ];

      for (const item of initialFoods) {
        const catId = catMap.get(item.catName);
        if (!catId) continue;

        await client.query(
          `INSERT INTO food_items (
            category_id, name, description, price, image_path, is_available,
            stock_qty, preparation_time_minutes, is_vegetarian
           ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
          [
            catId,
            item.name,
            item.description,
            item.price,
            item.image,
            item.available,
            item.stock, // internal stock
            item.prep,
            item.veg,
          ]
        );
      }
      result.foodItemsSeeded = initialFoods.length;
      logger.info(`Seeded ${initialFoods.length} initial food items with internal stock tracking`);
    }
  });

  logger.info('Database seeding completed successfully', result);
  return result;
}

// Allow direct CLI execution: tsx src/db/seed.ts
if (process.argv[1] && import.meta.url.endsWith(process.argv[1].replace(/.*\//, ''))) {
  seedDatabase()
    .then(async () => {
      await closePool();
      process.exit(0);
    })
    .catch(async (err) => {
      logger.error('Database seeding failed', { error: err.message });
      await closePool();
      process.exit(1);
    });
}
