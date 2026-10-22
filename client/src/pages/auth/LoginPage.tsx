import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth, SEEDED_CREDENTIALS } from '../../contexts/AuthContext';
import { Button } from '../../components/ui/Button';
import { Lock, Mail, KeyRound, UtensilsCrossed, AlertCircle } from 'lucide-react';

export const LoginPage: React.FC = () => {
  const { login, error, clearError, isLoading } = useAuth();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<'customer' | 'staff'>('customer');
  const [email, setEmail] = useState(SEEDED_CREDENTIALS.customer.email);
  const [password, setPassword] = useState(SEEDED_CREDENTIALS.customer.password);
  const [staffRole, setStaffRole] = useState<'cashier' | 'manager'>('cashier');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    const success = await login(email, password);
    if (success) {
      if (activeTab === 'customer') {
        navigate('/menu');
      } else {
        navigate(staffRole === 'cashier' ? '/cashier' : '/manager');
      }
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md bg-white rounded-3xl border border-[#E5E7E2] p-8 shadow-xl space-y-6">
        {/* Brand header */}
        <div className="text-center space-y-2">
          <div className="w-12 h-12 bg-[#244C3A] text-white rounded-2xl flex items-center justify-center mx-auto shadow-xs">
            <UtensilsCrossed className="w-6 h-6" />
          </div>
          <h1 className="text-2xl font-bold text-[#242B26]">Sign In</h1>
          <p className="text-xs text-[#68716A]">
            Access Smart Food Court pre-ordering or staff operational dashboards
          </p>
        </div>

        {/* Tab switcher: Customer vs Staff */}
        <div className="flex bg-[#FAF8F3] p-1 rounded-xl border border-[#E5E7E2]">
          <button
            type="button"
            onClick={() => {
              setActiveTab('customer');
              setEmail(SEEDED_CREDENTIALS.customer.email);
              setPassword(SEEDED_CREDENTIALS.customer.password);
              clearError();
            }}
            className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
              activeTab === 'customer'
                ? 'bg-white text-[#244C3A] shadow-xs'
                : 'text-[#68716A] hover:text-[#242B26]'
            }`}
          >
            Customer Sign In
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab('staff');
              setEmail(staffRole === 'cashier' ? SEEDED_CREDENTIALS.cashier.email : SEEDED_CREDENTIALS.manager.email);
              setPassword(staffRole === 'cashier' ? SEEDED_CREDENTIALS.cashier.password : SEEDED_CREDENTIALS.manager.password);
              clearError();
            }}
            className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
              activeTab === 'staff'
                ? 'bg-white text-[#244C3A] shadow-xs'
                : 'text-[#68716A] hover:text-[#242B26]'
            }`}
          >
            Staff Portal
          </button>
        </div>

        {/* Error notification */}
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {activeTab === 'staff' && (
            <div className="p-3 bg-[#E8F1E9] rounded-xl border border-[#244C3A]/20 space-y-2">
              <span className="text-xs font-semibold text-[#244C3A] block">
                Select Seeded Staff Account
              </span>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setStaffRole('cashier');
                    setEmail(SEEDED_CREDENTIALS.cashier.email);
                    setPassword(SEEDED_CREDENTIALS.cashier.password);
                    clearError();
                  }}
                  className={`py-1.5 px-3 text-xs font-medium rounded-lg border text-center transition-all cursor-pointer ${
                    staffRole === 'cashier'
                      ? 'bg-[#244C3A] text-white border-[#244C3A]'
                      : 'bg-white text-[#242B26] border-[#E5E7E2]'
                  }`}
                >
                  Cashier Account
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setStaffRole('manager');
                    setEmail(SEEDED_CREDENTIALS.manager.email);
                    setPassword(SEEDED_CREDENTIALS.manager.password);
                    clearError();
                  }}
                  className={`py-1.5 px-3 text-xs font-medium rounded-lg border text-center transition-all cursor-pointer ${
                    staffRole === 'manager'
                      ? 'bg-[#244C3A] text-white border-[#244C3A]'
                      : 'bg-white text-[#242B26] border-[#E5E7E2]'
                  }`}
                >
                  Manager Account
                </button>
              </div>
              <p className="text-[10px] text-stone-600">
                Staff accounts are securely seeded with Argon2id passwords.
              </p>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-[#242B26] mb-1">
              Login Identifier / Email
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-[#68716A] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="email"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs sm:text-sm rounded-lg border border-[#E5E7E2] focus:outline-none focus:ring-2 focus:ring-[#244C3A]"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#242B26] mb-1">
              Password
            </label>
            <div className="relative">
              <KeyRound className="w-4 h-4 text-[#68716A] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="password"
                required
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs sm:text-sm rounded-lg border border-[#E5E7E2] focus:outline-none focus:ring-2 focus:ring-[#244C3A]"
              />
            </div>
          </div>

          <Button
            type="submit"
            variant="primary"
            size="lg"
            fullWidth
            disabled={isLoading}
            icon={<Lock className="w-4 h-4" />}
          >
            {isLoading
              ? 'Authenticating...'
              : activeTab === 'customer'
              ? 'Sign In as Customer'
              : `Sign In as ${staffRole.toUpperCase()}`}
          </Button>
        </form>

        {/* Public registration link */}
        {activeTab === 'customer' && (
          <div className="pt-2 border-t border-[#E5E7E2] text-center text-xs text-[#68716A]">
            Don't have a student account?{' '}
            <Link to="/auth/register" className="font-semibold text-[#244C3A] hover:underline">
              Register here
            </Link>
          </div>
        )}
      </div>
    </div>
  );
};
