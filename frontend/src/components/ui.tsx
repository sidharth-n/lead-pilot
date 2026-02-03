import React from 'react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// === BUTTON ===
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
}

export function Button({ className, variant = 'primary', size = 'md', ...props }: ButtonProps) {
  const variants = {
    primary: 'bg-blue-600 text-white hover:bg-blue-700 shadow-sm',
    secondary: 'bg-gray-100 text-gray-900 hover:bg-gray-200',
    outline: 'border border-gray-300 bg-white text-gray-700 hover:bg-gray-50',
    ghost: 'text-gray-600 hover:bg-gray-100',
    danger: 'bg-red-50 text-red-600 hover:bg-red-100 border border-red-200',
  };

  const sizes = {
    sm: 'h-8 px-3 text-sm',
    md: 'h-10 px-4',
    lg: 'h-12 px-6 text-lg',
  };

  return (
    <button
      className={cn(
        'inline-flex items-center justify-center rounded-lg font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:pointer-events-none disabled:opacity-50',
        variants[variant],
        sizes[size],
        className
      )}
      {...props}
    />
  );
}

// === CARD ===
export function Card({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <div className={cn('bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden', className)}>
      {children}
    </div>
  );
}

// === STATUS BADGE ===
export function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    draft: 'bg-gray-100 text-gray-700',
    active: 'bg-green-100 text-green-700',
    paused: 'bg-yellow-100 text-yellow-700',
    completed: 'bg-blue-100 text-blue-700',
    
    // Lead statuses
    pending: 'bg-gray-100 text-gray-500',
    sending: 'bg-blue-50 text-blue-500 animate-pulse',
    sent: 'bg-blue-100 text-blue-700',
    waiting_follow_up: 'bg-purple-100 text-purple-700',
    sending_follow_up: 'bg-purple-50 text-purple-600 animate-pulse',
    follow_up_sent: 'bg-indigo-100 text-indigo-700',
    replied: 'bg-green-100 text-green-700 font-bold', // Pop this one!
    bounced: 'bg-red-100 text-red-700',
    failed: 'bg-red-100 text-red-700',
  };

  const labels: Record<string, string> = {
    waiting_follow_up: 'Waiting Follow-up',
    sending_follow_up: 'Sending Follow-up...',
    follow_up_sent: 'Follow-up Sent',
  };

  return (
    <span className={cn('inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize', styles[status] || styles.draft)}>
      {labels[status] || status.replace(/_/g, ' ')}
    </span>
  );
}
