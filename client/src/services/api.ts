/**
 * Smart Food Court — Frontend API Client
 * Configured for http://localhost:4000/api/v1 with credentialed session authentication.
 */

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000/api/v1';
export const SERVER_URL = import.meta.env.VITE_SERVER_URL || 'http://localhost:4000';

export interface ApiErrorResponse {
  error: string;
  code?: string;
  details?: any;
}

export class ApiError extends Error {
  code?: string;
  status: number;
  details?: any;

  constructor(message: string, status: number, code?: string, details?: any) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

/**
 * Common fetch wrapper with credentialed cookies and error handling
 */
async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;
  const headers = new Headers(options.headers || {});

  if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  const response = await fetch(url, {
    ...options,
    headers,
    credentials: 'include', // MANDATORY: passes session cookies across origins
  });

  // Handle 204 No Content
  if (response.status === 204) {
    return {} as T;
  }

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const errorMsg = data?.error || `Request failed with status ${response.status}`;
    throw new ApiError(errorMsg, response.status, data?.code, data?.details);
  }

  return data as T;
}

// ----------------------------------------------------
// Authentication API
// ----------------------------------------------------
export const authApi = {
  async getMe() {
    return request<{ user: { id: string; email: string; name: string; role: 'customer' | 'cashier' | 'manager' } }>('/auth/me');
  },

  async login(payload: { email: string; password: string }) {
    return request<{ message: string; user: { id: string; email: string; name: string; role: 'customer' | 'cashier' | 'manager' } }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async register(payload: { name: string; email: string; password: string; phone?: string }) {
    return request<{ message: string; user: { id: string; email: string; name: string; role: 'customer' } }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async logout() {
    return request<{ message: string }>('/auth/logout', {
      method: 'POST',
    });
  },
};

// ----------------------------------------------------
// Categories API
// ----------------------------------------------------
export const categoryApi = {
  async listCategories() {
    return request<{ categories: { id: number; name: string; display_order: number; is_active: boolean }[] }>('/categories');
  },

  async createCategory(payload: { name: string; displayOrder?: number }) {
    return request<{ category: { id: number; name: string; display_order: number } }>('/categories', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },
};

// ----------------------------------------------------
// Food Catalog API
// ----------------------------------------------------
export interface BackendFoodItem {
  id: number;
  category_id: number;
  category_name: string;
  name: string;
  description: string | null;
  price: string | number;
  image_path: string | null;
  is_available: boolean;
  preparation_time_minutes: number;
  is_vegetarian: boolean;
  created_at: string;
}

export const foodApi = {
  async listFood(params?: { category_id?: number | string; search?: string; available_only?: boolean }) {
    const query = new URLSearchParams();
    if (params?.category_id && params.category_id !== 'all') {
      query.set('category_id', String(params.category_id));
    }
    if (params?.search) {
      query.set('search', params.search);
    }
    if (params?.available_only) {
      query.set('available_only', 'true');
    }
    const qs = query.toString() ? `?${query.toString()}` : '';
    return request<{ foodItems: BackendFoodItem[] }>(`/food${qs}`);
  },

  async getFoodById(id: number | string) {
    return request<{ foodItem: BackendFoodItem }>(`/food/${id}`);
  },

  async createFood(payload: {
    name: string;
    categoryId: number;
    price: number;
    isVegetarian: boolean;
    preparationTimeMinutes: number;
    initialStock: number;
    description?: string;
    imagePath?: string;
  }) {
    return request<{ message: string; foodItem: BackendFoodItem }>('/food', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async updateFood(
    id: number | string,
    payload: {
      name?: string;
      categoryId?: number;
      price?: number;
      isVegetarian?: boolean;
      preparationTimeMinutes?: number;
      description?: string;
      imagePath?: string;
      isAvailable?: boolean;
    }
  ) {
    return request<{ message: string; foodItem: BackendFoodItem }>(`/food/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  },

  async toggleAvailability(id: number | string, isAvailable: boolean) {
    return request<{ message: string; foodItemId: number; isAvailable: boolean }>(`/food/${id}/availability`, {
      method: 'PATCH',
      body: JSON.stringify({ isAvailable }),
    });
  },

  async deleteFood(id: number | string) {
    return request<{ message: string }>(`/food/${id}`, {
      method: 'DELETE',
    });
  },

  async uploadFoodImage(file: File) {
    const formData = new FormData();
    formData.append('image', file);
    return request<{ message: string; imagePath: string }>('/food/upload-image', {
      method: 'POST',
      body: formData,
    });
  },
};

// ----------------------------------------------------
// Orders API
// ----------------------------------------------------
export interface BackendOrderItem {
  id: number;
  foodItemId: number;
  foodName: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
}

export interface BackendOrder {
  id: string;
  user_id?: string | null;
  order_type: 'online' | 'offline';
  token_number: number;
  business_date: string;
  status: 'ordered' | 'preparing' | 'ready' | 'completed';
  total_amount: string | number;
  payment_method: 'cash' | 'card' | 'upi';
  payment_status: 'pending' | 'paid';
  qr_token: string;
  qr_used: boolean;
  customer_name: string | null;
  customer_phone: string | null;
  created_at: string;
  items: BackendOrderItem[];
}

export const ordersApi = {
  async createOnlineOrder(
    payload: {
      items: { foodItemId: number; quantity: number }[];
      customerName?: string;
      customerPhone?: string;
    },
    idempotencyKey?: string
  ) {
    const headers: Record<string, string> = {};
    if (idempotencyKey) {
      headers['Idempotency-Key'] = idempotencyKey;
    }
    return request<{ message: string; order: BackendOrder }>('/orders/online', {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    });
  },

  async createCounterOrder(
    payload: {
      items: { foodItemId: number; quantity: number }[];
      paymentMethod: 'cash' | 'card' | 'upi';
      customerName?: string;
      customerPhone?: string;
    },
    idempotencyKey?: string
  ) {
    const headers: Record<string, string> = {};
    if (idempotencyKey) {
      headers['Idempotency-Key'] = idempotencyKey;
    }
    return request<{ message: string; order: BackendOrder }>('/orders/counter', {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    });
  },

  async listOrders(params?: {
    status?: string;
    type?: string;
    date?: string;
    limit?: number;
    offset?: number;
  }) {
    const query = new URLSearchParams();
    if (params?.status && params.status !== 'all') query.set('status', params.status);
    if (params?.type && params.type !== 'all') query.set('type', params.type);
    if (params?.date) query.set('date', params.date);
    if (params?.limit) query.set('limit', String(params.limit));
    if (params?.offset) query.set('offset', String(params.offset));
    const qs = query.toString() ? `?${query.toString()}` : '';
    return request<{ orders: BackendOrder[] }>(`/orders${qs}`);
  },

  async getOrderById(id: string) {
    return request<{ order: BackendOrder }>(`/orders/${id}`);
  },

  async updateOrderStatus(
    id: string,
    payload: { status: 'ordered' | 'preparing' | 'ready' | 'completed'; notes?: string }
  ) {
    return request<{
      message: string;
      orderId: string;
      previousStatus: string;
      newStatus: string;
    }>(`/orders/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
  },

  async getOrderBill(id: string, type: 'customer' | 'kitchen' = 'customer') {
    return request<{
      bill: {
        header: string;
        facility: string;
        timezone: string;
        copyType: string;
        id: string;
        user_id?: string | null;
        token_number: number;
        order_type: string;
        business_date: string;
        status: string;
        total_amount: string | number;
        payment_method: string;
        payment_status: string;
        customer_name: string | null;
        created_at: string;
        items: { foodName: string; quantity: number; unitPrice: number; lineTotal: number }[];
      };
    }>(`/orders/${id}/bill?type=${type}`);
  },
};

// ----------------------------------------------------
// Payments API
// ----------------------------------------------------
export const paymentsApi = {
  async getPaymentStatus(orderId: string) {
    return request<{
      orderId: string;
      paymentMethod: string;
      paymentStatus: 'pending' | 'paid';
      totalAmount: string | number;
      provider: string;
      integrationStatus: string;
      notice: string;
    }>(`/payments/${orderId}/status`);
  },
};

// ----------------------------------------------------
// Refunds API
// ----------------------------------------------------
export interface BackendRefundRecord {
  id: string;
  order_id: string;
  token_number: number;
  amount: string | number;
  reason: string;
  refund_type: 'in_person_cash' | 'electronic';
  status: 'recorded' | 'processing' | 'confirmed' | 'failed';
  payment_reference: string | null;
  notes: string | null;
  manager_name: string;
  created_at: string;
}

export const refundsApi = {
  async createRefund(payload: {
    orderId: string;
    amount: number;
    reason: string;
    refundType: 'in_person_cash' | 'electronic';
    notes?: string;
  }) {
    return request<{ message: string; refund: BackendRefundRecord }>('/refunds', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async listRefunds() {
    return request<{ refunds: BackendRefundRecord[] }>('/refunds');
  },
};

// ----------------------------------------------------
// QR Code Verification API
// ----------------------------------------------------
export const qrApi = {
  async verifyQr(qrToken: string) {
    return request<{
      message: string;
      order: {
        id: string;
        token_number: number;
        customer_name: string | null;
        total_amount: string | number;
        status: string;
        qr_used: boolean;
      };
    }>('/qr/verify', {
      method: 'POST',
      body: JSON.stringify({ qrToken }),
    });
  },
};
