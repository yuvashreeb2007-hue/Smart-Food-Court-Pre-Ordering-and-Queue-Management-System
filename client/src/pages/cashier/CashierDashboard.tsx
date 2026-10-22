import React, { useState } from 'react';
import { useOrders } from '../../contexts/OrderContext';
import { useAuth, SEEDED_CREDENTIALS } from '../../contexts/AuthContext';
import { Order, OrderStatus, FoodItem, PaymentMethod } from '../../types';
import { OrderStatusBadge, PaymentBadge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { BillReceipt } from '../../components/ui/BillReceipt';
import {
  Store,
  Clock,
  Printer,
  Search,
  Plus,
  Minus,
  CheckCircle2,
  AlertTriangle,
  Layers,
  ShoppingBag,
  Trash2,
  QrCode,
  ShieldCheck,
  AlertCircle,
} from 'lucide-react';

export const CashierDashboard: React.FC = () => {
  const { currentUser, switchRole, isAuthenticated } = useAuth();
  const {
    orders,
    foodItems,
    activeTokenNumber,
    updateOrderStatus,
    createOfflineOrder,
    toggleFoodAvailability,
    verifyQrToken,
  } = useOrders();

  const [activeTab, setActiveTab] = useState<'queue' | 'counter-order' | 'availability' | 'qr-verify'>('queue');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [tokenSearch, setTokenSearch] = useState('');
  const [activeReceipt, setActiveReceipt] = useState<{ order: Order; type: 'customer' | 'kitchen' } | null>(null);
  const [statusError, setStatusError] = useState<string | null>(null);

  // Offline order state
  const [offlineCart, setOfflineCart] = useState<{ foodItem: FoodItem; quantity: number }[]>([]);
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
  const [isSubmittingOffline, setIsSubmittingOffline] = useState(false);
  const [offlineError, setOfflineError] = useState<string | null>(null);

  // QR Verification State
  const [qrInput, setQrInput] = useState('');
  const [qrResult, setQrResult] = useState<any>(null);
  const [qrError, setQrError] = useState<string | null>(null);
  const [isVerifyingQr, setIsVerifyingQr] = useState(false);

  // Authorization Guard
  if (!isAuthenticated || (currentUser.role !== 'cashier' && currentUser.role !== 'manager')) {
    return (
      <div className="max-w-xl mx-auto px-4 py-16 text-center space-y-4">
        <Store className="w-12 h-12 text-stone-300 mx-auto" />
        <h2 className="text-xl font-bold text-[#242B26]">Staff Access Restricted</h2>
        <p className="text-xs text-[#68716A]">Cashier Counter Terminal requires Cashier or Manager credentials.</p>
        <button
          onClick={() => switchRole('cashier')}
          className="py-2 px-4 bg-[#244C3A] text-white rounded-lg text-xs font-semibold hover:bg-[#19392B]"
        >
          Authenticate as Seeded Cashier
        </button>
      </div>
    );
  }

  // Filter orders
  const filteredOrders = orders.filter(order => {
    const matchesStatus = statusFilter === 'all' || order.status === statusFilter;
    const matchesSearch =
      tokenSearch === '' ||
      order.tokenNumber.toString().includes(tokenSearch) ||
      order.id.toLowerCase().includes(tokenSearch.toLowerCase()) ||
      (order.customerName && order.customerName.toLowerCase().includes(tokenSearch.toLowerCase()));
    return matchesStatus && matchesSearch;
  });

  // Offline cart operations
  const addToOfflineCart = (item: FoodItem) => {
    if (!item.isAvailable) {
      alert(`"${item.name}" is currently unavailable.`);
      return;
    }
    setOfflineCart(prev => {
      const existing = prev.find(i => i.foodItem.id === item.id);
      if (existing) {
        return prev.map(i =>
          i.foodItem.id === item.id ? { ...i, quantity: i.quantity + 1 } : i
        );
      }
      return [...prev, { foodItem: item, quantity: 1 }];
    });
  };

  const updateOfflineQty = (itemId: string, qty: number) => {
    if (qty <= 0) {
      setOfflineCart(prev => prev.filter(i => i.foodItem.id !== itemId));
    } else {
      setOfflineCart(prev =>
        prev.map(i => (i.foodItem.id === itemId ? { ...i, quantity: qty } : i))
      );
    }
  };

  const offlineTotal = offlineCart.reduce((sum, i) => sum + i.foodItem.price * i.quantity, 0);

  const handleCreateOfflineOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (offlineCart.length === 0) return;
    setOfflineError(null);
    setIsSubmittingOffline(true);

    const res = await createOfflineOrder(
      offlineCart,
      paymentMethod,
      customerName.trim() || 'Counter Walk-in',
      customerPhone.trim() || undefined
    );

    setIsSubmittingOffline(false);

    if (res.success && res.order) {
      setOfflineCart([]);
      setCustomerName('');
      setCustomerPhone('');
      setActiveReceipt({ order: res.order, type: 'customer' });
      setActiveTab('queue');
    } else {
      setOfflineError(res.error || 'Failed to place counter order');
    }
  };

  const handleStatusChange = async (orderId: string, nextStatus: OrderStatus) => {
    setStatusError(null);
    const result = await updateOrderStatus(orderId, nextStatus);
    if (!result.success && result.error) {
      setStatusError(result.error);
    }
  };

  const handleVerifyQr = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!qrInput.trim()) return;
    setQrError(null);
    setQrResult(null);
    setIsVerifyingQr(true);

    const res = await verifyQrToken(qrInput.trim());
    setIsVerifyingQr(false);

    if (res.success && res.order) {
      setQrResult(res.order);
      setQrInput('');
    } else {
      setQrError(res.error || 'QR Verification failed. Token must be for an order in READY status.');
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Header & Stats Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-[#E5E7E2] shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-[#E8F1E9] text-[#244C3A]">
              <Store className="w-5 h-5" />
            </span>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-[#242B26]">
                Cashier Counter Terminal
              </h1>
              <span className="text-xs text-[#68716A]">
                College Food Court • Central Order & Token Processing
              </span>
            </div>
          </div>
        </div>

        {/* Live Token Sequence Indicator */}
        <div className="flex items-center gap-4 bg-[#FAF8F3] px-5 py-3 rounded-2xl border border-[#E5E7E2]">
          <div className="text-right">
            <span className="text-[10px] uppercase font-bold text-[#68716A] block">
              Next Daily Token
            </span>
            <span className="text-xs text-[#68716A]">Starts at 101 Daily</span>
          </div>
          <div className="text-3xl font-black text-[#244C3A] tracking-wider pl-3 border-l border-[#E5E7E2]">
            #{activeTokenNumber}
          </div>
        </div>
      </div>

      {/* Error alert if payment block triggers */}
      {statusError && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-2xl flex items-start justify-between gap-3 text-xs text-red-800">
          <div className="flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
            <span>{statusError}</span>
          </div>
          <button
            onClick={() => setStatusError(null)}
            className="text-red-500 hover:text-red-700 font-bold"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Main Tabs */}
      <div className="flex flex-wrap bg-white p-1.5 rounded-2xl border border-[#E5E7E2] shadow-xs gap-1">
        <button
          onClick={() => setActiveTab('queue')}
          className={`flex-1 min-w-[130px] py-2.5 px-3 rounded-xl text-xs sm:text-sm font-semibold transition-all flex items-center justify-center gap-2 cursor-pointer ${
            activeTab === 'queue'
              ? 'bg-[#244C3A] text-white shadow-xs'
              : 'text-[#68716A] hover:text-[#242B26] hover:bg-stone-50'
          }`}
        >
          <Clock className="w-4 h-4" />
          <span>Live Queue ({orders.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('counter-order')}
          className={`flex-1 min-w-[150px] py-2.5 px-3 rounded-xl text-xs sm:text-sm font-semibold transition-all flex items-center justify-center gap-2 cursor-pointer ${
            activeTab === 'counter-order'
              ? 'bg-[#244C3A] text-white shadow-xs'
              : 'text-[#68716A] hover:text-[#242B26] hover:bg-stone-50'
          }`}
        >
          <Plus className="w-4 h-4" />
          <span>New Counter Order</span>
        </button>

        <button
          onClick={() => setActiveTab('availability')}
          className={`flex-1 min-w-[140px] py-2.5 px-3 rounded-xl text-xs sm:text-sm font-semibold transition-all flex items-center justify-center gap-2 cursor-pointer ${
            activeTab === 'availability'
              ? 'bg-[#244C3A] text-white shadow-xs'
              : 'text-[#68716A] hover:text-[#242B26] hover:bg-stone-50'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>Availability Toggle</span>
        </button>

        <button
          onClick={() => setActiveTab('qr-verify')}
          className={`flex-1 min-w-[140px] py-2.5 px-3 rounded-xl text-xs sm:text-sm font-semibold transition-all flex items-center justify-center gap-2 cursor-pointer ${
            activeTab === 'qr-verify'
              ? 'bg-[#244C3A] text-white shadow-xs'
              : 'text-[#68716A] hover:text-[#242B26] hover:bg-stone-50'
          }`}
        >
          <QrCode className="w-4 h-4" />
          <span>QR Verification</span>
        </button>
      </div>

      {/* TAB 1: LIVE ORDER QUEUE */}
      {activeTab === 'queue' && (
        <div className="space-y-4">
          {/* Filters & Search */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-[#E5E7E2]">
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
              {['all', 'ordered', 'preparing', 'ready', 'completed'].map(st => (
                <button
                  key={st}
                  onClick={() => setStatusFilter(st)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize whitespace-nowrap transition-all cursor-pointer ${
                    statusFilter === st
                      ? 'bg-[#244C3A] text-white'
                      : 'text-[#68716A] hover:bg-stone-100'
                  }`}
                >
                  {st}
                </button>
              ))}
            </div>

            <div className="relative w-full sm:w-64">
              <Search className="w-3.5 h-3.5 text-[#68716A] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={tokenSearch}
                onChange={e => setTokenSearch(e.target.value)}
                placeholder="Search token # or ref..."
                className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-[#E5E7E2] focus:outline-none focus:ring-2 focus:ring-[#244C3A]"
              />
            </div>
          </div>

          {/* Orders Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredOrders.map(order => (
              <div
                key={order.id}
                className="bg-white rounded-2xl border border-[#E5E7E2] p-5 shadow-xs flex flex-col justify-between space-y-4"
              >
                <div>
                  {/* Top Bar: Token & Type */}
                  <div className="flex items-center justify-between pb-3 border-b border-[#E5E7E2]">
                    <div className="flex items-center gap-2">
                      <span className="text-xl font-black text-[#244C3A]">
                        #{order.tokenNumber}
                      </span>
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-[#FAF8F3] border border-[#E5E7E2] text-[#68716A]">
                        {order.orderType}
                      </span>
                    </div>
                    <OrderStatusBadge status={order.status} size="sm" />
                  </div>

                  {/* Customer & Timestamp */}
                  <div className="pt-2 text-xs space-y-0.5 text-[#68716A]">
                    <div className="flex justify-between text-[#242B26] font-medium">
                      <span>{order.customerName || 'Walk-in Guest'}</span>
                      <span className="font-bold text-[#244C3A]">₹{order.totalAmount.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-[11px]">
                      <span>{new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      <PaymentBadge status={order.paymentStatus} />
                    </div>
                  </div>

                  {/* Items List */}
                  <div className="mt-3 p-2.5 rounded-xl bg-[#FAF8F3] border border-[#E5E7E2] space-y-1 max-h-32 overflow-y-auto">
                    {order.items.map(item => (
                      <div key={item.id} className="flex justify-between text-xs">
                        <span className="text-[#242B26] truncate pr-2">
                          <strong>{item.quantity}×</strong> {item.foodName}
                        </span>
                        <span className="text-stone-500 font-mono">₹{item.lineTotal}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Actions & Status Updates */}
                <div className="space-y-2 pt-2 border-t border-[#E5E7E2]">
                  {/* Status Progress Actions */}
                  <div className="grid grid-cols-3 gap-1.5 text-xs font-semibold">
                    <button
                      onClick={() => handleStatusChange(order.id, 'preparing')}
                      disabled={order.status === 'preparing' || order.status === 'completed'}
                      className="py-1 px-1.5 rounded-lg border border-amber-300 bg-amber-50 text-amber-900 hover:bg-amber-100 disabled:opacity-40 text-center cursor-pointer"
                    >
                      Cook
                    </button>
                    <button
                      onClick={() => handleStatusChange(order.id, 'ready')}
                      disabled={order.status === 'ready' || order.status === 'completed'}
                      className="py-1 px-1.5 rounded-lg border border-emerald-300 bg-emerald-50 text-emerald-900 hover:bg-emerald-100 disabled:opacity-40 text-center cursor-pointer"
                    >
                      Ready
                    </button>
                    <button
                      onClick={() => handleStatusChange(order.id, 'completed')}
                      disabled={order.status === 'completed'}
                      className="py-1 px-1.5 rounded-lg border border-stone-300 bg-stone-100 text-stone-800 hover:bg-stone-200 disabled:opacity-40 text-center cursor-pointer"
                    >
                      Done
                    </button>
                  </div>

                  {/* Print Actions */}
                  <div className="flex items-center justify-between gap-2 pt-1">
                    <button
                      onClick={() => setActiveReceipt({ order, type: 'kitchen' })}
                      className="flex-1 py-1 px-2 text-[11px] font-semibold rounded-lg border border-[#E5E7E2] hover:bg-stone-50 text-[#68716A] flex items-center justify-center gap-1 cursor-pointer"
                    >
                      <Printer className="w-3 h-3" /> Kitchen KOT
                    </button>
                    <button
                      onClick={() => setActiveReceipt({ order, type: 'customer' })}
                      className="flex-1 py-1 px-2 text-[11px] font-semibold rounded-lg border border-[#E5E7E2] hover:bg-stone-50 text-[#68716A] flex items-center justify-center gap-1 cursor-pointer"
                    >
                      <Printer className="w-3 h-3" /> Customer Slip
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 2: NEW COUNTER OFFLINE ORDER */}
      {activeTab === 'counter-order' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Food Menu Selection Grid */}
          <div className="lg:col-span-7 bg-white p-6 rounded-3xl border border-[#E5E7E2] shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#E5E7E2]">
              <div>
                <h3 className="text-base font-bold text-[#242B26]">Select Dishes for Walk-in</h3>
                <span className="text-xs text-[#68716A]">Click any item to add to counter cart</span>
              </div>
              <span className="text-xs font-semibold text-[#244C3A] bg-[#E8F1E9] px-2.5 py-1 rounded-lg">
                Counter Shared Token: #{activeTokenNumber}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[500px] overflow-y-auto pr-1">
              {foodItems.map(item => (
                <div
                  key={item.id}
                  onClick={() => addToOfflineCart(item)}
                  className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center gap-3 ${
                    item.isAvailable
                      ? 'border-[#E5E7E2] hover:border-[#244C3A] bg-[#FAF8F3]/40 hover:bg-[#FAF8F3]'
                      : 'border-red-200 bg-red-50/40 opacity-60 cursor-not-allowed'
                  }`}
                >
                  <img
                    src={item.image}
                    alt={item.name}
                    className="w-12 h-12 rounded-lg object-cover border border-[#E5E7E2] shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <span className="text-xs font-semibold text-[#242B26] block truncate">
                      {item.name}
                    </span>
                    <span className="text-xs font-bold text-[#244C3A]">₹{item.price}</span>
                  </div>
                  <div className="shrink-0">
                    {item.isAvailable ? (
                      <span className="p-1 rounded bg-[#244C3A] text-white flex items-center justify-center">
                        <Plus className="w-3.5 h-3.5" />
                      </span>
                    ) : (
                      <span className="text-[10px] text-red-600 font-bold">Sold</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Counter Cart & Checkout Form */}
          <div className="lg:col-span-5 bg-white p-6 rounded-3xl border border-[#E5E7E2] shadow-xs space-y-5">
            <h3 className="text-base font-bold text-[#242B26] pb-3 border-b border-[#E5E7E2] flex items-center justify-between">
              <span>Counter Bill Summary</span>
              <span className="text-xs text-[#68716A]">{offlineCart.length} items</span>
            </h3>

            {offlineError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                <span>{offlineError}</span>
              </div>
            )}

            {/* Offline Cart Items */}
            <div className="space-y-2.5 max-h-56 overflow-y-auto pr-1">
              {offlineCart.length === 0 ? (
                <div className="text-center py-8 text-xs text-[#68716A]">
                  No items added yet. Click dishes on the left to add.
                </div>
              ) : (
                offlineCart.map(({ foodItem, quantity }) => (
                  <div
                    key={foodItem.id}
                    className="flex items-center justify-between p-2 rounded-lg bg-[#FAF8F3] border border-[#E5E7E2] text-xs"
                  >
                    <div className="flex-1 min-w-0 pr-2">
                      <span className="font-semibold text-[#242B26] block truncate">
                        {foodItem.name}
                      </span>
                      <span className="text-[11px] text-[#68716A]">₹{foodItem.price} each</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="flex items-center border border-[#E5E7E2] rounded-md bg-white">
                        <button
                          type="button"
                          onClick={() => updateOfflineQty(foodItem.id, quantity - 1)}
                          className="px-1.5 py-0.5 text-stone-600 hover:bg-stone-100"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="px-2 font-bold text-xs">{quantity}</span>
                        <button
                          type="button"
                          onClick={() => updateOfflineQty(foodItem.id, quantity + 1)}
                          className="px-1.5 py-0.5 text-stone-600 hover:bg-stone-100"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>
                      <span className="font-bold text-[#242B26] w-12 text-right">
                        ₹{foodItem.price * quantity}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Total and Form Fields */}
            <form onSubmit={handleCreateOfflineOrder} className="space-y-4 pt-4 border-t border-[#E5E7E2]">
              <div className="flex justify-between items-center text-lg font-extrabold text-[#242B26]">
                <span>Total Due:</span>
                <span className="text-[#244C3A]">₹{offlineTotal.toFixed(2)}</span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#242B26] mb-1">
                  Payment Method Collected
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(['cash', 'card', 'upi'] as PaymentMethod[]).map(pm => (
                    <button
                      key={pm}
                      type="button"
                      onClick={() => setPaymentMethod(pm)}
                      className={`py-1.5 text-xs font-semibold uppercase rounded-lg border text-center transition-all cursor-pointer ${
                        paymentMethod === pm
                          ? 'bg-[#244C3A] text-white border-[#244C3A]'
                          : 'bg-white text-[#242B26] border-[#E5E7E2] hover:bg-stone-50'
                      }`}
                    >
                      {pm}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#242B26] mb-1">
                    Customer Name
                  </label>
                  <input
                    type="text"
                    value={customerName}
                    onChange={e => setCustomerName(e.target.value)}
                    placeholder="Walk-in Student"
                    className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-[#E5E7E2] focus:outline-none focus:ring-2 focus:ring-[#244C3A]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#242B26] mb-1">
                    Phone (Optional)
                  </label>
                  <input
                    type="tel"
                    value={customerPhone}
                    onChange={e => setCustomerPhone(e.target.value)}
                    placeholder="+91..."
                    className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-[#E5E7E2] focus:outline-none focus:ring-2 focus:ring-[#244C3A]"
                  />
                </div>
              </div>

              <Button
                type="submit"
                variant="primary"
                size="lg"
                fullWidth
                disabled={offlineCart.length === 0 || isSubmittingOffline}
                icon={<Printer className="w-4 h-4" />}
              >
                {isSubmittingOffline ? 'Processing Order...' : `Confirm & Print Slip (₹${offlineTotal})`}
              </Button>
            </form>
          </div>
        </div>
      )}

      {/* TAB 3: FOOD AVAILABILITY QUICK TOGGLE */}
      {activeTab === 'availability' && (
        <div className="bg-white p-6 rounded-3xl border border-[#E5E7E2] shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-[#E5E7E2] gap-2">
            <div>
              <h3 className="text-base font-bold text-[#242B26]">
                Instant Item Availability Switch
              </h3>
              <p className="text-xs text-[#68716A]">
                Toggle sold-out items instantly. When toggled OFF, customers cannot add the dish to their cart.
              </p>
            </div>
            <div className="p-2.5 bg-amber-50 rounded-xl border border-amber-200 text-[11px] text-amber-900">
              🛡️ Note: Stock counts are protected in backend transactions and strictly hidden from this UI.
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-2">
            {foodItems.map(item => (
              <div
                key={item.id}
                className="p-4 rounded-2xl border border-[#E5E7E2] bg-[#FAF8F3]/50 flex items-center justify-between gap-3"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <img
                    src={item.image}
                    alt={item.name}
                    className="w-12 h-12 rounded-xl object-cover border border-[#E5E7E2] shrink-0"
                  />
                  <div className="min-w-0">
                    <span className="text-xs font-bold text-[#242B26] block truncate">
                      {item.name}
                    </span>
                    <span className="text-[11px] text-[#68716A]">{item.categoryName} • ₹{item.price}</span>
                  </div>
                </div>

                <div className="flex flex-col items-end gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={() => toggleFoodAvailability(item.id)}
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-[#244C3A] ${
                      item.isAvailable ? 'bg-[#244C3A]' : 'bg-stone-300'
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                        item.isAvailable ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                  <span className="text-[10px] font-semibold">
                    {item.isAvailable ? (
                      <span className="text-emerald-700">Available</span>
                    ) : (
                      <span className="text-red-700">Sold Out</span>
                    )}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 4: QR CODE VERIFICATION */}
      {activeTab === 'qr-verify' && (
        <div className="max-w-2xl mx-auto bg-white p-6 rounded-3xl border border-[#E5E7E2] shadow-xs space-y-5">
          <div className="text-center space-y-1 pb-4 border-b border-[#E5E7E2]">
            <div className="w-12 h-12 bg-[#E8F1E9] text-[#244C3A] rounded-2xl flex items-center justify-center mx-auto mb-2">
              <QrCode className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-[#242B26]">Counter QR Token Verification</h3>
            <p className="text-xs text-[#68716A]">
              Paste or scan the customer's pickup QR verification token to confirm and complete the order
            </p>
          </div>

          {qrError && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
              <span>{qrError}</span>
            </div>
          )}

          {qrResult && (
            <div className="p-5 bg-emerald-50 border border-emerald-200 rounded-2xl text-xs text-emerald-900 space-y-2">
              <div className="flex items-center gap-2 font-bold text-sm text-emerald-950">
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                <span>Token Verified & Collected Successfully!</span>
              </div>
              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-emerald-200 text-xs">
                <div>Daily Token: <strong className="text-base text-emerald-900">#{qrResult.token_number}</strong></div>
                <div>Status: <strong className="uppercase">{qrResult.status}</strong></div>
                <div>Customer: <strong>{qrResult.customer_name || 'Customer'}</strong></div>
                <div>Total Amount: <strong>₹{qrResult.total_amount}</strong></div>
              </div>
            </div>
          )}

          <form onSubmit={handleVerifyQr} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-[#242B26] mb-1">
                Enter or Paste Customer QR Token (UUID)
              </label>
              <input
                type="text"
                required
                value={qrInput}
                onChange={e => setQrInput(e.target.value)}
                placeholder="e.g. 1a2b3c4d-5678-..."
                className="w-full px-3 py-2 text-xs font-mono rounded-lg border border-[#E5E7E2] focus:outline-none focus:ring-2 focus:ring-[#244C3A]"
              />
            </div>

            <Button
              type="submit"
              variant="primary"
              size="lg"
              fullWidth
              disabled={isVerifyingQr || !qrInput.trim()}
              icon={<ShieldCheck className="w-4 h-4" />}
            >
              {isVerifyingQr ? 'Verifying with Backend...' : 'Verify Token & Complete Pickup'}
            </Button>
          </form>
        </div>
      )}

      {/* Bill Receipt Modal */}
      <Modal
        isOpen={!!activeReceipt}
        onClose={() => setActiveReceipt(null)}
        maxWidth="md"
      >
        {activeReceipt && (
          <BillReceipt order={activeReceipt.order} copyType={activeReceipt.type} />
        )}
      </Modal>
    </div>
  );
};
