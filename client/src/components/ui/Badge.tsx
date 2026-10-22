import React from 'react';
import { OrderStatus, PaymentStatus } from '../../types';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'default' | 'success' | 'warning' | 'error' | 'info' | 'neutral';
  size?: 'sm' | 'md';
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'default',
  size = 'md',
  className = '',
}) => {
  const sizeStyles = {
    sm: 'text-[11px] px-2 py-0.5',
    md: 'text-xs px-2.5 py-1',
  };

  const variantStyles = {
    default: 'bg-[#E8F1E9] text-[#244C3A] border border-[#244C3A]/20',
    success: 'bg-emerald-50 text-emerald-800 border border-emerald-200',
    warning: 'bg-amber-50 text-amber-800 border border-amber-200',
    error: 'bg-red-50 text-red-700 border border-red-200',
    info: 'bg-sky-50 text-sky-800 border border-sky-200',
    neutral: 'bg-stone-100 text-stone-700 border border-stone-200',
  };

  return (
    <span
      className={`inline-flex items-center justify-center font-medium rounded-full ${sizeStyles[size]} ${variantStyles[variant]} ${className}`}
    >
      {children}
    </span>
  );
};

export const OrderStatusBadge: React.FC<{ status: OrderStatus; size?: 'sm' | 'md' }> = ({ status, size = 'md' }) => {
  switch (status) {
    case 'ordered':
      return <Badge variant="info" size={size}>Ordered</Badge>;
    case 'preparing':
      return <Badge variant="warning" size={size}>Preparing</Badge>;
    case 'ready':
      return <Badge variant="success" size={size}>Ready for Pickup</Badge>;
    case 'completed':
      return <Badge variant="neutral" size={size}>Completed</Badge>;
    default:
      return <Badge variant="neutral" size={size}>{status}</Badge>;
  }
};

export const AvailabilityBadge: React.FC<{ isAvailable: boolean }> = ({ isAvailable }) => {
  if (isAvailable) {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-[#E8F1E9] text-[#244C3A]">
        <span className="w-1.5 h-1.5 rounded-full bg-[#244C3A]" />
        Available
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-50 text-red-700 border border-red-200">
      <span className="w-1.5 h-1.5 rounded-full bg-red-600" />
      Unavailable
    </span>
  );
};

export const PaymentBadge: React.FC<{ status: PaymentStatus }> = ({ status }) => {
  if (status === 'paid') {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800">
        Paid
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-900 border border-amber-300">
      Pending
    </span>
  );
};
