import { forwardRef } from 'react';
import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { clsx } from 'clsx';

type ButtonVariant = 'primary' | 'secondary' | 'ghost';
type ButtonSize = 'sm' | 'md';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  fullWidth?: boolean;
}

const VARIANT_STYLES: Record<ButtonVariant, string> = {
  primary:
    'bg-primary text-white shadow-soft hover:bg-blue-600 focus-visible:ring-2 focus-visible:ring-primary/60',
  secondary:
    'bg-surface border border-border text-text-primary hover:bg-muted focus-visible:ring-2 focus-visible:ring-primary/30',
  ghost:
    'text-text-muted hover:text-text-primary hover:bg-muted focus-visible:ring-2 focus-visible:ring-primary/20',
};

const SIZE_STYLES: Record<ButtonSize, string> = {
  sm: 'h-9 px-3 text-sm',
  md: 'h-10 px-4 text-sm font-medium',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    { variant = 'primary', size = 'md', leftIcon, rightIcon, fullWidth, className, children, ...rest },
    ref,
  ) => {
    return (
      <button
        ref={ref}
        className={clsx(
          'inline-flex items-center justify-center gap-2 rounded-lg transition-all duration-150 focus:outline-none disabled:cursor-not-allowed disabled:opacity-60',
          VARIANT_STYLES[variant],
          SIZE_STYLES[size],
          fullWidth && 'w-full',
          className,
        )}
        {...rest}
      >
        {leftIcon}
        {children}
        {rightIcon}
      </button>
    );
  },
);

Button.displayName = 'Button';
