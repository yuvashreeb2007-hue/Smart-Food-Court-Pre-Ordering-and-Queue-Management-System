import React, { createContext, useContext, useState, useMemo, useEffect } from 'react';
import { CartItem, FoodItem } from '../types';

interface CartContextType {
  cartItems: CartItem[];
  addToCart: (foodItem: FoodItem, quantity?: number) => boolean;
  updateQuantity: (foodItemId: string, quantity: number) => void;
  removeFromCart: (foodItemId: string) => void;
  clearCart: () => void;
  totalAmount: number;
  totalCount: number;
  isCartDrawerOpen: boolean;
  setIsCartDrawerOpen: (open: boolean) => void;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [cartItems, setCartItems] = useState<CartItem[]>(() => {
    try {
      const saved = sessionStorage.getItem('sfc_cart');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [isCartDrawerOpen, setIsCartDrawerOpen] = useState(false);

  useEffect(() => {
    try {
      sessionStorage.setItem('sfc_cart', JSON.stringify(cartItems));
    } catch {}
  }, [cartItems]);

  const addToCart = (foodItem: FoodItem, quantity = 1): boolean => {
    if (!foodItem.isAvailable) {
      alert(`"${foodItem.name}" is currently unavailable and cannot be added to cart.`);
      return false;
    }

    setCartItems(prev => {
      const existingIndex = prev.findIndex(item => item.foodItem.id === foodItem.id);
      if (existingIndex > -1) {
        const next = [...prev];
        next[existingIndex] = {
          ...next[existingIndex],
          quantity: next[existingIndex].quantity + quantity,
        };
        return next;
      }
      return [...prev, { foodItem, quantity }];
    });
    return true;
  };

  const updateQuantity = (foodItemId: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(foodItemId);
      return;
    }
    setCartItems(prev =>
      prev.map(item =>
        item.foodItem.id === foodItemId ? { ...item, quantity } : item
      )
    );
  };

  const removeFromCart = (foodItemId: string) => {
    setCartItems(prev => prev.filter(item => item.foodItem.id !== foodItemId));
  };

  const clearCart = () => {
    setCartItems([]);
  };

  const totalAmount = useMemo(() => {
    return cartItems.reduce((acc, item) => acc + item.foodItem.price * item.quantity, 0);
  }, [cartItems]);

  const totalCount = useMemo(() => {
    return cartItems.reduce((acc, item) => acc + item.quantity, 0);
  }, [cartItems]);

  return (
    <CartContext.Provider
      value={{
        cartItems,
        addToCart,
        updateQuantity,
        removeFromCart,
        clearCart,
        totalAmount,
        totalCount,
        isCartDrawerOpen,
        setIsCartDrawerOpen,
      }}
    >
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};
