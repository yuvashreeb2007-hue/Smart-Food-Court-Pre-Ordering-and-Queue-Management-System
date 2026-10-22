import { describe, it, expect, beforeAll } from 'vitest';

const BASE_URL = 'http://localhost:4000/api/v1';
const CLIENT_URL = 'http://localhost:5173';

describe('Phase 5 Full Integration Verification (Frontend & Backend Live)', () => {
  let customerCookie = '';
  let cashierCookie = '';
  let managerCookie = '';
  let createdOrderId = '';
  let createdQrToken = '';
  let createdTokenNumber = 0;

  it('1. Frontend dev server is serving HTML at http://localhost:5173', async () => {
    const res = await fetch(CLIENT_URL);
    expect(res.status).toBe(200);
    const html = await res.text();
    expect(html).toContain('Smart Food Court');
    expect(html).toContain('family=Poppins');
  });

  it('2. Backend health endpoint is live and connected to PostgreSQL', async () => {
    const res = await fetch(`${BASE_URL}/health`);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBe('healthy');
    expect(body.database.connected).toBe(true);
  });

  it('3. Customer authentication: session restoration, login & cookie issuance', async () => {
    // Unauthenticated GET /auth/me returns 401
    const unauthMe = await fetch(`${BASE_URL}/auth/me`);
    expect(unauthMe.status).toBe(401);

    // Login as seeded student
    const loginRes = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'student@college.edu',
        password: 'StudentSecurePass2026!',
      }),
    });
    expect(loginRes.status).toBe(200);
    const cookieHeader = loginRes.headers.get('set-cookie');
    expect(cookieHeader).toBeDefined();
    customerCookie = cookieHeader ? cookieHeader.split(';')[0] : '';
    expect(customerCookie).toContain('sfc.sid');

    // Authenticated GET /auth/me returns customer
    const authMe = await fetch(`${BASE_URL}/auth/me`, {
      headers: { Cookie: customerCookie },
    });
    expect(authMe.status).toBe(200);
    const meBody = await authMe.json();
    expect(meBody.user.email).toBe('student@college.edu');
    expect(meBody.user.role).toBe('customer');
  });

  it('4. Food catalog and categories load real data with internal stock hidden', async () => {
    const catRes = await fetch(`${BASE_URL}/categories`);
    expect(catRes.status).toBe(200);
    const catBody = await catRes.json();
    expect(catBody.categories.length).toBeGreaterThan(0);

    const foodRes = await fetch(`${BASE_URL}/food`);
    expect(foodRes.status).toBe(200);
    const foodBody = await foodRes.json();
    expect(foodBody.foodItems.length).toBeGreaterThan(0);

    // Verify stock privacy
    for (const item of foodBody.foodItems) {
      expect(item).not.toHaveProperty('stock_qty');
      expect(item).toHaveProperty('is_available');
    }
  });

  it('5. Customer creates online pre-order: allocates daily token (>= 101) with pending payment', async () => {
    const foodRes = await fetch(`${BASE_URL}/food?available_only=true`);
    const foodBody = await foodRes.json();
    const targetItem = foodBody.foodItems[0];

    const orderRes = await fetch(`${BASE_URL}/orders/online`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: customerCookie,
        'Idempotency-Key': `test-online-${Date.now()}`,
      },
      body: JSON.stringify({
        items: [{ foodItemId: targetItem.id, quantity: 2 }],
        customerName: 'Aditya Sharma',
        customerPhone: '+91 98765 43210',
      }),
    });

    expect(orderRes.status).toBe(201);
    const orderBody = await orderRes.json();
    expect(orderBody.order.token_number).toBeGreaterThanOrEqual(101);
    expect(orderBody.order.payment_status).toBe('pending');
    expect(orderBody.order.status).toBe('ordered');

    createdOrderId = orderBody.order.id;
    createdQrToken = orderBody.order.qr_token;
    createdTokenNumber = orderBody.order.token_number;
  });

  it('6. Customer can view their own order details, printable bill, and payment status', async () => {
    const getOrderRes = await fetch(`${BASE_URL}/orders/${createdOrderId}`, {
      headers: { Cookie: customerCookie },
    });
    expect(getOrderRes.status).toBe(200);
    const getOrderBody = await getOrderRes.json();
    expect(getOrderBody.order.id).toBe(createdOrderId);

    const getBillRes = await fetch(`${BASE_URL}/orders/${createdOrderId}/bill`, {
      headers: { Cookie: customerCookie },
    });
    expect(getBillRes.status).toBe(200);
    const billBody = await getBillRes.json();
    expect(billBody.bill.token_number).toBe(createdTokenNumber);

    const getPaymentRes = await fetch(`${BASE_URL}/payments/${createdOrderId}/status`, {
      headers: { Cookie: customerCookie },
    });
    expect(getPaymentRes.status).toBe(200);
    const paymentBody = await getPaymentRes.json();
    expect(paymentBody.paymentStatus).toBe('pending');
  });

  it('7. Cashier authentication & operational order queue access', async () => {
    const loginRes = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'cashier@foodcourt.internal',
        password: 'CashierSecurePass2026!',
      }),
    });
    expect(loginRes.status).toBe(200);
    const cookieHeader = loginRes.headers.get('set-cookie');
    cashierCookie = cookieHeader ? cookieHeader.split(';')[0] : '';
    expect(cashierCookie).toContain('sfc.sid');

    const ordersRes = await fetch(`${BASE_URL}/orders`, {
      headers: { Cookie: cashierCookie },
    });
    expect(ordersRes.status).toBe(200);
    const ordersBody = await ordersRes.json();
    expect(Array.isArray(ordersBody.orders)).toBe(true);
  });

  it('8. Status progression & payment security guard: unpaid online order cannot become ready', async () => {
    // Transition ordered -> preparing is allowed
    const prepRes = await fetch(`${BASE_URL}/orders/${createdOrderId}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Cookie: cashierCookie,
      },
      body: JSON.stringify({ status: 'preparing' }),
    });
    expect(prepRes.status).toBe(200);

    // Attempt preparing -> ready on UNPAID online order must be blocked!
    const readyRes = await fetch(`${BASE_URL}/orders/${createdOrderId}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Cookie: cashierCookie,
      },
      body: JSON.stringify({ status: 'ready' }),
    });
    expect(readyRes.status).toBe(400);
    const readyBody = await readyRes.json();
    expect(readyBody.code).toBe('UNPAID_ORDER_CANNOT_PROCEED');
  });

  it('9. Cashier creates counter offline order (marked paid at counter)', async () => {
    const foodRes = await fetch(`${BASE_URL}/food?available_only=true`);
    const foodBody = await foodRes.json();
    const item = foodBody.foodItems[0];

    const counterRes = await fetch(`${BASE_URL}/orders/counter`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: cashierCookie,
      },
      body: JSON.stringify({
        items: [{ foodItemId: item.id, quantity: 1 }],
        paymentMethod: 'cash',
        customerName: 'Counter Walk-in Student',
      }),
    });

    expect(counterRes.status).toBe(201);
    const counterBody = await counterRes.json();
    expect(counterBody.order.token_number).toBeGreaterThanOrEqual(101);
    expect(counterBody.order.payment_status).toBe('paid');
    expect(counterBody.order.order_type).toBe('offline');
  });

  it('10. Manager authentication & refund audit recording', async () => {
    const loginRes = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'manager@foodcourt.internal',
        password: 'ManagerSecurePass2026!',
      }),
    });
    expect(loginRes.status).toBe(200);
    const cookieHeader = loginRes.headers.get('set-cookie');
    managerCookie = cookieHeader ? cookieHeader.split(';')[0] : '';
    expect(managerCookie).toContain('sfc.sid');

    const refundRes = await fetch(`${BASE_URL}/refunds`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: managerCookie,
      },
      body: JSON.stringify({
        orderId: createdOrderId,
        amount: 50,
        reason: 'Integration test desk refund',
        refundType: 'in_person_cash',
        notes: 'Handed ₹50 cash at counter',
      }),
    });
    expect(refundRes.status).toBe(201);
    const refundBody = await refundRes.json();
    expect(refundBody.refund.status).toBe('recorded');
    expect(refundBody.refund.refund_type).toBe('in_person_cash');
  });
});
