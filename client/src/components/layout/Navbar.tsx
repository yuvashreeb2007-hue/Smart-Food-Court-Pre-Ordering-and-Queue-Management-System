import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useCart } from '../../contexts/CartContext';
import {
  UtensilsCrossed,
  ShoppingBag,
  Clock,
  Menu,
  X,
  User,
  Store,
  ChefHat,
  ListOrdered,
  LogOut,
  Layers,
} from 'lucide-react';

export const Navbar: React.FC = () => {
  const { currentUser, logout } = useAuth();
  const { totalCount, setIsCartDrawerOpen } = useCart();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const isActive = (path: string) => location.pathname === path;

  return (
    <nav className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-[#E5E7E2] no-print">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Brand */}
          <div className="flex items-center gap-3">
            <Link to="/" className="flex items-center gap-2.5 group">
              <div className="w-10 h-10 rounded-xl bg-[#244C3A] text-white flex items-center justify-center shadow-xs group-hover:bg-[#19392B] transition-colors">
                <UtensilsCrossed className="w-5 h-5" />
              </div>
              <div>
                <span className="font-bold text-lg text-[#242B26] tracking-tight block leading-tight">
                  Smart Food Court
                </span>
                <span className="text-[10px] text-[#68716A] uppercase tracking-wider block font-medium">
                  Pre-Order & Live Queue
                </span>
              </div>
            </Link>
          </div>

          {/* Desktop Navigation Links */}
          <div className="hidden md:flex items-center space-x-1">
            {currentUser.role === 'customer' && (
              <>
                <Link
                  to="/"
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    isActive('/') ? 'text-[#244C3A] bg-[#E8F1E9]' : 'text-[#68716A] hover:text-[#242B26] hover:bg-stone-50'
                  }`}
                >
                  Home
                </Link>
                <Link
                  to="/menu"
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    isActive('/menu') ? 'text-[#244C3A] bg-[#E8F1E9]' : 'text-[#68716A] hover:text-[#242B26] hover:bg-stone-50'
                  }`}
                >
                  Food Menu
                </Link>
                <Link
                  to="/my-orders"
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5 ${
                    isActive('/my-orders') ? 'text-[#244C3A] bg-[#E8F1E9]' : 'text-[#68716A] hover:text-[#242B26] hover:bg-stone-50'
                  }`}
                >
                  <Clock className="w-4 h-4" />
                  <span>My Orders</span>
                </Link>
              </>
            )}

            {currentUser.role === 'cashier' && (
              <>
                <Link
                  to="/cashier"
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5 ${
                    isActive('/cashier') ? 'text-[#244C3A] bg-[#E8F1E9]' : 'text-[#68716A] hover:text-[#242B26] hover:bg-stone-50'
                  }`}
                >
                  <Store className="w-4 h-4" />
                  <span>Cashier Counter</span>
                </Link>
                <Link
                  to="/cashier/availability"
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5 ${
                    isActive('/cashier/availability') ? 'text-[#244C3A] bg-[#E8F1E9]' : 'text-[#68716A] hover:text-[#242B26] hover:bg-stone-50'
                  }`}
                >
                  <Layers className="w-4 h-4" />
                  <span>Item Availability</span>
                </Link>
              </>
            )}

            {currentUser.role === 'manager' && (
              <>
                <Link
                  to="/manager"
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5 ${
                    isActive('/manager') ? 'text-[#244C3A] bg-[#E8F1E9]' : 'text-[#68716A] hover:text-[#242B26] hover:bg-stone-50'
                  }`}
                >
                  <ChefHat className="w-4 h-4" />
                  <span>Food Catalog</span>
                </Link>
                <Link
                  to="/manager/history"
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5 ${
                    isActive('/manager/history') ? 'text-[#244C3A] bg-[#E8F1E9]' : 'text-[#68716A] hover:text-[#242B26] hover:bg-stone-50'
                  }`}
                >
                  <ListOrdered className="w-4 h-4" />
                  <span>7-Day Orders</span>
                </Link>
                <Link
                  to="/manager/refunds"
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5 ${
                    isActive('/manager/refunds') ? 'text-[#244C3A] bg-[#E8F1E9]' : 'text-[#68716A] hover:text-[#242B26] hover:bg-stone-50'
                  }`}
                >
                  <span>Refund Desk</span>
                </Link>
              </>
            )}
          </div>

          {/* Right Action: Cart Button & User Pill */}
          <div className="flex items-center gap-3">
            {currentUser.role === 'customer' && (
              <button
                onClick={() => setIsCartDrawerOpen(true)}
                className="relative p-2.5 rounded-xl text-[#242B26] hover:bg-[#FAF8F3] border border-[#E5E7E2] transition-colors cursor-pointer flex items-center gap-2"
                title="View Cart"
              >
                <ShoppingBag className="w-5 h-5 text-[#244C3A]" />
                <span className="hidden sm:inline text-xs font-semibold">Cart</span>
                {totalCount > 0 && (
                  <span className="bg-[#244C3A] text-white text-[11px] font-bold rounded-full h-5 min-w-5 px-1.5 flex items-center justify-center">
                    {totalCount}
                  </span>
                )}
              </button>
            )}

            {/* User pill & Auth action */}
            <div className="hidden sm:flex items-center gap-2 pl-2 border-l border-[#E5E7E2]">
              <div className="w-8 h-8 rounded-full bg-[#E8F1E9] text-[#244C3A] flex items-center justify-center text-xs font-bold">
                {currentUser?.name ? currentUser.name.charAt(0) : 'U'}
              </div>
              <div className="text-left text-xs">
                <span className="font-semibold text-[#242B26] block leading-tight">{currentUser?.name || 'Guest User'}</span>
                <span className="text-[10px] text-[#68716A] capitalize">{currentUser?.role || 'customer'}</span>
              </div>
              <button
                onClick={() => logout()}
                className="ml-2 py-1 px-2.5 rounded-lg border border-[#E5E7E2] hover:bg-stone-100 text-[#68716A] hover:text-[#242B26] text-xs font-medium flex items-center gap-1 cursor-pointer"
                title="Log out of current session"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Logout</span>
              </button>
            </div>

            {/* Mobile menu trigger */}
            <div className="flex md:hidden">
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="p-2 rounded-lg text-[#68716A] hover:bg-stone-100"
              >
                {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile menu drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-[#E5E7E2] bg-white px-4 pt-2 pb-4 space-y-1">
          {currentUser.role === 'customer' && (
            <>
              <Link
                to="/"
                onClick={() => setMobileMenuOpen(false)}
                className="block px-3 py-2 rounded-md text-base font-medium text-[#242B26] hover:bg-[#FAF8F3]"
              >
                Home
              </Link>
              <Link
                to="/menu"
                onClick={() => setMobileMenuOpen(false)}
                className="block px-3 py-2 rounded-md text-base font-medium text-[#242B26] hover:bg-[#FAF8F3]"
              >
                Food Menu
              </Link>
              <Link
                to="/my-orders"
                onClick={() => setMobileMenuOpen(false)}
                className="block px-3 py-2 rounded-md text-base font-medium text-[#242B26] hover:bg-[#FAF8F3]"
              >
                My Orders
              </Link>
            </>
          )}

          {currentUser.role === 'cashier' && (
            <>
              <Link
                to="/cashier"
                onClick={() => setMobileMenuOpen(false)}
                className="block px-3 py-2 rounded-md text-base font-medium text-[#242B26] hover:bg-[#FAF8F3]"
              >
                Cashier Counter
              </Link>
              <Link
                to="/cashier/availability"
                onClick={() => setMobileMenuOpen(false)}
                className="block px-3 py-2 rounded-md text-base font-medium text-[#242B26] hover:bg-[#FAF8F3]"
              >
                Item Availability
              </Link>
            </>
          )}

          {currentUser.role === 'manager' && (
            <>
              <Link
                to="/manager"
                onClick={() => setMobileMenuOpen(false)}
                className="block px-3 py-2 rounded-md text-base font-medium text-[#242B26] hover:bg-[#FAF8F3]"
              >
                Food Catalog
              </Link>
              <Link
                to="/manager/history"
                onClick={() => setMobileMenuOpen(false)}
                className="block px-3 py-2 rounded-md text-base font-medium text-[#242B26] hover:bg-[#FAF8F3]"
              >
                7-Day Orders
              </Link>
              <Link
                to="/manager/refunds"
                onClick={() => setMobileMenuOpen(false)}
                className="block px-3 py-2 rounded-md text-base font-medium text-[#242B26] hover:bg-[#FAF8F3]"
              >
                Refund Desk
              </Link>
            </>
          )}

          <div className="pt-4 border-t border-[#E5E7E2] flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-[#242B26]">{currentUser.name}</p>
              <p className="text-xs text-[#68716A] capitalize">Role: {currentUser.role}</p>
            </div>
            <Link
              to="/auth/login"
              onClick={() => setMobileMenuOpen(false)}
              className="text-xs font-medium text-[#244C3A] bg-[#E8F1E9] px-3 py-1.5 rounded-lg"
            >
              Change Account
            </Link>
          </div>
        </div>
      )}
    </nav>
  );
};
