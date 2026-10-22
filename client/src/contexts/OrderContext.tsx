import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { FoodItem, Category, Order, OrderStatus, PaymentMethod, RefundRecord, RefundType } from '../types';
import {
  foodApi,
  ordersApi,
  refundsApi,
  qrApi,
  categoryApi,
  BackendFoodItem,
  BackendOrder,
  BackendRefundRecord,
} from '../services/api';
import { resolveFoodImageUrl } from '../utils/images';
import { useAuth } from './AuthContext';

interface OrderContextType {
  foodItems: FoodItem[];
  categories: Category[];
  orders: Order[];
  refunds: RefundRecord[];
  activeTokenNumber: number;
  isLoadingFood: boolean;
  isLoadingOrders: boolean;
  error: string | null;
  refreshFood: () => Promise<void>;
  refreshOrders: () => Promise<void>;
  refreshRefunds: () => Promise<void>;
  toggleFoodAvailability: (id: string) => Promise<boolean>;
  addFoodItem: (item: Omit<FoodItem, 'id' | 'internalStockQty'>) => Promise<boolean>;
  updateFoodItem: (id: string, item: Partial<FoodItem>) => Promise<boolean>;
  deleteFoodItem: (id: string) => Promise<boolean>;
  placeOnlineOrder: (
    items: { foodItem: FoodItem; quantity: number }[],
    customerName?: string,
    customerPhone?: string
  ) => Promise<{ success: boolean; order?: Order; error?: string }>;
  createOfflineOrder: (
    items: { foodItem: FoodItem; quantity: number }[],
    paymentMethod: PaymentMethod,
    customerName?: string,
    customerPhone?: string
  ) => Promise<{ success: boolean; order?: Order; error?: string }>;
  updateOrderStatus: (orderId: string, newStatus: OrderStatus, notes?: string) => Promise<{ success: boolean; error?: string }>;
  recordRefund: (
    orderId: string,
    tokenNumber: number,
    amount: number,
    reason: string,
    refundType: RefundType,
    notes?: string
  ) => Promise<{ success: boolean; refund?: RefundRecord; error?: string }>;
  verifyQrToken: (qrToken: string) => Promise<{ success: boolean; order?: any; error?: string }>;
  fetchOrderBill: (orderId: string, copyType?: 'customer' | 'kitchen') => Promise<any>;
}

const OrderContext = createContext<OrderContextType | undefined>(undefined);

function mapBackendFood(f: BackendFoodItem): FoodItem {
  return {
    id: String(f.id),
    categoryId: String(f.category_id),
    categoryName: f.category_name,
    name: f.name,
    description: f.description || '',
    price: typeof f.price === 'string' ? parseFloat(f.price) : f.price,
    image: resolveFoodImageUrl(f.image_path, f.name),
    isAvailable: f.is_available,
    internalStockQty: 0, // NEVER rendered or displayed in UI
    preparationTimeMinutes: f.preparation_time_minutes,
    isVegetarian: f.is_vegetarian,
  };
}

function mapBackendOrder(o: BackendOrder): Order {
  return {
    id: o.id,
    orderType: o.order_type,
    tokenNumber: o.token_number,
    businessDate: o.business_date,
    status: o.status,
    totalAmount: typeof o.total_amount === 'string' ? parseFloat(o.total_amount) : o.total_amount,
    paymentMethod: o.payment_method,
    paymentStatus: o.payment_status,
    qrToken: o.qr_token,
    qrUsed: o.qr_used,
    createdAt: o.created_at,
    customerName: o.customer_name || 'Walk-in Guest',
    customerPhone: o.customer_phone || '',
    items: (o.items || []).map(i => ({
      id: String(i.id),
      foodItemId: String(i.foodItemId),
      foodName: i.foodName,
      quantity: i.quantity,
      unitPrice: typeof i.unitPrice === 'string' ? parseFloat(i.unitPrice) : i.unitPrice,
      lineTotal: typeof i.lineTotal === 'string' ? parseFloat(i.lineTotal) : i.lineTotal,
    })),
  };
}

function mapBackendRefund(r: BackendRefundRecord): RefundRecord {
  return {
    id: r.id,
    orderId: r.order_id,
    tokenNumber: r.token_number,
    amount: typeof r.amount === 'string' ? parseFloat(r.amount) : r.amount,
    reason: r.reason,
    status: r.status,
    refundType: r.refund_type,
    managerName: r.manager_name,
    createdAt: r.created_at,
    paymentReference: r.payment_reference || '',
    notes: r.notes || '',
  };
}

export const OrderProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentUser, isAuthenticated } = useAuth();

  const [foodItems, setFoodItems] = useState<FoodItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [refunds, setRefunds] = useState<RefundRecord[]>([]);
  const [activeTokenNumber, setActiveTokenNumber] = useState<number>(101);

  const [isLoadingFood, setIsLoadingFood] = useState<boolean>(true);
  const [isLoadingOrders, setIsLoadingOrders] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Load food catalog & categories
  const refreshFood = useCallback(async () => {
    try {
      setIsLoadingFood(true);
      const [foodRes, catRes] = await Promise.all([
        foodApi.listFood(),
        categoryApi.listCategories().catch(() => ({ categories: [] })),
      ]);

      const mapped = foodRes.foodItems.map(mapBackendFood);
      setFoodItems(mapped);

      if (catRes.categories && catRes.categories.length > 0) {
        const mappedCats: Category[] = [
          { id: 'cat-all', name: 'All Items', slug: 'all' },
          ...catRes.categories.map(c => ({
            id: String(c.id),
            name: c.name,
            slug: c.name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
          })),
        ];
        setCategories(mappedCats);
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to load food menu from backend');
    } finally {
      setIsLoadingFood(false);
    }
  }, []);

  // Load orders (customer's own or staff queue depending on authenticated role)
  const refreshOrders = useCallback(async () => {
    if (!isAuthenticated) {
      setOrders([]);
      return;
    }
    try {
      setIsLoadingOrders(true);
      const res = await ordersApi.listOrders({ limit: 100 });
      const mapped = res.orders.map(mapBackendOrder);
      setOrders(mapped);

      // Next token estimate
      const maxToken = mapped.reduce((max, o) => Math.max(max, o.tokenNumber), 100);
      setActiveTokenNumber(maxToken + 1);
    } catch {
      // Ignore if unauthenticated or session expired
    } finally {
      setIsLoadingOrders(false);
    }
  }, [isAuthenticated]);

  // Load refunds (Manager role only)
  const refreshRefunds = useCallback(async () => {
    if (currentUser.role !== 'manager' || !isAuthenticated) {
      setRefunds([]);
      return;
    }
    try {
      const res = await refundsApi.listRefunds();
      setRefunds(res.refunds.map(mapBackendRefund));
    } catch {
      // Ignored if unauthorized
    }
  }, [currentUser.role, isAuthenticated]);

  // Load initial data
  useEffect(() => {
    refreshFood();
  }, [refreshFood]);

  useEffect(() => {
    refreshOrders();
    refreshRefunds();
  }, [refreshOrders, refreshRefunds]);

  // Toggle availability (Cashier / Manager)
  const toggleFoodAvailability = async (id: string): Promise<boolean> => {
    try {
      const item = foodItems.find(f => f.id === id);
      if (!item) return false;
      const nextState = !item.isAvailable;
      await foodApi.toggleAvailability(id, nextState);
      setFoodItems(prev =>
        prev.map(f => (f.id === id ? { ...f, isAvailable: nextState } : f))
      );
      return true;
    } catch (err: any) {
      setError(err?.message || 'Failed to update availability');
      return false;
    }
  };

  // Add food item (Manager only)
  const addFoodItem = async (
    itemData: Omit<FoodItem, 'id' | 'internalStockQty'>
  ): Promise<boolean> => {
    try {
      const catId = parseInt(itemData.categoryId, 10) || 1;
      const res = await foodApi.createFood({
        name: itemData.name,
        categoryId: catId,
        price: itemData.price,
        isVegetarian: itemData.isVegetarian,
        preparationTimeMinutes: itemData.preparationTimeMinutes,
        initialStock: 50,
        description: itemData.description,
        imagePath: itemData.image.startsWith('http') ? undefined : itemData.image,
      });

      const newFood = mapBackendFood(res.foodItem);
      setFoodItems(prev => [newFood, ...prev]);
      return true;
    } catch (err: any) {
      setError(err?.message || 'Failed to add food item');
      return false;
    }
  };

  // Update food item (Manager only)
  const updateFoodItem = async (
    id: string,
    updatedFields: Partial<FoodItem>
  ): Promise<boolean> => {
    try {
      const catId = updatedFields.categoryId ? parseInt(updatedFields.categoryId, 10) : undefined;
      const res = await foodApi.updateFood(id, {
        name: updatedFields.name,
        categoryId: catId,
        price: updatedFields.price,
        isVegetarian: updatedFields.isVegetarian,
        preparationTimeMinutes: updatedFields.preparationTimeMinutes,
        description: updatedFields.description,
        isAvailable: updatedFields.isAvailable,
      });

      const updated = mapBackendFood(res.foodItem);
      setFoodItems(prev => prev.map(f => (f.id === id ? updated : f)));
      return true;
    } catch (err: any) {
      setError(err?.message || 'Failed to update food item');
      return false;
    }
  };

  // Delete food item (Manager only)
  const deleteFoodItem = async (id: string): Promise<boolean> => {
    try {
      await foodApi.deleteFood(id);
      setFoodItems(prev => prev.filter(f => f.id !== id));
      return true;
    } catch (err: any) {
      setError(err?.message || 'Failed to delete food item');
      return false;
    }
  };

  // Place online order with real backend transaction and idempotency
  const placeOnlineOrder = async (
    cartList: { foodItem: FoodItem; quantity: number }[],
    customerName?: string,
    customerPhone?: string
  ): Promise<{ success: boolean; order?: Order; error?: string }> => {
    try {
      const idempotencyKey = `online-${crypto.randomUUID()}`;
      const payload = {
        items: cartList.map(c => ({
          foodItemId: parseInt(c.foodItem.id, 10),
          quantity: c.quantity,
        })),
        customerName: customerName?.trim() || currentUser.name || undefined,
        customerPhone: customerPhone?.trim() || currentUser.phone || undefined,
      };

      const res = await ordersApi.createOnlineOrder(payload, idempotencyKey);
      const newOrder = mapBackendOrder(res.order);

      setOrders(prev => [newOrder, ...prev]);
      setActiveTokenNumber(newOrder.tokenNumber + 1);
      return { success: true, order: newOrder };
    } catch (err: any) {
      return { success: false, error: err?.message || 'Failed to place online pre-order' };
    }
  };

  // Create counter offline order (Cashier / Manager)
  const createOfflineOrder = async (
    cartList: { foodItem: FoodItem; quantity: number }[],
    paymentMethod: PaymentMethod,
    customerName?: string,
    customerPhone?: string
  ): Promise<{ success: boolean; order?: Order; error?: string }> => {
    try {
      const idempotencyKey = `counter-${crypto.randomUUID()}`;
      const payload = {
        items: cartList.map(c => ({
          foodItemId: parseInt(c.foodItem.id, 10),
          quantity: c.quantity,
        })),
        paymentMethod,
        customerName: customerName?.trim() || 'Counter Walk-in',
        customerPhone: customerPhone?.trim() || undefined,
      };

      const res = await ordersApi.createCounterOrder(payload, idempotencyKey);
      const newOrder = mapBackendOrder(res.order);

      setOrders(prev => [newOrder, ...prev]);
      setActiveTokenNumber(newOrder.tokenNumber + 1);
      return { success: true, order: newOrder };
    } catch (err: any) {
      return { success: false, error: err?.message || 'Failed to create counter offline order' };
    }
  };

  // Update order status (ordered -> preparing -> ready -> completed)
  const updateOrderStatus = async (
    orderId: string,
    newStatus: OrderStatus,
    notes?: string
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      await ordersApi.updateOrderStatus(orderId, { status: newStatus, notes });
      setOrders(prev =>
        prev.map(o => (o.id === orderId ? { ...o, status: newStatus } : o))
      );
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err?.message || 'Failed to update order status' };
    }
  };

  // Record refund (Manager only)
  const recordRefund = async (
    orderId: string,
    _tokenNumber: number,
    amount: number,
    reason: string,
    refundType: RefundType,
    notes?: string
  ): Promise<{ success: boolean; refund?: RefundRecord; error?: string }> => {
    try {
      const res = await refundsApi.createRefund({
        orderId,
        amount,
        reason,
        refundType,
        notes,
      });

      const newRefund = mapBackendRefund(res.refund);
      setRefunds(prev => [newRefund, ...prev]);
      return { success: true, refund: newRefund };
    } catch (err: any) {
      return { success: false, error: err?.message || 'Failed to record refund' };
    }
  };

  // Verify QR code token (Cashier / Manager)
  const verifyQrToken = async (
    qrToken: string
  ): Promise<{ success: boolean; order?: any; error?: string }> => {
    try {
      const res = await qrApi.verifyQr(qrToken.trim());
      // Refresh orders to reflect qr_used = true
      await refreshOrders();
      return { success: true, order: res.order };
    } catch (err: any) {
      return { success: false, error: err?.message || 'QR verification failed' };
    }
  };

  // Fetch printable bill / KOT
  const fetchOrderBill = async (orderId: string, copyType: 'customer' | 'kitchen' = 'customer') => {
    const res = await ordersApi.getOrderBill(orderId, copyType);
    return res.bill;
  };

  return (
    <OrderContext.Provider
      value={{
        foodItems,
        categories,
        orders,
        refunds,
        activeTokenNumber,
        isLoadingFood,
        isLoadingOrders,
        error,
        refreshFood,
        refreshOrders,
        refreshRefunds,
        toggleFoodAvailability,
        addFoodItem,
        updateFoodItem,
        deleteFoodItem,
        placeOnlineOrder,
        createOfflineOrder,
        updateOrderStatus,
        recordRefund,
        verifyQrToken,
        fetchOrderBill,
      }}
    >
      {children}
    </OrderContext.Provider>
  );
};

export const useOrders = () => {
  const context = useContext(OrderContext);
  if (!context) {
    throw new Error('useOrders must be used within an OrderProvider');
  }
  return context;
};
