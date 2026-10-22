import React, { useState, useMemo } from 'react';
import { useOrders } from '../../contexts/OrderContext';
import { FoodItem } from '../../types';
import { FoodCard } from '../../components/food/FoodCard';
import { FoodDetailModal } from '../../components/food/FoodDetailModal';
import { Search, Sparkles, AlertCircle, Loader2 } from 'lucide-react';

export const MenuPage: React.FC = () => {
  const { foodItems, categories, isLoadingFood } = useOrders();
  const [selectedCategory, setSelectedCategory] = useState('cat-all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFoodItem, setSelectedFoodItem] = useState<FoodItem | null>(null);

  const displayCategories = categories.length > 0 ? categories : [
    { id: 'cat-all', name: 'All Items', slug: 'all' },
  ];

  const filteredItems = useMemo(() => {
    return foodItems.filter(item => {
      const matchesCategory =
        selectedCategory === 'cat-all' ||
        item.categoryId === selectedCategory ||
        item.categoryName.toLowerCase().replace(/[^a-z0-9]+/g, '-') === selectedCategory;
      const matchesSearch =
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.categoryName.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }, [foodItems, selectedCategory, searchQuery]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Title & Search bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-[#242B26] tracking-tight">
            Food Court Menu
          </h1>
          <p className="text-xs sm:text-sm text-[#68716A] mt-1">
            Freshly prepared dishes available for instant online pre-ordering
          </p>
        </div>

        {/* Search Input */}
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-[#68716A] absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search dosa, biryani, shake..."
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-[#E5E7E2] rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[#244C3A] shadow-xs"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[#68716A] hover:text-[#242B26]"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Category Pills */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
        {displayCategories.map(category => {
          const isSelected = selectedCategory === category.id;
          return (
            <button
              key={category.id}
              onClick={() => setSelectedCategory(category.id)}
              className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-medium whitespace-nowrap transition-all cursor-pointer ${
                isSelected
                  ? 'bg-[#244C3A] text-white shadow-xs'
                  : 'bg-white text-[#68716A] hover:text-[#242B26] border border-[#E5E7E2] hover:bg-[#FAF8F3]'
              }`}
            >
              {category.name}
            </button>
          );
        })}
      </div>

      {/* Notice Banner */}
      <div className="flex items-center gap-2 p-3 bg-[#E8F1E9]/60 rounded-xl border border-[#244C3A]/20 text-xs text-[#244C3A]">
        <Sparkles className="w-4 h-4 text-[#244C3A] shrink-0" />
        <span>
          <strong>Live Availability Notice:</strong> Food items marked as "Unavailable" cannot be added to cart. Stock is verified transactionally at order placement.
        </span>
      </div>

      {/* Loading State */}
      {isLoadingFood && (
        <div className="flex flex-col items-center justify-center py-16 space-y-3">
          <Loader2 className="w-8 h-8 text-[#244C3A] animate-spin" />
          <p className="text-xs text-[#68716A]">Loading fresh menu from backend...</p>
        </div>
      )}

      {/* Food Grid */}
      {filteredItems.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-[#E5E7E2] p-8">
          <div className="w-12 h-12 bg-stone-100 rounded-full flex items-center justify-center mx-auto mb-3 text-stone-400">
            <AlertCircle className="w-6 h-6" />
          </div>
          <h3 className="text-base font-semibold text-[#242B26]">No food items found</h3>
          <p className="text-xs text-[#68716A] mt-1 max-w-sm mx-auto">
            We couldn't find any dish matching your filter "{searchQuery}". Try searching for another keyword or select All Items.
          </p>
          <button
            onClick={() => {
              setSearchQuery('');
              setSelectedCategory('cat-all');
            }}
            className="mt-4 px-4 py-2 bg-[#244C3A] text-white text-xs font-semibold rounded-lg"
          >
            Reset Filters
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredItems.map(item => (
            <FoodCard
              key={item.id}
              foodItem={item}
              onSelect={foodItem => setSelectedFoodItem(foodItem)}
            />
          ))}
        </div>
      )}

      {/* Item Detail Modal */}
      <FoodDetailModal
        foodItem={selectedFoodItem}
        onClose={() => setSelectedFoodItem(null)}
      />
    </div>
  );
};
