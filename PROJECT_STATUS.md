# PROJECT_STATUS.md — Smart Food Court

Last updated: 2026-10-22
Current phase: **Phase 5 — Frontend Integration (Completed, Awaiting Review)**

---

## Phase Log

| Phase | Status | Approved By Owner |
|-------|--------|-------------------|
| Phase 1 — Architecture & Plan | ✅ Approved | ✅ Yes |
| Phase 2 — UI/UX Prototype | ✅ Approved | ✅ Yes |
| Phase 3 — UI Refinement | ⏭️ Skipped per instruction | ✅ Yes |
| Phase 4 — PostgreSQL & Backend | ✅ Approved | ✅ Yes |
| Phase 5 — Frontend Integration | 🔄 Completed, Awaiting Review | ❌ Pending Review |
| Phase 6 — Functional Testing | ⏳ Next phase | — |
| Phase 7 — UAT | ⏳ Not started | — |
| Phase 8 — Deployment Prep | ⏳ Not started | — |

---

## Phase 4 Implementation Summary

The complete PostgreSQL database, migrations, seed scripts, Express + TypeScript REST API, authentication, authorization, and automated test suite have been built and verified.

### 1. Database & Migrations (All 11 Tables Applied)
- **`schema_migrations`**: Migration tracking table executing migrations in atomic transactions.
- **Migration 001 (`users`)**: Customers, Cashiers, and Managers with Argon2id password hashing, unique normalized emails, and role checks.
- **Migration 002 (`categories`)**: Menu categories with display ordering.
- **Migration 003 (`food_items`)**: Food catalog with internal `stock_qty` (strictly hidden from UI), prices, preparation times, and soft deletes (`deleted_at`).
- **Migration 004 (`daily_tokens`)**: Concurrency-safe per-date sequential counter starting at 101 in `Asia/Kolkata`.
- **Migration 005 (`orders`)**: Online and counter orders sharing the same daily token sequence with `UNIQUE(business_date, token_number)` constraint.
- **Migration 006 (`order_items`)**: Snapshotted line items with fixed unit prices and line totals.
- **Migration 007 (`payment_records`)**: Provider transaction tracking and raw payload auditing.
- **Migration 008 (`refunds`)**: Manager-authorized in-person cash and electronic refund audit records (append-only).
- **Migration 009 (`order_status_history`)**: Audit trail for all status transitions (`ordered -> preparing -> ready -> completed`).
- **Migration 010 (`idempotency_keys`)**: Deduplication table for network retries and double clicks using SHA-256 payload hashing.
- **Migration 011 (`session`)**: PostgreSQL-backed session storage for `connect-pg-simple`.

### 2. Staff Account Seeding
- **Idempotent Seeder (`src/db/seed.ts`)**:
  - Creates Cashier account from `SEED_CASHIER_EMAIL` and `SEED_CASHIER_PASSWORD`.
  - Creates Manager account from `SEED_MANAGER_EMAIL` and `SEED_MANAGER_PASSWORD`.
  - Hashes passwords with Argon2id.
  - Never logs or prints passwords in terminal or logs.
  - Skips already existing accounts without overwriting passwords.
  - Seeds initial categories and initial food items with internal stock tracking.

### 3. Authentication & Security
- **Argon2id** password hashing (`argon2.argon2id`, 64MB memory cost).
- **`express-session` + `connect-pg-simple`**: PostgreSQL session storage with session regeneration on login.
- **Role-based Authorization Middleware (`requireAuth`, `requireRole`)**: Strictly enforces `customer`, `cashier`, `manager`.
- **Public Registration Guard**: Registration endpoint hardcoded to assign `role = 'customer'` only; client-supplied roles are ignored.
- **Rate Limiting**: `express-rate-limit` on authentication endpoints.
- **Helmet**: Strict security headers with CORS restricted to `CLIENT_ORIGIN`.
- **Safe Logger**: Sanitizes passwords, secrets, session IDs, and authorization tokens.

### 4. Food Management & Stock Privacy Rule
- **Stock Privacy Enforced**: `stock_qty` is strictly omitted from all public and food management API responses. Only `is_available` is exposed.
- **Device Image Upload**: Multer memory storage with file content magic-byte verification (JPEG, PNG, WebP only, max 5MB, random UUID filenames, stored under `server/uploads`). Image URLs are rejected.
- **Food Availability Toggle**: Cashier and Manager can toggle Available/Unavailable directly.

### 5. Order Management & Token Allocation
- **Concurrency-Safe Shared Tokens**: Uses PostgreSQL atomic `INSERT ... ON CONFLICT DO UPDATE ... RETURNING last_token` with row-level locks on `daily_tokens`. Online and counter orders share the sequence starting at 101.
- **Idempotency**: Supports `Idempotency-Key` header. Returns original committed order for retries; rejects key reuse with different payloads (HTTP 422).
- **Transaction Integrity**: Order creation, internal stock validation and decrement, token allocation, line items, and idempotency key are atomic in a single transaction. Rollbacks leave zero partial state.
- **Payment Guard**: Unpaid online orders (`payment_status = 'pending'`) can **never** be transitioned to `ready` or `completed`.
- **IDOR Protection**: Customers can only view their own orders; Cashier/Manager can access operational queues.

### 6. Payment & Refunds
- **No Simulated Payments**: Online orders start as `payment_status = 'pending'` until genuine provider credentials and webhooks are configured.
- **Refund Management**: Manager-only. Supports `recorded`, `processing`, `confirmed`, `failed`. In-person cash refunds are recorded with audit trail without falsely claiming electronic money transfers. Validates refund amounts against remaining order balances.

### 7. Automated Test Suite (29 Tests Passing)
- Test suite executed via Vitest and Supertest: **29 passed out of 29 tests** (100% pass rate).
- Tests cover:
  1. Health check & DB connectivity
  2. Customer self-registration
  3. Customer login & session cookie issuance
  4. Seeded Cashier login
  5. Seeded Manager login
  6. Customer role access rejection on Manager routes (403 Forbidden)
  7. Public registration staff-role injection prevention
  8. Food catalog listing with strict internal `stock_qty` hiding
  9. Unavailable food item order rejection (400)
  10. Ordering exceeding internal stock rejection (400)
  11. Concurrent orders shared sequential token allocation (>= 101)
  12. Daily token unique constraint enforcement
  13. Idempotency-Key retry replaying original order
  14. Idempotency-Key payload mismatch rejection (422)
  15. Failed order transaction rollback (zero stock loss, zero token burn)
  16. Invalid status transition rejection (400)
  17. Unpaid online order transition to ready/completed block (400)
  18. Unauthorized QR verification block (403)
  19. QR verification on unready order rejection (400)
  20. Customer and Cashier refund attempt rejection (403)
  21. Manager in-person cash refund record creation
  22. Refund exceeding balance rejection (400)
  23. Unauthenticated online order creation rejection (401)
  24. Customer IDOR protection on order details (403)
  25. Customer IDOR protection on printable bills (403)
  26. Customer IDOR protection on payment status query (403)
  27. Cashier and Manager authorized bill access for receipt & KOT printing (200)
  28. Cashier access rejection on Manager-only operations (403)
  29. Simultaneous retries with identical Idempotency-Key deduplication

---

## Phase 4 Final Security & Implementation Review Findings

### 1. Customer Authentication
- **Online Order Auth Guard**: Enforced `requireAuth` on `POST /api/v1/orders/online`. Unauthenticated clients receive HTTP 401 Unauthorized (`UNAUTHORIZED`).
- **Impersonation Prevention**: `orders.user_id` is assigned strictly from the verified session (`req.session.user.id`). Client-supplied user identifiers are completely ignored.

### 2. Order and Bill Privacy (IDOR Protection)
- **Order Details**: `GET /api/v1/orders/:id` enforces customer ownership. If `user.role === 'customer'` and `order.user_id !== user.id`, returns HTTP 403 Forbidden (`FORBIDDEN`).
- **Printable Bills**: `GET /api/v1/orders/:id/bill` enforces customer ownership. If `user.role === 'customer'` and `bill.user_id !== user.id`, returns HTTP 403 Forbidden (`FORBIDDEN`). Cashier and Manager retain access for counter receipts and kitchen KOT tickets.
- **Payment Status**: `GET /api/v1/payments/:orderId/status` enforces customer ownership. Returns HTTP 403 Forbidden if accessed by another customer.
- **Public Data Scrubbing**: No passwords, password hashes, or customer phone numbers are exposed on public endpoints. Internal `stock_qty` is strictly omitted from food endpoints.

### 3. Payment Security
- **No Client-Supplied Payment Status**: Online orders always initialize with `payment_status = 'pending'`. The client cannot alter payment status during creation or through status transition endpoints.
- **Unpaid Order Protection**: Online orders with `payment_status = 'pending'` are strictly blocked from transitioning to `ready` or `completed` (`UNPAID_ORDER_CANNOT_PROCEED`).
- **Webhook Integrity**: Webhook processing validates HMAC SHA-256 provider signatures (`x-provider-signature`) and ignores duplicate payment events idempotently.
- **Remaining Unimplemented Functionality**: Production UPI merchant credentials and live provider SDK (e.g. Razorpay/PhonePe) are pending Phase 5 integration. Until then, online orders remain pending payment and simulated payments are prohibited.

### 4. Token and Order Consistency
- **Sequential Daily Tokens**: Token sequence starts at 101 for each date in `Asia/Kolkata`, shared across online and counter orders, locked via `daily_tokens` row-level locks, and enforced by `UNIQUE(business_date, token_number)`.
- **Atomic Rollback**: Database transactions ensure failed orders leave no partial records, deduct zero stock, and consume no daily tokens.
- **Concurrent Idempotency Handling**: Simultaneous requests with the same `Idempotency-Key` are resolved via unique constraint on `idempotency_keys` table. The secondary transaction rolls back cleanly and returns the original committed response.

### 5. Role Authorization
- Customers cannot access Manager endpoints (`POST /categories`, `POST /food`, `PUT /food/:id`, `DELETE /food/:id`, `POST /refunds`, `GET /users/staff`).
- Cashiers cannot perform Manager-only operations (categories, food creation/deletion, refunds, staff listings).
- Public registration strictly assigns `role = 'customer'`.

---

## Verified Commands & Output

- **Database Health Check**:
  ```bash
  npm run db:check
  ```
  *Output:* `Database connection verified successfully {"healthy":true,"latencyMs":48,"tablesCount":12,"appliedMigrations":11}`
- **Automated Test Suite**:
  ```bash
  npm run test:server
  ```
  *Output:* `29 passed out of 29 tests (100% pass rate)`

---

## Summary of Defects Found & Fixed During Review

1. **Defect:** `POST /api/v1/orders/online` previously had `optionalAuth`, allowing unauthenticated users to place orders.
   - **Fix:** Switched to `requireAuth` and tied `orders.user_id` strictly to `req.session.user.id`.
2. **Defect:** `GET /api/v1/orders/:id/bill` and `GET /api/v1/payments/:orderId/status` lacked authentication and ownership checks, creating IDOR vulnerabilities.
   - **Fix:** Added `requireAuth` and customer ownership checks (`user.role === 'customer' && row.user_id !== user.id` -> 403 Forbidden) while preserving staff printing access.
3. **Defect:** In `getOrderById`, counter orders with `user_id = null` could be viewed by customers.
   - **Fix:** Strengthened condition to `(!order.user_id || order.user_id !== user.id)`.
4. **Defect:** Simultaneous concurrent retries with the same `Idempotency-Key` could have created duplicate records before `ON CONFLICT DO NOTHING`.
   - **Fix:** Added unique violation catch handling to safely retrieve and replay the committed idempotency response.

---

## Phase 5 Implementation & Frontend Integration Summary

In Phase 5, the React + TypeScript frontend was integrated with the PostgreSQL + Express backend running at `http://localhost:4000/api/v1`. All mock data and temporary simulation state were replaced with real API calls, credentialed sessions, and database constraints.

### 1. Architectural & Configuration Changes
- **API Client Layer (`client/src/services/api.ts`)**: Built a fully-typed API module wrapping native `fetch` with `credentials: 'include'` for all requests. Handles endpoint errors uniformly with structured error codes.
- **Dynamic CORS & Security (`server/src/app.ts`)**: Configured CORS origin handler in development to accept both `http://localhost:5173` and `http://127.0.0.1:5173` with credentials enabled.
- **Session Persistence Synchrony (`server/src/controllers/auth.controller.ts`)**: Added explicit `req.session.save()` before HTTP 200/201 response dispatch to prevent asynchronous PostgreSQL session store race conditions upon immediate subsequent queries.
- **Static Food Image Resolution (`client/src/utils/images.ts`)**: Resolves backend uploaded images served at `http://localhost:4000/uploads/...` with fallback to category-specific curated photography.

### 2. Connected Workflows
1. **Authentication & Role Authorization**:
   - Customer self-registration with 8+ character password validation and phone number.
   - Session restoration via `GET /api/v1/auth/me` on application launch.
   - Multi-role logout with session termination.
   - Quick prototype role switcher connected to real seeded backend accounts.
2. **Food Menu & Availability**:
   - Real categories and food items fetched from `GET /api/v1/categories` and `GET /api/v1/food`.
   - Category filtering, vegetarian toggling, and search querying against live items.
   - Internal stock quantities strictly hidden; displays only `Available` or `Unavailable`.
3. **Customer Cart & Online Pre-Ordering**:
   - Real empty initial cart persisted across reloads.
   - Checkout auth guard requiring customer sign-in.
   - Order placement via `POST /api/v1/orders/online` allocating tokens sequentially starting at 101.
   - Clear UI payment pending notification: "Online payment integration is pending provider setup. Orders remain marked 'Pending Payment' until verified."
4. **Order Tracking & Customer Order History**:
   - Customer order history fetched via `GET /api/v1/orders` (ownership enforced).
   - Live order tracking modal and order details displaying real daily token, timeline status, and verification QR code.
   - Printable thermal bill modal via `GET /api/v1/orders/:id/bill`.
5. **Cashier Order Queue & Counter Orders**:
   - Operational queue listing orders for the current business date.
   - Status progression (`ordered -> preparing -> ready -> completed`).
   - Strict payment security guard: Unpaid online orders cannot be progressed to `ready` or `completed` (blocked by UI warning and backend HTTP 400).
   - Offline counter order creation (`POST /api/v1/orders/counter`) marked paid immediately via cash/counter UPI.
   - Fast item availability toggle for kitchen stockouts.
   - Dedicated Cashier QR Verification tab (`POST /api/v1/qr/verify`) with instant pickup completion.
6. **Manager Dashboard & Governance**:
   - Live analytics: Total today revenue, active orders, completed orders, and food items count.
   - Food catalog CRUD: Add, edit, toggle availability, and soft delete.
   - Device image file upload (`POST /api/v1/food/upload-image`) using `multipart/form-data` and magic-byte validation.
   - 7-day rolling order history with search and filtering.
   - In-person cash and electronic refund audit logging (`POST /api/v1/refunds` and `GET /api/v1/refunds`).

### 3. Verification & Test Execution

- **Frontend Production Build**:
  ```bash
  npm --prefix client run build
  ```
  *Result:* Clean build with TypeScript checking in 541ms; 0 errors.

- **E2E Integration Test Suite against Live Servers (`server/tests/integration.e2e.test.ts`)**:
  ```bash
  npx vitest run tests/integration.e2e.test.ts
  ```
  *Result:* **10 passed out of 10 tests** (100% pass rate).
  1. Frontend dev server serving HTML at `http://localhost:5173`
  2. Backend health endpoint live and connected to PostgreSQL
  3. Customer authentication, session restoration, login & cookie issuance
  4. Food catalog and categories load real data with internal stock hidden
  5. Customer online pre-order creates order with shared daily token (>= 101) & pending payment
  6. Customer accesses personal order details, printable bill, and payment status
  7. Cashier authentication & operational order queue access
  8. Status progression & payment security guard: unpaid online order blocked from becoming ready
  9. Cashier creates counter offline order (marked paid at counter)
  10. Manager authentication & refund audit recording

- **Complete Backend Test Suite**:
  ```bash
  npm test
  ```
  *Result:* **39 passed out of 39 tests** across `tests/api.test.ts` and `tests/integration.e2e.test.ts`.

### 4. Local Testing URLs & Credentials
- **Frontend URL:** `http://localhost:5173`
- **Backend API URL:** `http://localhost:4000/api/v1`
- **Seeded Accounts for Testing:**
  - **Customer:** `student@college.edu` / `StudentSecurePass2026!`
  - **Cashier:** `cashier@foodcourt.internal` / `CashierSecurePass2026!`
  - **Manager:** `manager@foodcourt.internal` / `ManagerSecurePass2026!`

