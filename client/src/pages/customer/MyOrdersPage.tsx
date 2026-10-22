import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useOrders } from '../../contexts/OrderContext';
import { useAuth, SEEDED_CREDENTIALS } from '../../contexts/AuthContext';
import { Order } from '../../types';
import { OrderStatusBadge, PaymentBadge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { BillReceipt } from '../../components/ui/BillReceipt';
import { QRDisplay } from '../../components/ui/QRDisplay';
import { Clock, QrCode, FileText, ArrowRight, Utensils, RefreshCw, Loader2, LogIn } from 'lucide-react';

export const MyOrdersPage: React.FC = () => {
  const { orders, refreshOrders, isLoadingOrders } = useOrders();
  const { isAuthenticated, login } = useAuth();
  const [activeReceiptOrder, setActiveReceiptOrder] = useState<Order | null>(null);
  const [activeQrOrder, setActiveQrOrder] = useState<Order | null>(null);

  useEffect(() => {
    if (isAuthenticated) {
      refreshOrders();
    }
  }, [isAuthenticated, refreshOrders]);

  if (!isAuthenticated) {
    return (
      <div className="max-w-xl mx-auto px-4 py-16 text-center space-y-4">
        <Clock className="w-12 h-12 text-stone-300 mx-auto" />
        <h2 className="text-xl font-bold text-[#242B26]">Sign-in Required</h2>
        <p className="text-xs text-[#68716A]">Please sign in to view your orders, live tokens, and pickup QR codes.</p>
        <div className="flex items-center justify-center gap-3 pt-2">
          <button
            onClick={() => login(SEEDED_CREDENTIALS.customer.email, SEEDED_CREDENTIALS.customer.password)}
            className="py-2 px-4 bg-[#244C3A] text-white rounded-lg text-xs font-semibold hover:bg-[#19392B]"
          >
            One-Click Student Login
          </button>
          <Link to="/auth/login">
            <Button variant="outline" size="md" icon={<LogIn className="w-4 h-4" />}>
              Sign In
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  const myOrders = orders;

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-[#242B26] tracking-tight">
            My Campus Food Orders
          </h1>
          <p className="text-xs sm:text-sm text-[#68716A] mt-1">
            Real-time status tracking, digital receipts, and pickup verification QR codes
          </p>
        </div>

        <Link to="/menu">
          <Button variant="primary" size="sm" icon={<Utensils className="w-3.5 h-3.5" />}>
            Order More Food
          </Button>
        </Link>
      </div>

      {myOrders.length === 0 ? (
        <div className="bg-white rounded-2xl border border-[#E5E7E2] p-12 text-center space-y-3">
          <Clock className="w-10 h-10 text-stone-300 mx-auto" />
          <h3 className="text-base font-semibold text-[#242B26]">No orders placed yet</h3>
          <p className="text-xs text-[#68716A] max-w-sm mx-auto">
            Place your first meal pre-order from our fresh menu to get your daily queue token!
          </p>
          <div className="pt-2">
            <Link to="/menu">
              <Button size="sm" variant="primary">Browse Menu</Button>
            </Link>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {myOrders.map(order => (
            <div
              key={order.id}
              className="bg-white rounded-2xl border border-[#E5E7E2] p-5 shadow-xs hover:border-[#244C3A]/40 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4"
            >
              {/* Left: Token callout and items */}
              <div className="flex items-start gap-4">
                <div className="w-16 h-16 rounded-xl bg-[#FAF8F3] border border-[#E5E7E2] flex flex-col items-center justify-center shrink-0">
                  <span className="text-[10px] uppercase font-bold text-[#68716A]">TOKEN</span>
                  <span className="text-xl font-black text-[#244C3A]">#{order.tokenNumber}</span>
                </div>

                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-bold text-[#242B26]">
                      {order.items.map(i => `${i.quantity}x ${i.foodName}`).join(', ')}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 text-xs text-[#68716A]">
                    <span>{new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    <span>•</span>
                    <span className="capitalize">{order.orderType} Order</span>
                    <span>•</span>
                    <span className="font-bold text-[#244C3A]">₹{order.totalAmount.toFixed(2)}</span>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    <OrderStatusBadge status={order.status} size="sm" />
                    <PaymentBadge status={order.paymentStatus} />
                    {order.qrUsed && (
                      <span className="text-[11px] text-stone-500 bg-stone-100 px-2 py-0.5 rounded">
                        Collected
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Right: Actions */}
              <div className="flex flex-wrap items-center gap-2 md:justify-end pt-2 md:pt-0 border-t md:border-t-0 border-[#E5E7E2]">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setActiveQrOrder(order)}
                  icon={<QrCode className="w-3.5 h-3.5 text-[#244C3A]" />}
                >
                  Pickup QR
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setActiveReceiptOrder(order)}
                  icon={<FileText className="w-3.5 h-3.5" />}
                >
                  Digital Bill
                </Button>
                <Link to={`/order-confirmation/${order.id}`}>
                  <Button size="sm" variant="ghost" icon={<ArrowRight className="w-3.5 h-3.5" />}>
                    Details
                  </Button>
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Bill Receipt Modal */}
      <Modal
        isOpen={!!activeReceiptOrder}
        onClose={() => setActiveReceiptOrder(null)}
        maxWidth="md"
      >
        {activeReceiptOrder && (
          <BillReceipt order={activeReceiptOrder} copyType="customer" />
        )}
      </Modal>

      {/* Collection QR Modal */}
      <Modal
        isOpen={!!activeQrOrder}
        onClose={() => setActiveQrOrder(null)}
        maxWidth="sm"
      >
        {activeQrOrder && (
          <QRDisplay
            tokenNumber={activeQrOrder.tokenNumber}
            qrToken={activeQrOrder.qrToken}
            isUsed={activeQrOrder.qrUsed}
          />
        )}
      </Modal>
    </div>
  );
};
