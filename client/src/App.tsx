import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { CartProvider } from './contexts/CartContext';
import { OrderProvider } from './contexts/OrderContext';
import { PrototypeBanner } from './components/layout/PrototypeBanner';
import { Navbar } from './components/layout/Navbar';
import { CartDrawer } from './components/food/CartDrawer';

// Pages
import { LandingPage } from './pages/public/LandingPage';
import { MenuPage } from './pages/public/MenuPage';
import { CheckoutPage } from './pages/customer/CheckoutPage';
import { OrderConfirmationPage } from './pages/customer/OrderConfirmationPage';
import { MyOrdersPage } from './pages/customer/MyOrdersPage';
import { LoginPage } from './pages/auth/LoginPage';
import { RegisterPage } from './pages/auth/RegisterPage';
import { CashierDashboard } from './pages/cashier/CashierDashboard';
import { ManagerDashboard } from './pages/manager/ManagerDashboard';

export const App: React.FC = () => {
  return (
    <BrowserRouter>
      <AuthProvider>
        <OrderProvider>
          <CartProvider>
            <div className="min-h-screen bg-[#FAF8F3] text-[#242B26] flex flex-col font-sans">
              {/* Reviewer Role Switcher Banner */}
              <PrototypeBanner />

              {/* Navigation Header */}
              <Navbar />

              {/* Slide-over Cart Drawer */}
              <CartDrawer />

              {/* Main Page Content */}
              <main className="flex-1">
                <Routes>
                  {/* Public & Customer Routes */}
                  <Route path="/" element={<LandingPage />} />
                  <Route path="/menu" element={<MenuPage />} />
                  <Route path="/checkout" element={<CheckoutPage />} />
                  <Route path="/order-confirmation/:orderId" element={<OrderConfirmationPage />} />
                  <Route path="/my-orders" element={<MyOrdersPage />} />

                  {/* Auth Routes */}
                  <Route path="/auth/login" element={<LoginPage />} />
                  <Route path="/auth/register" element={<RegisterPage />} />

                  {/* Staff Routes */}
                  <Route path="/cashier" element={<CashierDashboard />} />
                  <Route path="/cashier/*" element={<CashierDashboard />} />
                  <Route path="/manager" element={<ManagerDashboard />} />
                  <Route path="/manager/*" element={<ManagerDashboard />} />

                  {/* Fallback */}
                  <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
              </main>

              {/* Footer */}
              <footer className="bg-white border-t border-[#E5E7E2] py-8 no-print mt-auto">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-xs text-[#68716A] space-y-2">
                  <p className="font-semibold text-[#242B26]">
                    Smart Food Court — Pre-Ordering & Queue Management System
                  </p>
                  <p>
                    Built with Poppins Typography • Light Warm Theme • Concurrency-safe Shared Tokens
                  </p>
                  <p className="text-[11px] text-stone-400">
                    Phase 5 Integrated • Connected to PostgreSQL & Express REST Backend
                  </p>
                </div>
              </footer>
            </div>
          </CartProvider>
        </OrderProvider>
      </AuthProvider>
    </BrowserRouter>
  );
};

export default App;
