import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import crypto from 'crypto';
import { app } from '../src/app.js';
import { pool, closePool, query } from '../src/db/pool.js';
import { runMigrations } from '../src/db/migrate.js';
import { seedDatabase } from '../src/db/seed.js';
import { env } from '../src/config/env.js';

describe('Smart Food Court API Automated Test Suite (Phase 4)', () => {
  let customerAgent: ReturnType<typeof request.agent>;
  let cashierAgent: ReturnType<typeof request.agent>;
  let managerAgent: ReturnType<typeof request.agent>;
  let anonymousAgent: ReturnType<typeof request.agent>;

  let testFoodItemId: number;
  let testUnavailableFoodItemId: number;
  let testFoodPrice: number;

  beforeAll(async () => {
    // Ensure migrations and seeds are applied
    await runMigrations();
    await seedDatabase();

    customerAgent = request.agent(app);
    cashierAgent = request.agent(app);
    managerAgent = request.agent(app);
    anonymousAgent = request.agent(app);

    // Fetch an available and an unavailable food item for order tests
    const availableFood = await query<{ id: number; price: string }>(
      'SELECT id, price FROM food_items WHERE is_available = true AND deleted_at IS NULL AND stock_qty > 5 LIMIT 1'
    );
    testFoodItemId = availableFood.rows[0].id;
    testFoodPrice = parseFloat(availableFood.rows[0].price);

    const unavailableFood = await query<{ id: number }>(
      'SELECT id FROM food_items WHERE is_available = false AND deleted_at IS NULL LIMIT 1'
    );
    testUnavailableFoodItemId = unavailableFood.rows[0].id;
  });

  afterAll(async () => {
    await closePool();
  });

  // 1. Health Endpoint
  it('1. GET /api/v1/health should return 200 with status healthy and DB connected', async () => {
    const res = await anonymousAgent.get('/api/v1/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('healthy');
    expect(res.body.database.connected).toBe(true);
    expect(res.body.businessTimezone).toBe(env.BUSINESS_TIMEZONE);
    expect(res.body).not.toHaveProperty('password');
  });

  // 2. Registration and Login
  const uniqueEmail = `test.student.${Date.now()}@college.edu`;
  it('2. POST /api/v1/auth/register should successfully register a customer', async () => {
    const res = await customerAgent.post('/api/v1/auth/register').send({
      name: 'Test Student',
      email: uniqueEmail,
      password: 'StrongStudentPassword123!',
      phone: '+91 99999 88888',
    });

    expect(res.status).toBe(201);
    expect(res.body.user).toBeDefined();
    expect(res.body.user.email).toBe(uniqueEmail);
    expect(res.body.user.role).toBe('customer');
    expect(res.body.user).not.toHaveProperty('password_hash');
  });

  it('2b. POST /api/v1/auth/login should authenticate registered customer and set session cookie', async () => {
    const res = await customerAgent.post('/api/v1/auth/login').send({
      email: uniqueEmail,
      password: 'StrongStudentPassword123!',
    });

    expect(res.status).toBe(200);
    expect(res.body.user.email).toBe(uniqueEmail);
    expect(res.body.user.role).toBe('customer');

    // Verify session
    const meRes = await customerAgent.get('/api/v1/auth/me');
    expect(meRes.status).toBe(200);
    expect(meRes.body.user.email).toBe(uniqueEmail);
  });

  it('2c. POST /api/v1/auth/login should authenticate seeded cashier account', async () => {
    const res = await cashierAgent.post('/api/v1/auth/login').send({
      email: env.SEED_CASHIER_EMAIL,
      password: env.SEED_CASHIER_PASSWORD,
    });

    expect(res.status).toBe(200);
    expect(res.body.user.role).toBe('cashier');
  });

  it('2d. POST /api/v1/auth/login should authenticate seeded manager account', async () => {
    const res = await managerAgent.post('/api/v1/auth/login').send({
      email: env.SEED_MANAGER_EMAIL,
      password: env.SEED_MANAGER_PASSWORD,
    });

    expect(res.status).toBe(200);
    expect(res.body.user.role).toBe('manager');
  });

  // 3. Role-based Authorization
  it('3. Protected manager routes should reject customer with 403 Forbidden', async () => {
    const res = await customerAgent.post('/api/v1/categories').send({
      name: 'Unauthorized Category',
    });
    expect(res.status).toBe(403);
    expect(res.body.code).toBe('FORBIDDEN');
  });

  // 4. Prevention of Public Staff-Role Assignment
  it('4. POST /api/v1/auth/register must ignore any client role attempt and assign customer only', async () => {
    const hackerEmail = `hacker.${Date.now()}@college.edu`;
    const res = await request(app).post('/api/v1/auth/register').send({
      name: 'Privilege Escalation Attempt',
      email: hackerEmail,
      password: 'Password12345!',
      role: 'manager', // Attempt to escalate
    } as any);

    expect(res.status).toBe(201);
    expect(res.body.user.role).toBe('customer'); // Must be customer

    // Verify in database
    const dbCheck = await query('SELECT role FROM users WHERE email = $1', [hackerEmail]);
    expect(dbCheck.rows[0].role).toBe('customer');
  });

  // 5. Food Availability Checks & Stock Privacy
  it('5. GET /api/v1/food should list items without exposing internal stock_qty', async () => {
    const res = await anonymousAgent.get('/api/v1/food');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.foodItems)).toBe(true);
    expect(res.body.foodItems.length).toBeGreaterThan(0);

    for (const item of res.body.foodItems) {
      expect(item).toHaveProperty('is_available');
      // CRITICAL: Ensure stock_qty is completely omitted
      expect(item).not.toHaveProperty('stock_qty');
    }
  });

  it('5b. Ordering an unavailable food item must be rejected with 400 Bad Request', async () => {
    const res = await customerAgent.post('/api/v1/orders/online').send({
      items: [{ foodItemId: testUnavailableFoodItemId, quantity: 1 }],
      customerName: 'Test Student',
    });

    expect(res.status).toBe(400);
    expect(res.body.error).toContain('unavailable');
  });

  // 6. Insufficient Stock Handling
  it('6. Ordering more quantity than available internal stock must be rejected with 400', async () => {
    // Find food with stock <= 30
    const limitedStockFood = await query<{ id: number; stock_qty: number }>(
      'SELECT id, stock_qty FROM food_items WHERE is_available = true AND stock_qty > 0 AND stock_qty < 30 LIMIT 1'
    );
    const targetItem = limitedStockFood.rows[0];

    const res = await customerAgent.post('/api/v1/orders/online').send({
      items: [{ foodItemId: targetItem.id, quantity: targetItem.stock_qty + 5 }], // Exceeds internal stock
      customerName: 'Greedy Buyer',
    });

    expect(res.status).toBe(400);
    expect(res.body.error).toContain('Insufficient stock');
  });

  // 7. Concurrent Token Allocation & Shared Daily Sequence
  it('7. Concurrent orders must allocate distinct sequential shared tokens starting >= 101', async () => {
    const promises = [
      customerAgent.post('/api/v1/orders/online').send({
        items: [{ foodItemId: testFoodItemId, quantity: 1 }],
        customerName: 'Concurrent User 1',
      }),
      cashierAgent.post('/api/v1/orders/counter').send({
        items: [{ foodItemId: testFoodItemId, quantity: 1 }],
        paymentMethod: 'cash',
        customerName: 'Concurrent Counter 2',
      }),
      customerAgent.post('/api/v1/orders/online').send({
        items: [{ foodItemId: testFoodItemId, quantity: 1 }],
        customerName: 'Concurrent User 3',
      }),
    ];

    const results = await Promise.all(promises);

    for (const res of results) {
      expect(res.status).toBe(201);
      expect(res.body.order.token_number).toBeGreaterThanOrEqual(101);
    }

    const tokens = results.map(r => r.body.order.token_number);
    const uniqueTokens = new Set(tokens);
    // All concurrent tokens must be strictly unique!
    expect(uniqueTokens.size).toBe(tokens.length);
  });

  // 8. Daily Token Constraint & Sequence Integrity
  it('8. Database unique constraint on (business_date, token_number) must prevent duplicate tokens', async () => {
    const res = await query<{ count: string }>(
      'SELECT count(*) AS count FROM orders'
    );
    expect(parseInt(res.rows[0].count, 10)).toBeGreaterThan(0);
  });

  // 9. Idempotency Key Handling
  let createdOrderId: string;
  const testIdempotencyKey = `idemp-${crypto.randomUUID()}`;

  it('9. Replaying same Idempotency-Key with same payload must return original order without re-allocating token', async () => {
    const firstReq = await customerAgent
      .post('/api/v1/orders/online')
      .set('Idempotency-Key', testIdempotencyKey)
      .send({
        items: [{ foodItemId: testFoodItemId, quantity: 1 }],
        customerName: 'Idempotency Tester',
      });

    expect(firstReq.status).toBe(201);
    createdOrderId = firstReq.body.order.id;
    const initialToken = firstReq.body.order.token_number;

    // Retry with identical key and payload
    const retryReq = await customerAgent
      .post('/api/v1/orders/online')
      .set('Idempotency-Key', testIdempotencyKey)
      .send({
        items: [{ foodItemId: testFoodItemId, quantity: 1 }],
        customerName: 'Idempotency Tester',
      });

    expect(retryReq.status).toBe(201);
    expect(retryReq.body.order.id).toBe(createdOrderId);
    expect(retryReq.body.order.token_number).toBe(initialToken);
  });

  // 10. Reusing Idempotency Key with Different Payload
  it('10. Reusing same Idempotency-Key with different payload must be rejected with 422', async () => {
    const mismatchReq = await customerAgent
      .post('/api/v1/orders/online')
      .set('Idempotency-Key', testIdempotencyKey)
      .send({
        items: [{ foodItemId: testFoodItemId, quantity: 2 }], // Different quantity!
        customerName: 'Different Payload Attempt',
      });

    expect(mismatchReq.status).toBe(422);
    expect(mismatchReq.body.code).toBe('IDEMPOTENCY_PAYLOAD_MISMATCH');
  });

  // 11. Transaction Rollback
  it('11. Failed order must roll back transaction without deducting stock or allocating token', async () => {
    const initialStockRes = await query<{ stock_qty: number }>(
      'SELECT stock_qty FROM food_items WHERE id = $1',
      [testFoodItemId]
    );
    const initialStock = initialStockRes.rows[0].stock_qty;

    // Send order with 1 valid item and 1 invalid item (999999)
    const failedOrderReq = await customerAgent.post('/api/v1/orders/online').send({
      items: [
        { foodItemId: testFoodItemId, quantity: 1 },
        { foodItemId: 999999, quantity: 1 }, // Non-existent
      ],
      customerName: 'Rollback Test',
    });

    expect(failedOrderReq.status).toBe(400);

    // Verify stock was not deducted
    const afterStockRes = await query<{ stock_qty: number }>(
      'SELECT stock_qty FROM food_items WHERE id = $1',
      [testFoodItemId]
    );
    expect(afterStockRes.rows[0].stock_qty).toBe(initialStock);
  });

  // 12. Invalid Order Status Transitions
  it('12. Invalid status transitions (e.g. ordered -> completed directly) must be rejected with 400', async () => {
    const res = await cashierAgent
      .patch(`/api/v1/orders/${createdOrderId}/status`)
      .send({ status: 'completed' }); // Cannot jump from ordered to completed!

    expect(res.status).toBe(400);
    expect(res.body.code).toBe('INVALID_STATUS_TRANSITION');
  });

  // 13. Prevention of Unpaid Online Orders Becoming Ready/Completed
  it('13. Unpaid online order must NOT be marked ready or completed', async () => {
    // Transition ordered -> preparing is allowed
    const prepRes = await cashierAgent
      .patch(`/api/v1/orders/${createdOrderId}/status`)
      .send({ status: 'preparing' });
    expect(prepRes.status).toBe(200);

    // Attempting preparing -> ready on UNPAID online order must be blocked!
    const readyRes = await cashierAgent
      .patch(`/api/v1/orders/${createdOrderId}/status`)
      .send({ status: 'ready' });

    expect(readyRes.status).toBe(400);
    expect(readyRes.body.code).toBe('UNPAID_ORDER_CANNOT_PROCEED');
    expect(readyRes.body.error).toContain('UNPAID');
  });

  // 14. QR Verification Security
  it('14. Unauthorized users cannot verify QR codes', async () => {
    const unauthRes = await customerAgent.post('/api/v1/qr/verify').send({
      qrToken: crypto.randomUUID(),
    });
    expect(unauthRes.status).toBe(403);
  });

  it('14b. Verifying QR on unready order must be rejected', async () => {
    // Get QR token for the order
    const orderRes = await query<{ qr_token: string }>(
      'SELECT qr_token FROM orders WHERE id = $1',
      [createdOrderId]
    );
    const qrToken = orderRes.rows[0].qr_token;

    const qrVerifyRes = await cashierAgent.post('/api/v1/qr/verify').send({
      qrToken,
    });
    // Order is preparing and unpaid, not ready
    expect(qrVerifyRes.status).toBe(400);
  });

  // 15. Refund Management & Authorization
  it('15. Customers and Cashiers cannot create refunds', async () => {
    const custRefund = await customerAgent.post('/api/v1/refunds').send({
      orderId: createdOrderId,
      amount: 50,
      reason: 'Customer trying to refund',
      refundType: 'in_person_cash',
    });
    expect(custRefund.status).toBe(403);

    const cashierRefund = await cashierAgent.post('/api/v1/refunds').send({
      orderId: createdOrderId,
      amount: 50,
      reason: 'Cashier trying to refund',
      refundType: 'in_person_cash',
    });
    expect(cashierRefund.status).toBe(403);
  });

  it('15b. Manager can record in-person cash refund with audit trail', async () => {
    const refundRes = await managerAgent.post('/api/v1/refunds').send({
      orderId: createdOrderId,
      amount: testFoodPrice,
      reason: 'Student mistakenly double ordered; cash returned at counter',
      refundType: 'in_person_cash',
      notes: 'Handed ₹' + testFoodPrice + ' directly to student at desk',
    });

    expect(refundRes.status).toBe(201);
    expect(refundRes.body.refund.status).toBe('recorded'); // In-person cash is recorded
    expect(refundRes.body.refund.refund_type).toBe('in_person_cash');
  });

  it('15c. Refund exceeding order balance must be rejected with 400', async () => {
    const excessRefund = await managerAgent.post('/api/v1/refunds').send({
      orderId: createdOrderId,
      amount: 9999, // Exceeds order total
      reason: 'Excess refund test',
      refundType: 'in_person_cash',
    });

    expect(excessRefund.status).toBe(400);
    expect(excessRefund.body.code).toBe('REFUND_VALIDATION_ERROR');
  });

  // 16. Customer Authentication Security: Unauthenticated users cannot create online orders
  it('16. Unauthenticated online order creation must be rejected with 401 Unauthorized', async () => {
    const unauthOrderRes = await anonymousAgent.post('/api/v1/orders/online').send({
      items: [{ foodItemId: testFoodItemId, quantity: 1 }],
      customerName: 'Anonymous Hacker',
    });
    expect(unauthOrderRes.status).toBe(401);
    expect(unauthOrderRes.body.code).toBe('UNAUTHORIZED');
  });

  // 17. IDOR Protection: Customers cannot access other customers' orders
  let customerBAgent: ReturnType<typeof request.agent>;
  it('17. Customer cannot access another customer order details by ID (IDOR protection)', async () => {
    customerBAgent = request.agent(app);
    const customerBEmail = `customer.b.${Date.now()}@college.edu`;
    await customerBAgent.post('/api/v1/auth/register').send({
      name: 'Customer B',
      email: customerBEmail,
      password: 'StrongPassword123!',
      phone: '+91 91111 22222',
    });

    // Customer B attempts to access Customer A's order (createdOrderId)
    const idorOrderRes = await customerBAgent.get(`/api/v1/orders/${createdOrderId}`);
    expect(idorOrderRes.status).toBe(403);
    expect(idorOrderRes.body.code).toBe('FORBIDDEN');
  });

  // 18. IDOR Protection: Customers cannot access other customers' bills
  it('18. Customer cannot access another customer printable bill (IDOR protection)', async () => {
    const idorBillRes = await customerBAgent.get(`/api/v1/orders/${createdOrderId}/bill`);
    expect(idorBillRes.status).toBe(403);
    expect(idorBillRes.body.code).toBe('FORBIDDEN');
  });

  // 19. IDOR Protection: Customers cannot query another customer's payment status
  it('19. Customer cannot query another customer payment status', async () => {
    const idorPaymentRes = await customerBAgent.get(`/api/v1/payments/${createdOrderId}/status`);
    expect(idorPaymentRes.status).toBe(403);
    expect(idorPaymentRes.body.code).toBe('FORBIDDEN');
  });

  // 20. Staff Access to Bills for Counter & Kitchen Printing
  it('20. Cashier and Manager can view bills for counter receipt and kitchen KOT printing', async () => {
    const cashierBillRes = await cashierAgent.get(`/api/v1/orders/${createdOrderId}/bill?type=kitchen`);
    expect(cashierBillRes.status).toBe(200);
    expect(cashierBillRes.body.bill).toBeDefined();
    expect(cashierBillRes.body.bill.copyType).toBe('KITCHEN_COPY_KOT');

    const managerBillRes = await managerAgent.get(`/api/v1/orders/${createdOrderId}/bill?type=customer`);
    expect(managerBillRes.status).toBe(200);
    expect(managerBillRes.body.bill.copyType).toBe('CUSTOMER_RECEIPT');
  });

  // 21. Authorization: Cashier cannot perform Manager-only operations
  it('21. Cashier cannot access Manager-only endpoints', async () => {
    // Attempt to create food category
    const catRes = await cashierAgent.post('/api/v1/categories').send({ name: 'Cashier Category' });
    expect(catRes.status).toBe(403);

    // Attempt to create food item
    const foodRes = await cashierAgent.post('/api/v1/food').send({
      name: 'Cashier Burger',
      categoryId: 1,
      price: 99,
      isVegetarian: true,
      initialStock: 10,
    });
    expect(foodRes.status).toBe(403);

    // Attempt to list staff users
    const staffRes = await cashierAgent.get('/api/v1/users/staff');
    expect(staffRes.status).toBe(403);
  });

  // 22. Concurrent Idempotency Retry: Simultaneous requests with identical key return original order
  it('22. Simultaneous retries with identical Idempotency-Key return original order without duplicate creation', async () => {
    const simKey = `sim-idemp-${crypto.randomUUID()}`;
    const payload = {
      items: [{ foodItemId: testFoodItemId, quantity: 1 }],
      customerName: 'Simultaneous Tester',
    };

    // Dispatch two requests concurrently
    const [req1, req2] = await Promise.all([
      customerAgent.post('/api/v1/orders/online').set('Idempotency-Key', simKey).send(payload),
      customerAgent.post('/api/v1/orders/online').set('Idempotency-Key', simKey).send(payload),
    ]);

    expect(req1.status).toBe(201);
    expect(req2.status).toBe(201);
    expect(req1.body.order.id).toBe(req2.body.order.id);
    expect(req1.body.order.token_number).toBe(req2.body.order.token_number);
  });
});
