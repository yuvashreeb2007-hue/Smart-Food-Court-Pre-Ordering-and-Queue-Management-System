export type UserRole = 'customer' | 'cashier' | 'manager';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  phone?: string;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  iconName?: string;
}

export interface FoodItem {
  id: string;
  categoryId: string;
  categoryName: string;
  name: string;
  description: string;
  price: number;
  image: string; // URL or local object URL from file upload
  isAvailable: boolean;
  // NOTE: internalStockQty is tracked purely in backend memory/db; NEVER rendered in food management UI
  internalStockQty: number;
  preparationTimeMinutes: number;
  isVegetarian: boolean;
}

export interface CartItem {
  foodItem: FoodItem;
  quantity: number;
}

export type OrderType = 'online' | 'offline';
export type OrderStatus = 'ordered' | 'preparing' | 'ready' | 'completed';
export type PaymentMethod = 'upi' | 'cash' | 'card';
export type PaymentStatus = 'pending' | 'paid';

export interface OrderItem {
  id: string;
  foodItemId: string;
  foodName: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
  image?: string;
}

export interface Order {
  id: string;
  orderType: OrderType;
  tokenNumber: number; // Shared sequence starting at 101 per day
  businessDate: string; // YYYY-MM-DD in Asia/Kolkata
  status: OrderStatus;
  totalAmount: number;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  qrToken: string; // Opaque UUID verification token
  qrUsed: boolean;
  createdAt: string;
  customerName?: string;
  customerPhone?: string;
  items: OrderItem[];
}

export type RefundStatus = 'recorded' | 'processing' | 'confirmed' | 'failed';
export type RefundType = 'in_person_cash' | 'electronic';

export interface RefundRecord {
  id: string;
  orderId: string;
  tokenNumber: number;
  amount: number;
  reason: string;
  status: RefundStatus;
  refundType: RefundType;
  managerName: string;
  createdAt: string;
  paymentReference?: string;
  notes?: string;
}
