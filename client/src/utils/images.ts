import { SERVER_URL } from '../services/api';

const DEFAULT_DISH_IMAGES: Record<string, string> = {
  'Crispy Butter Masala Dosa': 'https://images.unsplash.com/photo-1668236543090-82eba5ee5976?w=600&auto=format&fit=crop&q=80',
  'Steamed Idli & Medu Vada Combo': 'https://images.unsplash.com/photo-1589301760014-d929f3979dbc?w=600&auto=format&fit=crop&q=80',
  'Amritsari Chole Bhature': 'https://images.unsplash.com/photo-1626132647523-66f5bf380027?w=600&auto=format&fit=crop&q=80',
  'Paneer Makhani Rice Bowl': 'https://images.unsplash.com/photo-1631452180519-c014fe946bc7?w=600&auto=format&fit=crop&q=80',
  'Hyderabadi Veg Dum Biryani': 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=600&auto=format&fit=crop&q=80',
  'Dahi Papdi Chaat': 'https://images.unsplash.com/photo-1601050690597-df0568f70950?w=600&auto=format&fit=crop&q=80',
  'Mumbai Pav Bhaji (Extra Butter)': 'https://images.unsplash.com/photo-1606491956689-2ea866880c84?w=600&auto=format&fit=crop&q=80',
  'Traditional South Filter Coffee': 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=600&auto=format&fit=crop&q=80',
  'Fresh Mango Lassi': 'https://images.unsplash.com/photo-1546173159-315724a31696?w=600&auto=format&fit=crop&q=80',
  'Hot Gulab Jamun with Vanilla Ice Cream': 'https://images.unsplash.com/photo-1528975604071-b4dc52a2d18c?w=600&auto=format&fit=crop&q=80',
};

const GENERIC_FOOD_FALLBACK = 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=600&auto=format&fit=crop&q=80';

/**
 * Resolves a food item image path to a displayable URL.
 * Handles uploaded files (/uploads/...), full URLs, and fallback dish images.
 */
export function resolveFoodImageUrl(imagePath?: string | null, foodName?: string): string {
  if (!imagePath && foodName && DEFAULT_DISH_IMAGES[foodName]) {
    return DEFAULT_DISH_IMAGES[foodName];
  }

  if (!imagePath) {
    return GENERIC_FOOD_FALLBACK;
  }

  // If already absolute HTTP URL
  if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
    return imagePath;
  }

  // If seeded demo path that matches known dishes
  if (foodName && DEFAULT_DISH_IMAGES[foodName]) {
    return DEFAULT_DISH_IMAGES[foodName];
  }

  // Uploaded backend image: serve from backend
  if (imagePath.startsWith('/uploads/')) {
    return `${SERVER_URL}${imagePath}`;
  }

  return GENERIC_FOOD_FALLBACK;
}
