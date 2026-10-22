import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useCart } from '../../contexts/CartContext';
import { X, Plus, Minus, Trash2, ShoppingBag, ArrowRight, ShieldAlert } from 'lucide-react';
import { Button } from '../ui/Button';

export const CartDrawer: React.FC = () => {
  const {
    cartItems,
    isCartDrawerOpen,
    setIsCartDrawerOpen,
    updateQuantity,
    removeFromCart,
    totalAmount,
    totalCount,
  } = useCart();
  const navigate = useNavigate();

  if (!isCartDrawerOpen) return null;

  const handleCheckout = () => {
    setIsCartDrawerOpen(false);
    navigate('/checkout');
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden no-print">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-stone-900/40 backdrop-blur-xs transition-opacity"
        onClick={() => setIsCartDrawerOpen(false)}
      />

      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-md bg-white shadow-2xl flex flex-col border-l border-[#E5E7E2]">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-[#E5E7E2] bg-[#FAF8F3]">
            <div className="flex items-center gap-2">
              <ShoppingBag className="w-5 h-5 text-[#244C3A]" />
              <h2 className="text-base font-semibold text-[#242B26]">
                Your Cart ({totalCount} {totalCount === 1 ? 'item' : 'items'})
              </h2>
            </div>
            <button
              onClick={() => setIsCartDrawerOpen(false)}
              className="p-1.5 text-stone-400 hover:text-[#244C3A] rounded-lg hover:bg-stone-100"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Cart Items list */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {cartItems.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-[#FAF8F3] rounded-full flex items-center justify-center mx-auto mb-4 border border-[#E5E7E2]">
                  <ShoppingBag className="w-8 h-8 text-stone-400" />
                </div>
                <h3 className="text-sm font-semibold text-[#242B26]">Your cart is empty</h3>
                <p className="text-xs text-[#68716A] mt-1 max-w-xs mx-auto">
                  Browse our food menu and select your favorite freshly prepared dishes!
                </p>
                <div className="mt-6">
                  <Button
                    size="sm"
                    variant="primary"
                    onClick={() => {
                      setIsCartDrawerOpen(false);
                      navigate('/menu');
                    }}
                  >
                    Browse Menu
                  </Button>
                </div>
              </div>
            ) : (
              cartItems.map(({ foodItem, quantity }) => (
                <div
                  key={foodItem.id}
                  className="flex items-start gap-3 p-3 rounded-xl border border-[#E5E7E2] bg-[#FAF8F3]/50 hover:bg-[#FAF8F3] transition-colors"
                >
                  <img
                    src={foodItem.image}
                    alt={foodItem.name}
                    className="w-16 h-16 rounded-lg object-cover border border-[#E5E7E2] shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <h4 className="text-xs font-semibold text-[#242B26] truncate">
                      {foodItem.name}
                    </h4>
                    <p className="text-[11px] text-[#68716A]">{foodItem.categoryName}</p>
                    <div className="text-xs font-bold text-[#244C3A] mt-1">
                      ₹{(foodItem.price * quantity).toFixed(2)}
                      <span className="text-[10px] text-[#68716A] font-normal ml-1">
                        (₹{foodItem.price} each)
                      </span>
                    </div>
                  </div>

                  {/* Quantity Stepper */}
                  <div className="flex flex-col items-end gap-2 shrink-0">
                    <div className="flex items-center gap-1.5 bg-white border border-[#E5E7E2] rounded-lg p-0.5">
                      <button
                        onClick={() => updateQuantity(foodItem.id, quantity - 1)}
                        className="p-1 hover:bg-stone-100 rounded text-stone-600 cursor-pointer"
                        title="Decrease"
                      >
                        <Minus className="w-3.5 h-3.5" />
                      </button>
                      <span className="text-xs font-semibold w-5 text-center">{quantity}</span>
                      <button
                        onClick={() => updateQuantity(foodItem.id, quantity + 1)}
                        className="p-1 hover:bg-stone-100 rounded text-stone-600 cursor-pointer"
                        title="Increase"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <button
                      onClick={() => removeFromCart(foodItem.id)}
                      className="text-stone-400 hover:text-red-600 text-xs p-1"
                      title="Remove"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          {cartItems.length > 0 && (
            <div className="border-t border-[#E5E7E2] p-6 bg-[#FAF8F3] space-y-4">
              <div className="flex items-center justify-between text-xs text-[#68716A]">
                <span>Items Subtotal</span>
                <span>₹{totalAmount.toFixed(2)}</span>
              </div>
              <div className="flex items-center justify-between text-xs text-[#68716A]">
                <span>Campus Food Court Tax</span>
                <span>₹0.00 (Inclusive)</span>
              </div>
              <div className="flex items-center justify-between text-sm font-bold text-[#242B26] pt-2 border-t border-[#E5E7E2]">
                <span>Estimated Total</span>
                <span className="text-[#244C3A] text-base">₹{totalAmount.toFixed(2)}</span>
              </div>

              <div className="flex items-center gap-1.5 text-[11px] text-[#68716A] bg-white p-2 rounded-lg border border-[#E5E7E2]">
                <ShieldAlert className="w-3.5 h-3.5 text-stone-400 shrink-0" />
                <span>Backend validates item availability and prices at order time.</span>
              </div>

              <Button
                variant="primary"
                fullWidth
                size="lg"
                onClick={handleCheckout}
                icon={<ArrowRight className="w-4 h-4" />}
              >
                Proceed to Checkout
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
