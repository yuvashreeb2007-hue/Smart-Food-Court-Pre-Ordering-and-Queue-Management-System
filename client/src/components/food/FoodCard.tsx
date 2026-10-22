import React from 'react';
import { FoodItem } from '../../types';
import { AvailabilityBadge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { Plus, Clock, Utensils } from 'lucide-react';
import { useCart } from '../../contexts/CartContext';

interface FoodCardProps {
  foodItem: FoodItem;
  onSelect?: (foodItem: FoodItem) => void;
}

export const FoodCard: React.FC<FoodCardProps> = ({ foodItem, onSelect }) => {
  const { addToCart } = useCart();

  const handleAdd = (e: React.MouseEvent) => {
    e.stopPropagation();
    addToCart(foodItem);
  };

  return (
    <div
      onClick={() => onSelect && onSelect(foodItem)}
      className="bg-white rounded-2xl border border-[#E5E7E2] overflow-hidden hover:shadow-md transition-all duration-200 flex flex-col group cursor-pointer"
    >
      {/* Photograph Container */}
      <div className="relative h-44 overflow-hidden bg-[#FAF8F3]">
        <img
          src={foodItem.image}
          alt={foodItem.name}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          onError={(e) => {
            // Fallback image if external URL fails
            (e.target as HTMLImageElement).src =
              'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=600&auto=format&fit=crop&q=80';
          }}
        />

        {/* Veg badge */}
        <div className="absolute top-3 left-3 bg-white/95 backdrop-blur-xs px-2 py-1 rounded-md text-[11px] font-medium flex items-center gap-1 shadow-xs border border-stone-200">
          <span className="w-2 h-2 rounded-full bg-emerald-600 ring-2 ring-emerald-600/20" />
          <span className="text-[#242B26]">Pure Veg</span>
        </div>

        {/* Availability Badge */}
        <div className="absolute top-3 right-3 shadow-xs">
          <AvailabilityBadge isAvailable={foodItem.isAvailable} />
        </div>

        {/* Unavailable overlay */}
        {!foodItem.isAvailable && (
          <div className="absolute inset-0 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4">
            <span className="bg-red-600 text-white font-bold text-xs px-3 py-1.5 rounded-full shadow-md uppercase tracking-wider">
              Currently Unavailable
            </span>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-4 sm:p-5 flex-1 flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between gap-2 mb-1">
            <span className="text-[11px] font-semibold text-[#68716A] uppercase tracking-wider">
              {foodItem.categoryName}
            </span>
            <div className="flex items-center gap-1 text-[11px] text-[#68716A]">
              <Clock className="w-3 h-3" />
              <span>~{foodItem.preparationTimeMinutes} min</span>
            </div>
          </div>

          <h3 className="font-semibold text-sm sm:text-base text-[#242B26] line-clamp-1 group-hover:text-[#244C3A] transition-colors">
            {foodItem.name}
          </h3>

          <p className="text-xs text-[#68716A] line-clamp-2 mt-1 leading-relaxed">
            {foodItem.description}
          </p>
        </div>

        {/* Price and Add Action */}
        <div className="pt-4 mt-3 border-t border-[#E5E7E2] flex items-center justify-between">
          <div>
            <span className="text-[10px] text-[#68716A] block uppercase font-medium">Price</span>
            <span className="text-base sm:text-lg font-bold text-[#244C3A]">
              ₹{foodItem.price.toFixed(2)}
            </span>
          </div>

          <Button
            size="sm"
            variant={foodItem.isAvailable ? 'primary' : 'outline'}
            disabled={!foodItem.isAvailable}
            onClick={handleAdd}
            icon={foodItem.isAvailable ? <Plus className="w-3.5 h-3.5" /> : undefined}
          >
            {foodItem.isAvailable ? 'Add' : 'Sold Out'}
          </Button>
        </div>
      </div>
    </div>
  );
};
