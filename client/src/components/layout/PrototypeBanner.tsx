import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { UserRole } from '../../types';
import { UserCheck, Store, ChefHat, Sparkles } from 'lucide-react';

export const PrototypeBanner: React.FC = () => {
  const { currentUser, switchRole, isLoading } = useAuth();
  const navigate = useNavigate();

  const roles: { role: UserRole; label: string; icon: React.ReactNode; targetPath: string }[] = [
    { role: 'customer', label: 'Customer View', icon: <UserCheck className="w-3.5 h-3.5" />, targetPath: '/menu' },
    { role: 'cashier', label: 'Cashier Dashboard', icon: <Store className="w-3.5 h-3.5" />, targetPath: '/cashier' },
    { role: 'manager', label: 'Manager Dashboard', icon: <ChefHat className="w-3.5 h-3.5" />, targetPath: '/manager' },
  ];

  const handleRoleClick = async (role: UserRole, targetPath: string) => {
    await switchRole(role);
    navigate(targetPath);
  };

  return (
    <div className="bg-[#244C3A] text-white text-xs py-2 px-4 border-b border-[#19392B] no-print">
      <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1 bg-[#F3B562] text-[#244C3A] font-bold px-2 py-0.5 rounded text-[11px]">
            <Sparkles className="w-3 h-3" /> Phase 5 Integrated
          </span>
          <span className="hidden sm:inline text-stone-200">
            Real PostgreSQL backend & session auth active. Quick switch role:
          </span>
        </div>

        <div className="flex items-center gap-1.5 bg-[#19392B] p-1 rounded-lg">
          {roles.map(({ role, label, icon, targetPath }) => {
            const isActive = currentUser.role === role;
            return (
              <button
                key={role}
                disabled={isLoading}
                onClick={() => handleRoleClick(role, targetPath)}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-medium transition-all cursor-pointer disabled:opacity-50 ${
                  isActive
                    ? 'bg-white text-[#244C3A] font-semibold shadow-xs'
                    : 'text-stone-300 hover:text-white hover:bg-white/10'
                }`}
              >
                {icon}
                <span>{label}</span>
              </button>
            );
          })}
        </div>

        <div className="hidden lg:flex items-center gap-2 text-[11px] text-stone-300">
          <span>Active: <strong className="text-white">{currentUser.name || 'Guest'}</strong></span>
          <span className="text-[#F3B562]">({currentUser.role.toUpperCase()})</span>
        </div>
      </div>
    </div>
  );
};
