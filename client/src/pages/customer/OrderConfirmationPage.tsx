import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useOrders } from '../../contexts/OrderContext';
import { Order, OrderItem } from '../../types';
import { QRDisplay } from '../../components/ui/QRDisplay';
import { BillReceipt } from '../../components/ui/BillReceipt';
import { Modal } from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';
import { OrderStatusBadge, PaymentBadge } from '../../components/ui/Badge';
import {
  CheckCircle2,
  Clock,
  ArrowRight,
  ShieldCheck,
  FileText,
  Loader2,
} from 'lucide-react';
import { ordersApi } from '../../services/api';

export const OrderConfirmationPage: React.FC = () => {
  const { orderId } = useParams<{ orderId: string }>();
  const { orders } = useOrders();
  const [showBillModal, setShowBillModal] = useState(false);
  const [fetchedOrder, setFetchedOrder] = useState<Order | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Find order in context or from direct fetch
  const order = orders.find(o => o.id === orderId) || fetchedOrder || orders[0];

  useEffect(() => {
    if (orderId && !orders.find(o => o.id === orderId)) {
      setIsLoading(true);
      ordersApi.getOrderById(orderId)
        .then(res => {
          const o = res.order;
          setFetchedOrder({
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
          });
        })
        .catch(() => {})
        .finally(() => setIsLoading(false));
    }
  }, [orderId, orders]);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-3">
        <Loader2 className="w-8 h-8 text-[#244C3A] animate-spin" />
        <p className="text-xs text-[#68716A]">Fetching order details from backend...</p>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="max-w-xl mx-auto px-4 py-16 text-center space-y-4">
        <h2 className="text-xl font-bold text-[#242B26]">Order Not Found</h2>
        <p className="text-xs text-[#68716A]">We couldn't locate this order reference.</p>
        <Link to="/menu">
          <Button variant="primary">Return to Menu</Button>
        </Link>
      </div>
    );
  }

  // Steps for timeline
  const steps: { key: string; label: string; desc: string }[] = [
    { key: 'ordered', label: 'Ordered', desc: 'Received in queue' },
    { key: 'preparing', label: 'Preparing', desc: 'Kitchen is cooking' },
    { key: 'ready', label: 'Ready', desc: 'Ready at pickup counter' },
    { key: 'completed', label: 'Completed', desc: 'Collected & closed' },
  ];

  const getStepIndex = (status: string) => {
    switch (status) {
      case 'ordered': return 0;
      case 'preparing': return 1;
      case 'ready': return 2;
      case 'completed': return 3;
      default: return 0;
    }
  };

  const currentStepIdx = getStepIndex(order.status);

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Success Banner */}
      <div className="bg-[#E8F1E9] p-6 rounded-3xl border border-[#244C3A]/20 text-center space-y-2">
        <div className="w-12 h-12 bg-[#244C3A] text-white rounded-full flex items-center justify-center mx-auto shadow-xs">
          <CheckCircle2 className="w-6 h-6" />
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-[#244C3A] tracking-tight">
          Pre-Order Confirmed!
        </h1>
        <p className="text-xs sm:text-sm text-[#242B26] max-w-md mx-auto">
          Your order has been placed into the shared food court queue. Please present your token when called.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
        {/* Left Column: Token callout, timeline & order items */}
        <div className="md:col-span-7 space-y-6">
          {/* Daily Sequence Token Box */}
          <div className="bg-white p-6 rounded-2xl border border-[#E5E7E2] shadow-xs text-center space-y-2">
            <span className="text-xs font-semibold text-[#68716A] uppercase tracking-wider block">
              Shared Daily Sequence Token
            </span>
            <div className="text-5xl font-black text-[#244C3A] tracking-wider py-1">
              #{order.tokenNumber}
            </div>
            <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
              <span className="text-xs text-[#68716A]">Order Status:</span>
              <OrderStatusBadge status={order.status} />
              <span className="text-xs text-[#68716A] ml-2">Payment:</span>
              <PaymentBadge status={order.paymentStatus} />
            </div>
          </div>

          {/* Status Timeline */}
          <div className="bg-white p-6 rounded-2xl border border-[#E5E7E2] shadow-xs space-y-4">
            <h3 className="text-sm font-bold text-[#242B26] flex items-center gap-2">
              <Clock className="w-4 h-4 text-[#244C3A]" />
              <span>Live Preparation Progress</span>
            </h3>

            <div className="relative flex justify-between items-start pt-2">
              {/* Connecting line */}
              <div className="absolute top-5 left-4 right-4 h-0.5 bg-stone-200 -z-0" />
              <div
                className="absolute top-5 left-4 h-0.5 bg-[#244C3A] transition-all duration-500 -z-0"
                style={{ width: `${(currentStepIdx / 3) * 88}%` }}
              />

              {steps.map((step, idx) => {
                const isPassed = idx <= currentStepIdx;
                const isCurrent = idx === currentStepIdx;
                return (
                  <div key={step.key} className="flex flex-col items-center text-center z-10 w-20">
                    <div
                      className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                        isPassed
                          ? 'bg-[#244C3A] text-white ring-4 ring-[#E8F1E9]'
                          : 'bg-white text-stone-400 border-2 border-stone-300'
                      }`}
                    >
                      {idx + 1}
                    </div>
                    <span className={`text-[11px] font-semibold mt-2 ${isCurrent ? 'text-[#244C3A]' : 'text-[#68716A]'}`}>
                      {step.label}
                    </span>
                    <span className="text-[9px] text-[#68716A] hidden sm:block">
                      {step.desc}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Items Summary */}
          <div className="bg-white p-6 rounded-2xl border border-[#E5E7E2] shadow-xs space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-[#E5E7E2]">
              <span className="text-xs font-bold text-[#242B26]">Ordered Items</span>
              <span className="text-xs text-[#68716A]">{order.items.length} items</span>
            </div>

            <div className="space-y-2">
              {order.items.map((item: OrderItem) => (
                <div key={item.id} className="flex items-center justify-between text-xs py-1">
                  <div>
                    <span className="font-semibold text-[#242B26]">{item.foodName}</span>
                    <span className="text-[#68716A] ml-2 text-[11px]">× {item.quantity}</span>
                  </div>
                  <span className="font-medium text-[#242B26]">₹{item.lineTotal.toFixed(2)}</span>
                </div>
              ))}
            </div>

            <div className="pt-3 border-t border-[#E5E7E2] flex items-center justify-between text-sm font-bold">
              <span>Total Amount</span>
              <span className="text-[#244C3A]">₹{order.totalAmount.toFixed(2)}</span>
            </div>

            <div className="pt-3 flex flex-wrap gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => setShowBillModal(true)}
                icon={<FileText className="w-3.5 h-3.5" />}
              >
                View Digital Bill
              </Button>
              <Link to="/my-orders">
                <Button size="sm" variant="ghost" icon={<ArrowRight className="w-3.5 h-3.5" />}>
                  View in My Orders
                </Button>
              </Link>
            </div>
          </div>
        </div>

        {/* Right Column: Collection QR Code */}
        <div className="md:col-span-5 space-y-4">
          <QRDisplay
            tokenNumber={order.tokenNumber}
            qrToken={order.qrToken}
            isUsed={order.qrUsed}
          />

          <div className="p-4 bg-white rounded-xl border border-[#E5E7E2] text-xs text-[#68716A] space-y-1">
            <div className="font-bold text-[#242B26] flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-[#244C3A]" />
              <span>Counter Collection Rules</span>
            </div>
            <p className="text-[11px] leading-relaxed">
              1. Watch for Token <strong>#{order.tokenNumber}</strong> on the food court display boards.
            </p>
            <p className="text-[11px] leading-relaxed">
              2. When status shows <strong>Ready</strong>, present the QR code above to the counter cashier.
            </p>
            <p className="text-[11px] leading-relaxed">
              3. The token is consumed single-use to prevent duplicate collections.
            </p>
          </div>
        </div>
      </div>

      {/* Digital Bill Modal */}
      <Modal isOpen={showBillModal} onClose={() => setShowBillModal(false)} maxWidth="md">
        <BillReceipt order={order} copyType="customer" onClose={() => setShowBillModal(false)} />
      </Modal>
    </div>
  );
};
