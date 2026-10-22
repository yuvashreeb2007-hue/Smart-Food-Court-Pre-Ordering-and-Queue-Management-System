import React, { useState } from 'react';
import { FoodItem } from '../../types';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { AvailabilityBadge } from '../ui/Badge';
import { Plus, Minus, Clock, Utensils, ShoppingBag } from 'lucide-react';
import { useCart } from '../../contexts/CartContext';

interface FoodDetailModalProps {
  foodItem: FoodItem | null;
  onClose: () => void;
}

export const FoodDetailModal: React.FC<FoodDetailModalProps> = ({ foodItem, onClose }) => {
  const [quantity, setQuantity] = useState(1);
  const { addToCart } = useCart();

  if (!foodItem) return null;

  const handleAddToCart = () => {
    if (foodItem.isAvailable) {
      addToCart(foodItem, quantity);
      onClose();
    }
  };

  return (
    <Modal isOpen={!!foodItem} onClose={onClose} maxWidth="lg">
      <div className="space-y-4">
        {/* Photo */}
        <div className="relative h-56 rounded-xl overflow-hidden bg-[#FAF8F3] -mt-2">
          <img
            src={foodItem.image}
            alt={foodItem.name}
            className="w-full h-full object-cover"
          />
          <div className="absolute top-3 left-3 bg-white/95 backdrop-blur-xs px-2.5 py-1 rounded-md text-xs font-semibold flex items-center gap-1.5 shadow-xs">
            <span className="w-2 h-2 rounded-full bg-emerald-600 ring-2 ring-emerald-600/20" />
            <span>Vegetarian</span>
          </div>
          <div className="absolute top-3 right-3 shadow-xs">
            <AvailabilityBadge isAvailable={foodItem.isAvailable} />
          </div>
        </div>

        {/* Info */}
        <div>
          <div className="flex items-center justify-between gap-2 text-xs text-[#68716A] mb-1">
            <span className="font-semibold uppercase tracking-wider">{foodItem.categoryName}</span>
            <span className="flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" /> Est. prep time: {foodItem.preparationTimeMinutes} mins
            </span>
          </div>
          <h2 className="text-xl font-bold text-[#242B26]">{foodItem.name}</h2>
          <p className="text-sm text-[#68716A] mt-2 leading-relaxed">{foodItem.description}</p>
        </div>

        {/* Quantity selector and price */}
        <div className="pt-4 border-t border-[#E5E7E2] flex flex-wrap items-center justify-between gap-4">
          <div>
            <span className="text-xs text-[#68716A] block">Unit Price: ₹{foodItem.price}</span>
            <span className="text-2xl font-bold text-[#244C3A]">
              ₹{(foodItem.price * quantity).toFixed(2)}
            </span>
          </div>

          <div className="flex items-center gap-3">
            {foodItem.isAvailable && (
              <div className="flex items-center border border-[#E5E7E2] rounded-xl p-1 bg-[#FAF8F3]">
                <button
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  className="p-1.5 hover:bg-white rounded-lg text-stone-700 transition-colors"
                >
                  <Minus className="w-4 h-4" />
                </button>
                <span className="w-8 text-center font-bold text-sm">{quantity}</span>
                <button
                  onClick={() => setQuantity(quantity + 1)}
                  className="p-1.5 hover:bg-white rounded-lg text-stone-700 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            )}

            <Button
              variant={foodItem.isAvailable ? 'primary' : 'outline'}
              disabled={!foodItem.isAvailable}
              onClick={handleAddToCart}
              icon={<ShoppingBag className="w-4 h-4" />}
            >
              {foodItem.isAvailable ? `Add ${quantity} to Cart` : 'Item Unavailable'}
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
};
