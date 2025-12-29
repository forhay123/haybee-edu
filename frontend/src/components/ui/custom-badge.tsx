// ============================================================
// FILE 5: badge.tsx (FIX variant types)
// Location: frontend/src/components/ui/badge.tsx
// ============================================================

import React from 'react';
import { cn } from '@/lib/utils';

export interface CustomBadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'secondary' | 'outline'; // ✅ FIXED
}

export const CustomBadge: React.FC<CustomBadgeProps > = ({ 
  variant = 'default', 
  className = '', 
  ...props 
}) => {
  const variantClasses = {
    default: 'bg-blue-100 text-blue-800 border-blue-200',
    success: 'bg-green-100 text-green-800 border-green-200',
    warning: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    danger: 'bg-red-100 text-red-800 border-red-200',
    secondary: 'bg-gray-100 text-gray-800 border-gray-200',
    outline: 'bg-transparent border-gray-300 text-gray-700',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border',
        variantClasses[variant],
        className
      )}
      {...props}
    />
  );
};