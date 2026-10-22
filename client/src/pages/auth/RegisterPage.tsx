import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { Button } from '../../components/ui/Button';
import { User, Mail, Phone, Lock, UtensilsCrossed, ShieldAlert, AlertCircle } from 'lucide-react';

export const RegisterPage: React.FC = () => {
  const { registerCustomer, error: authError, clearError, isLoading } = useAuth();
  const navigate = useNavigate();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);
    clearError();

    if (password !== confirmPassword) {
      setLocalError('Passwords do not match');
      return;
    }

    if (password.length < 8) {
      setLocalError('Password must be at least 8 characters long');
      return;
    }

    // MANDATORY RULE: Public registration always registers as Customer strictly!
    const success = await registerCustomer(name.trim(), email.trim(), password, phone.trim());
    if (success) {
      navigate('/menu');
    }
  };

  const displayedError = localError || authError;

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md bg-white rounded-3xl border border-[#E5E7E2] p-8 shadow-xl space-y-6">
        {/* Brand header */}
        <div className="text-center space-y-2">
          <div className="w-12 h-12 bg-[#244C3A] text-white rounded-2xl flex items-center justify-center mx-auto shadow-xs">
            <UtensilsCrossed className="w-6 h-6" />
          </div>
          <h1 className="text-2xl font-bold text-[#242B26]">Create Customer Account</h1>
          <p className="text-xs text-[#68716A]">
            Register as a campus student or faculty member for meal pre-ordering
          </p>
        </div>

        {/* Security callout about roles */}
        <div className="p-3 bg-[#FAF8F3] rounded-xl border border-[#E5E7E2] text-[11px] text-[#68716A] flex items-center gap-2">
          <ShieldAlert className="w-4 h-4 text-[#244C3A] shrink-0" />
          <span>
            Public registration creates a Customer account strictly. Staff accounts are seeded by administrators.
          </span>
        </div>

        {displayedError && (
          <div className="p-3 bg-red-50 rounded-xl border border-red-200 text-xs text-red-700 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
            <span>{displayedError}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-[#242B26] mb-1">
              Full Name <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <User className="w-4 h-4 text-[#68716A] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                required
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Rohan Sharma"
                className="w-full pl-9 pr-3 py-2 text-xs sm:text-sm rounded-lg border border-[#E5E7E2] focus:outline-none focus:ring-2 focus:ring-[#244C3A]"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#242B26] mb-1">
              Email Address <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-[#68716A] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="email"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="rohan@college.edu"
                className="w-full pl-9 pr-3 py-2 text-xs sm:text-sm rounded-lg border border-[#E5E7E2] focus:outline-none focus:ring-2 focus:ring-[#244C3A]"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#242B26] mb-1">
              Phone Number
            </label>
            <div className="relative">
              <Phone className="w-4 h-4 text-[#68716A] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="tel"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                placeholder="+91 98765 43210"
                className="w-full pl-9 pr-3 py-2 text-xs sm:text-sm rounded-lg border border-[#E5E7E2] focus:outline-none focus:ring-2 focus:ring-[#244C3A]"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#242B26] mb-1">
              Password (min. 8 characters) <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-[#68716A] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="password"
                required
                minLength={8}
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-9 pr-3 py-2 text-xs sm:text-sm rounded-lg border border-[#E5E7E2] focus:outline-none focus:ring-2 focus:ring-[#244C3A]"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#242B26] mb-1">
              Confirm Password <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-[#68716A] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="password"
                required
                minLength={8}
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
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
            {isLoading ? 'Creating Account...' : 'Complete Customer Registration'}
          </Button>
        </form>

        <div className="pt-2 border-t border-[#E5E7E2] text-center text-xs text-[#68716A]">
          Already have an account?{' '}
          <Link to="/auth/login" className="font-semibold text-[#244C3A] hover:underline">
            Sign In
          </Link>
        </div>
      </div>
    </div>
  );
};
