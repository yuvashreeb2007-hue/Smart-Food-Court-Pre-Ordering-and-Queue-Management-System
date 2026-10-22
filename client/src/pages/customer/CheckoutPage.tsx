import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useCart } from '../../contexts/CartContext';
import { useOrders } from '../../contexts/OrderContext';
import { useAuth, SEEDED_CREDENTIALS } from '../../contexts/AuthContext';
import { Button } from '../../components/ui/Button';
import {
  ArrowLeft,
  Lock,
  Smartphone,
  AlertTriangle,
  Receipt,
  UserCheck,
  AlertCircle,
  LogIn,
} from 'lucide-react';

export const CheckoutPage: React.FC = () => {
  const { cartItems, totalAmount, clearCart } = useCart();
  const { placeOnlineOrder } = useOrders();
  const { currentUser, isAuthenticated, login } = useAuth();
  const navigate = useNavigate();

  const [customerName, setCustomerName] = useState(currentUser?.name || 'Aditya Sharma');
  const [customerPhone, setCustomerPhone] = useState(currentUser?.phone || '+91 98765 43210');
  const [upiId, setUpiId] = useState('student@okaxis');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    if (currentUser?.name && currentUser.name !== 'Campus Guest') {
      setCustomerName(currentUser.name);
    }
    if (currentUser?.phone) {
      setCustomerPhone(currentUser.phone);
    }
  }, [currentUser]);

  if (cartItems.length === 0) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center space-y-4">
        <h2 className="text-xl font-bold text-[#242B26]">Your Cart is Empty</h2>
        <p className="text-xs text-[#68716A]">Add items to your cart before proceeding to checkout.</p>
        <Link to="/menu">
          <Button variant="primary" size="md">Browse Food Menu</Button>
        </Link>
      </div>
    );
  }

  const handlePlaceOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);

    if (!isAuthenticated) {
      setSubmitError('Please sign in or use one-click student login to place your order.');
      return;
    }

    setIsSubmitting(true);

    const result = await placeOnlineOrder(
      cartItems,
      customerName.trim(),
      customerPhone.trim()
    );

    setIsSubmitting(false);

    if (result.success && result.order) {
      clearCart();
      navigate(`/order-confirmation/${result.order.id}`);
    } else {
      setSubmitError(result.error || 'Failed to place pre-order. Please try again.');
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Back button */}
      <div>
        <Link
          to="/menu"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#68716A] hover:text-[#244C3A]"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Menu</span>
        </Link>
        <h1 className="text-2xl sm:text-3xl font-bold text-[#242B26] mt-2">
          Review & Confirm Pre-Order
        </h1>
        <p className="text-xs text-[#68716A] mt-1">
          Verify your campus meal selection, contact details, and generate your queue token.
        </p>
      </div>

      {/* Authentication Prompt if Guest */}
      {!isAuthenticated && (
        <div className="p-4 bg-amber-50 rounded-2xl border border-amber-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs text-amber-900">
          <div className="flex items-start gap-3">
            <UserCheck className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
            <div>
              <strong className="block text-amber-950 font-bold">Sign-in Required for Pre-Ordering</strong>
              <span>Campus pre-ordering requires an authenticated account to protect token and order privacy.</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => login(SEEDED_CREDENTIALS.customer.email, SEEDED_CREDENTIALS.customer.password)}
              className="py-1.5 px-3 bg-[#244C3A] text-white font-medium rounded-lg text-xs hover:bg-[#19392B] transition-colors"
            >
              One-Click Student Login
            </button>
            <Link to="/auth/login">
              <Button size="sm" variant="outline" icon={<LogIn className="w-3.5 h-3.5" />}>
                Sign In
              </Button>
            </Link>
          </div>
        </div>
      )}

      {/* Error message */}
      {submitError && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-2xl text-xs text-red-700 flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
          <span>{submitError}</span>
        </div>
      )}

      <form onSubmit={handlePlaceOrder} className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Contact details & Payment Gate Notice */}
        <div className="lg:col-span-7 space-y-6">
          {/* Contact Details */}
          <div className="bg-white p-6 rounded-2xl border border-[#E5E7E2] shadow-xs space-y-4">
            <h3 className="text-sm font-bold text-[#242B26] flex items-center gap-2">
              <UserCheck className="w-4 h-4 text-[#244C3A]" />
              <span>Customer Identification</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-[#242B26] mb-1">
                  Full Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={customerName}
                  onChange={e => setCustomerName(e.target.value)}
                  className="w-full px-3 py-2 text-xs sm:text-sm rounded-lg border border-[#E5E7E2] focus:outline-none focus:ring-2 focus:ring-[#244C3A]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#242B26] mb-1">
                  Contact Phone
                </label>
                <input
                  type="tel"
                  value={customerPhone}
                  onChange={e => setCustomerPhone(e.target.value)}
                  className="w-full px-3 py-2 text-xs sm:text-sm rounded-lg border border-[#E5E7E2] focus:outline-none focus:ring-2 focus:ring-[#244C3A]"
                />
              </div>
            </div>
          </div>

          {/* Payment Method & STRICT PENDING NOTICE */}
          <div className="bg-white p-6 rounded-2xl border border-[#E5E7E2] shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-[#242B26] flex items-center gap-2">
                <Smartphone className="w-4 h-4 text-[#244C3A]" />
                <span>Payment Method (UPI)</span>
              </h3>
              <span className="text-[11px] font-semibold text-amber-800 bg-amber-50 px-2.5 py-0.5 rounded-full border border-amber-200">
                Integration Pending
              </span>
            </div>

            {/* MANDATORY PAYMENT HANDLING REQUIREMENT CALLOUT */}
            <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 space-y-2">
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                <div>
                  <strong className="block text-amber-950 font-bold">
                    Security Policy: Real Payment Integration Pending
                  </strong>
                  <p className="mt-1 leading-relaxed text-[11px] text-amber-900">
                    Never simulate a successful UPI payment. Genuine payment gateway credentials will be integrated in Phase 5. Your order will be created with status <strong>Payment: Pending</strong>.
                  </p>
                </div>
              </div>
              <div className="text-[11px] text-amber-800 bg-amber-100/60 p-2 rounded-lg border border-amber-300/40">
                ⚠️ Strict Guard: Pending-payment online orders <strong>cannot</strong> be marked as Ready or Completed at the food counter until payment is confirmed.
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#242B26] mb-1">
                Virtual Payment Address (VPA / UPI ID)
              </label>
              <input
                type="text"
                value={upiId}
                onChange={e => setUpiId(e.target.value)}
                placeholder="name@okaxis or 9876543210@paytm"
                className="w-full px-3 py-2 text-xs sm:text-sm rounded-lg border border-[#E5E7E2] focus:outline-none focus:ring-2 focus:ring-[#244C3A]"
              />
            </div>
          </div>
        </div>

        {/* Right Column: Order Summary */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-white p-6 rounded-2xl border border-[#E5E7E2] shadow-xs space-y-4">
            <h3 className="text-sm font-bold text-[#242B26] flex items-center gap-2 pb-3 border-b border-[#E5E7E2]">
              <Receipt className="w-4 h-4 text-[#244C3A]" />
              <span>Order Summary ({cartItems.length} items)</span>
            </h3>

            <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
              {cartItems.map(({ foodItem, quantity }) => (
                <div key={foodItem.id} className="flex items-center justify-between text-xs">
                  <div className="flex-1 pr-2">
                    <span className="font-semibold text-[#242B26] block truncate">
                      {foodItem.name}
                    </span>
                    <span className="text-[11px] text-[#68716A]">
                      Qty: {quantity} × ₹{foodItem.price}
                    </span>
                  </div>
                  <span className="font-bold text-[#242B26]">
                    ₹{(foodItem.price * quantity).toFixed(2)}
                  </span>
                </div>
              ))}
            </div>

            <div className="pt-4 border-t border-[#E5E7E2] space-y-2 text-xs">
              <div className="flex justify-between text-[#68716A]">
                <span>Subtotal</span>
                <span>₹{totalAmount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-[#68716A]">
                <span>Taxes & Canteen Charges</span>
                <span className="text-emerald-700 font-medium">Included</span>
              </div>
              <div className="flex justify-between text-base font-extrabold text-[#242B26] pt-2 border-t border-[#E5E7E2]">
                <span>Total Amount</span>
                <span className="text-[#244C3A]">₹{totalAmount.toFixed(2)}</span>
              </div>
            </div>

            <Button
              type="submit"
              variant="primary"
              size="lg"
              fullWidth
              disabled={isSubmitting}
              icon={<Lock className="w-4 h-4" />}
            >
              {isSubmitting ? 'Allocating Daily Token...' : `Place Pre-Order (₹${totalAmount.toFixed(2)})`}
            </Button>

            <p className="text-[11px] text-center text-[#68716A]">
              By clicking, an atomic shared daily token starting at 101 will be allocated from PostgreSQL.
            </p>
          </div>
        </div>
      </form>
    </div>
  );
};
