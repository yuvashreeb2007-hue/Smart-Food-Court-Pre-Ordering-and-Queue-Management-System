import React, { useState } from 'react';
import { useOrders } from '../../contexts/OrderContext';
import { useAuth } from '../../contexts/AuthContext';
import { FoodItem, Order, RefundType } from '../../types';
import { OrderStatusBadge, PaymentBadge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { FoodFormModal } from '../../components/food/FoodFormModal';
import { BillReceipt } from '../../components/ui/BillReceipt';
import {
  ChefHat,
  TrendingUp,
  ShoppingBag,
  DollarSign,
  Plus,
  Edit2,
  Trash2,
  AlertCircle,
  ShieldCheck,
  Undo2,
  Calendar,
  Layers,
} from 'lucide-react';

export const ManagerDashboard: React.FC = () => {
  const {
    foodItems,
    orders,
    refunds,
    addFoodItem,
    updateFoodItem,
    deleteFoodItem,
    toggleFoodAvailability,
    recordRefund,
  } = useOrders();
  const { currentUser, switchRole, isAuthenticated } = useAuth();

  const [activeTab, setActiveTab] = useState<'catalog' | 'history' | 'refunds'>('catalog');
  const [editingItem, setEditingItem] = useState<FoodItem | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [viewReceiptOrder, setViewReceiptOrder] = useState<Order | null>(null);

  // Refund Modal State
  const [isRefundModalOpen, setIsRefundModalOpen] = useState(false);
  const [refundOrderId, setRefundOrderId] = useState(orders[0]?.id || '');
  const [refundAmount, setRefundAmount] = useState<number>(100);
  const [refundReason, setRefundReason] = useState('');
  const [refundType, setRefundType] = useState<RefundType>('in_person_cash');
  const [refundNotes, setRefundNotes] = useState('Cash returned in person at manager desk.');
  const [isRecordingRefund, setIsRecordingRefund] = useState(false);
  const [refundError, setRefundError] = useState<string | null>(null);

  // History search & date filter
  const [historySearch, setHistorySearch] = useState('');
  const [historyDateFilter, setHistoryDateFilter] = useState('');

  // Authorization Guard
  if (!isAuthenticated || currentUser.role !== 'manager') {
    return (
      <div className="max-w-xl mx-auto px-4 py-16 text-center space-y-4">
        <ChefHat className="w-12 h-12 text-stone-300 mx-auto" />
        <h2 className="text-xl font-bold text-[#242B26]">Staff Access Restricted</h2>
        <p className="text-xs text-[#68716A]">Manager Operational Dashboard requires Food Court Manager credentials.</p>
        <button
          onClick={() => switchRole('manager')}
          className="py-2 px-4 bg-[#244C3A] text-white rounded-lg text-xs font-semibold hover:bg-[#19392B]"
        >
          Authenticate as Seeded Manager
        </button>
      </div>
    );
  }

  // Overview metrics
  const totalRevenue = orders.reduce((sum, o) => (o.paymentStatus === 'paid' ? sum + o.totalAmount : sum), 0);
  const completedOrders = orders.filter(o => o.status === 'completed').length;
  const activeOrders = orders.filter(o => o.status !== 'completed').length;

  // Filter 7-day history
  const filteredHistory = orders.filter(order => {
    const matchesSearch =
      historySearch === '' ||
      order.tokenNumber.toString().includes(historySearch) ||
      order.id.toLowerCase().includes(historySearch.toLowerCase()) ||
      (order.customerName && order.customerName.toLowerCase().includes(historySearch.toLowerCase()));
    const matchesDate = historyDateFilter === '' || order.businessDate === historyDateFilter;
    return matchesSearch && matchesDate;
  });

  const handleOpenAddFood = () => {
    setEditingItem(null);
    setIsFormOpen(true);
  };

  const handleOpenEditFood = (item: FoodItem) => {
    setEditingItem(item);
    setIsFormOpen(true);
  };

  const handleSaveFood = async (foodData: Omit<FoodItem, 'id' | 'internalStockQty'>) => {
    if (editingItem) {
      await updateFoodItem(editingItem.id, foodData);
    } else {
      await addFoodItem(foodData);
    }
  };

  const handleDeleteFood = async (id: string, name: string) => {
    if (window.confirm(`Are you sure you want to delete "${name}" from the menu?`)) {
      await deleteFoodItem(id);
    }
  };

  const handleRecordRefundSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const targetOrder = orders.find(o => o.id === refundOrderId) || orders[0];
    if (!targetOrder) return;
    setRefundError(null);
    setIsRecordingRefund(true);

    const res = await recordRefund(
      targetOrder.id,
      targetOrder.tokenNumber,
      Number(refundAmount),
      refundReason.trim(),
      refundType,
      refundNotes.trim()
    );

    setIsRecordingRefund(false);

    if (res.success) {
      setIsRefundModalOpen(false);
      setRefundReason('');
      setActiveTab('refunds');
    } else {
      setRefundError(res.error || 'Failed to record refund');
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Overview Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-[#E5E7E2] shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs text-[#68716A] uppercase font-semibold">Today's Paid Sales</span>
            <div className="text-2xl font-black text-[#244C3A] mt-1">₹{totalRevenue.toFixed(2)}</div>
            <span className="text-[11px] text-emerald-700">Verified receipts</span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-[#E8F1E9] text-[#244C3A] flex items-center justify-center">
            <DollarSign className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-[#E5E7E2] shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs text-[#68716A] uppercase font-semibold">Total Orders Placed</span>
            <div className="text-2xl font-black text-[#242B26] mt-1">{orders.length}</div>
            <span className="text-[11px] text-[#68716A]">Shared sequence (101+)</span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-800 flex items-center justify-center">
            <ShoppingBag className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-[#E5E7E2] shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs text-[#68716A] uppercase font-semibold">Active Queue</span>
            <div className="text-2xl font-black text-amber-600 mt-1">{activeOrders}</div>
            <span className="text-[11px] text-[#68716A]">Cooking & Ready</span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-amber-50/60 text-amber-700 flex items-center justify-center">
            <TrendingUp className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-[#E5E7E2] shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs text-[#68716A] uppercase font-semibold">Completed Today</span>
            <div className="text-2xl font-black text-emerald-800 mt-1">{completedOrders}</div>
            <span className="text-[11px] text-emerald-600">Collected at counter</span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-800 flex items-center justify-center">
            <ShieldCheck className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Main Tabs Navigation */}
      <div className="flex bg-white p-1.5 rounded-2xl border border-[#E5E7E2] shadow-xs space-x-1">
        <button
          onClick={() => setActiveTab('catalog')}
          className={`flex-1 py-2.5 px-4 rounded-xl text-xs sm:text-sm font-semibold transition-all flex items-center justify-center gap-2 cursor-pointer ${
            activeTab === 'catalog'
              ? 'bg-[#244C3A] text-white shadow-xs'
              : 'text-[#68716A] hover:text-[#242B26] hover:bg-stone-50'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>Food Catalog & Availability ({foodItems.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('history')}
          className={`flex-1 py-2.5 px-4 rounded-xl text-xs sm:text-sm font-semibold transition-all flex items-center justify-center gap-2 cursor-pointer ${
            activeTab === 'history'
              ? 'bg-[#244C3A] text-white shadow-xs'
              : 'text-[#68716A] hover:text-[#242B26] hover:bg-stone-50'
          }`}
        >
          <Calendar className="w-4 h-4" />
          <span>7-Day Rolling Order History</span>
        </button>

        <button
          onClick={() => setActiveTab('refunds')}
          className={`flex-1 py-2.5 px-4 rounded-xl text-xs sm:text-sm font-semibold transition-all flex items-center justify-center gap-2 cursor-pointer ${
            activeTab === 'refunds'
              ? 'bg-[#244C3A] text-white shadow-xs'
              : 'text-[#68716A] hover:text-[#242B26] hover:bg-stone-50'
          }`}
        >
          <Undo2 className="w-4 h-4" />
          <span>Refund Records & Audits ({refunds.length})</span>
        </button>
      </div>

      {/* TAB 1: FOOD CATALOG MANAGEMENT */}
      {activeTab === 'catalog' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-[#E5E7E2]">
            <div>
              <h3 className="text-base font-bold text-[#242B26]">Dishes & Food Menu Catalog</h3>
              <p className="text-xs text-[#68716A]">
                Create new dishes, upload photos from your device, or toggle immediate availability.
              </p>
            </div>

            <Button
              variant="primary"
              size="sm"
              icon={<Plus className="w-4 h-4" />}
              onClick={handleOpenAddFood}
            >
              Add New Food Item
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {foodItems.map(item => (
              <div
                key={item.id}
                className="bg-white rounded-2xl border border-[#E5E7E2] p-4 shadow-xs flex flex-col justify-between space-y-4"
              >
                <div>
                  <div className="relative rounded-xl overflow-hidden mb-3 border border-[#E5E7E2]">
                    <img
                      src={item.image}
                      alt={item.name}
                      className="w-full h-36 object-cover"
                    />
                    <div className="absolute top-2 right-2">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full shadow-xs ${
                        item.isAvailable ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {item.isAvailable ? 'Available' : 'Unavailable'}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <span className="text-[10px] font-semibold text-[#68716A] uppercase tracking-wider block">
                      {item.categoryName}
                    </span>
                    <h4 className="text-sm font-bold text-[#242B26] truncate">{item.name}</h4>
                    <p className="text-xs text-[#68716A] line-clamp-2">{item.description}</p>
                    <div className="flex items-center justify-between pt-2">
                      <span className="text-sm font-black text-[#244C3A]">₹{item.price.toFixed(2)}</span>
                      <span className="text-[11px] text-[#68716A]">{item.preparationTimeMinutes} min prep</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-[#E5E7E2] gap-2">
                  <button
                    onClick={() => toggleFoodAvailability(item.id)}
                    className="flex-1 py-1 px-2 text-xs font-semibold rounded-lg border border-[#E5E7E2] hover:bg-stone-50 text-[#68716A] cursor-pointer"
                  >
                    {item.isAvailable ? 'Mark Sold Out' : 'Mark Available'}
                  </button>

                  <button
                    onClick={() => handleOpenEditFood(item)}
                    className="p-1.5 rounded-lg border border-[#E5E7E2] hover:bg-stone-50 text-stone-700 cursor-pointer"
                    title="Edit dish details"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>

                  <button
                    onClick={() => handleDeleteFood(item.id, item.name)}
                    className="p-1.5 rounded-lg border border-red-200 hover:bg-red-50 text-red-600 cursor-pointer"
                    title="Soft delete dish"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 2: 7-DAY ROLLING ORDER HISTORY */}
      {activeTab === 'history' && (
        <div className="bg-white p-6 rounded-3xl border border-[#E5E7E2] shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-[#E5E7E2] gap-3">
            <div>
              <h3 className="text-base font-bold text-[#242B26]">7-Day Rolling History</h3>
              <p className="text-xs text-[#68716A]">
                Comprehensive audit trail of online & counter meals, printable tickets, and payment states.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <input
                type="text"
                value={historySearch}
                onChange={e => setHistorySearch(e.target.value)}
                placeholder="Search token or name..."
                className="px-3 py-1.5 text-xs rounded-lg border border-[#E5E7E2] focus:outline-none focus:ring-2 focus:ring-[#244C3A]"
              />
              <input
                type="date"
                value={historyDateFilter}
                onChange={e => setHistoryDateFilter(e.target.value)}
                className="px-3 py-1.5 text-xs rounded-lg border border-[#E5E7E2] focus:outline-none focus:ring-2 focus:ring-[#244C3A] bg-white"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-[#FAF8F3] text-[#68716A] uppercase font-bold text-[10px]">
                <tr>
                  <th className="p-3">Token #</th>
                  <th className="p-3">Date</th>
                  <th className="p-3">Customer</th>
                  <th className="p-3">Type</th>
                  <th className="p-3">Total</th>
                  <th className="p-3">Payment</th>
                  <th className="p-3">Status</th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5E7E2]">
                {filteredHistory.map(o => (
                  <tr key={o.id} className="hover:bg-stone-50/60">
                    <td className="p-3 font-bold text-[#244C3A]">#{o.tokenNumber}</td>
                    <td className="p-3 text-[#68716A]">{o.businessDate}</td>
                    <td className="p-3 font-medium text-[#242B26]">{o.customerName}</td>
                    <td className="p-3 uppercase text-[10px] text-[#68716A]">{o.orderType}</td>
                    <td className="p-3 font-bold text-[#242B26]">₹{o.totalAmount.toFixed(2)}</td>
                    <td className="p-3"><PaymentBadge status={o.paymentStatus} /></td>
                    <td className="p-3"><OrderStatusBadge status={o.status} size="sm" /></td>
                    <td className="p-3 text-right">
                      <button
                        onClick={() => setViewReceiptOrder(o)}
                        className="py-1 px-2 text-[11px] font-semibold rounded-lg border border-[#E5E7E2] hover:bg-stone-50 text-[#68716A] cursor-pointer"
                      >
                        Receipt Slip
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: REFUND MANAGEMENT */}
      {activeTab === 'refunds' && (
        <div className="bg-white p-6 rounded-3xl border border-[#E5E7E2] shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-[#E5E7E2] gap-3">
            <div>
              <h3 className="text-base font-bold text-[#242B26]">Manager Refund Records</h3>
              <p className="text-xs text-[#68716A]">
                Record in-person cash desk returns or track electronic payment reversals with an audit trail.
              </p>
            </div>

            <Button
              variant="primary"
              size="sm"
              icon={<Plus className="w-4 h-4" />}
              onClick={() => {
                if (orders.length > 0) {
                  setRefundOrderId(orders[0].id);
                  setRefundAmount(orders[0].totalAmount);
                }
                setRefundError(null);
                setIsRefundModalOpen(true);
              }}
            >
              Record New Refund
            </Button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-[#FAF8F3] text-[#68716A] uppercase font-bold text-[10px]">
                <tr>
                  <th className="p-3">Token #</th>
                  <th className="p-3">Amount</th>
                  <th className="p-3">Type</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Reason</th>
                  <th className="p-3">Audit Notes</th>
                  <th className="p-3">Authorized By</th>
                  <th className="p-3">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5E7E2]">
                {refunds.map(r => (
                  <tr key={r.id} className="hover:bg-stone-50/60">
                    <td className="p-3 font-bold text-[#244C3A]">#{r.tokenNumber}</td>
                    <td className="p-3 font-bold text-red-600">₹{r.amount.toFixed(2)}</td>
                    <td className="p-3">
                      <span className="capitalize px-2 py-0.5 rounded text-[10px] font-semibold bg-stone-100 text-stone-700">
                        {r.refundType.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="p-3">
                      <span className="capitalize px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-800">
                        {r.status}
                      </span>
                    </td>
                    <td className="p-3 text-[#242B26] max-w-xs truncate">{r.reason}</td>
                    <td className="p-3 text-[#68716A] max-w-xs truncate">{r.notes || '—'}</td>
                    <td className="p-3 text-[#68716A]">{r.managerName || 'Manager'}</td>
                    <td className="p-3 text-[#68716A] whitespace-nowrap">
                      {new Date(r.createdAt).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Food Form Modal */}
      <FoodFormModal
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        foodItem={editingItem}
        onSave={handleSaveFood}
      />

      {/* Record Refund Modal */}
      <Modal
        isOpen={isRefundModalOpen}
        onClose={() => setIsRefundModalOpen(false)}
        title="Record Refund Transaction"
        maxWidth="md"
      >
        <form onSubmit={handleRecordRefundSubmit} className="space-y-4">
          {refundError && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
              <span>{refundError}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-[#242B26] mb-1">
              Select Target Order <span className="text-red-500">*</span>
            </label>
            <select
              value={refundOrderId}
              onChange={e => {
                setRefundOrderId(e.target.value);
                const ord = orders.find(o => o.id === e.target.value);
                if (ord) setRefundAmount(ord.totalAmount);
              }}
              className="w-full px-3 py-2 text-xs rounded-lg border border-[#E5E7E2] bg-white focus:outline-none focus:ring-2 focus:ring-[#244C3A]"
            >
              {orders.map(o => (
                <option key={o.id} value={o.id}>
                  Token #{o.tokenNumber} • {o.customerName || 'Walk-in'} (₹{o.totalAmount})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#242B26] mb-1">
              Refund Amount (INR ₹) <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              min="1"
              step="any"
              required
              value={refundAmount}
              onChange={e => setRefundAmount(Number(e.target.value))}
              className="w-full px-3 py-2 text-xs rounded-lg border border-[#E5E7E2] focus:outline-none focus:ring-2 focus:ring-[#244C3A]"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#242B26] mb-1">
              Reason for Refund <span className="text-red-500">*</span>
            </label>
            <textarea
              required
              rows={2}
              value={refundReason}
              onChange={e => setRefundReason(e.target.value)}
              placeholder="e.g. Accidental double order / student item return..."
              className="w-full px-3 py-2 text-xs rounded-lg border border-[#E5E7E2] focus:outline-none focus:ring-2 focus:ring-[#244C3A]"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#242B26] mb-1">
              Refund Method
            </label>
            <select
              value={refundType}
              onChange={e => setRefundType(e.target.value as RefundType)}
              className="w-full px-3 py-2 text-xs rounded-lg border border-[#E5E7E2] bg-white focus:outline-none focus:ring-2 focus:ring-[#244C3A]"
            >
              <option value="in_person_cash">In-Person Cash Return (Desk counter)</option>
              <option value="electronic">Electronic Gateway Refund (Requires API verification)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#242B26] mb-1">
              Audit Notes
            </label>
            <input
              type="text"
              value={refundNotes}
              onChange={e => setRefundNotes(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-lg border border-[#E5E7E2] focus:outline-none focus:ring-2 focus:ring-[#244C3A]"
            />
          </div>

          <div className="pt-3 border-t border-[#E5E7E2] flex items-center justify-end gap-3">
            <Button type="button" variant="outline" size="sm" onClick={() => setIsRefundModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="sm" disabled={isRecordingRefund}>
              {isRecordingRefund ? 'Recording...' : 'Confirm & Record Audit'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Bill Receipt Modal */}
      <Modal
        isOpen={!!viewReceiptOrder}
        onClose={() => setViewReceiptOrder(null)}
        maxWidth="md"
      >
        {viewReceiptOrder && (
          <BillReceipt order={viewReceiptOrder} copyType="customer" />
        )}
      </Modal>
    </div>
  );
};
