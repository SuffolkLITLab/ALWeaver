import type { HTMLAttributes } from 'react';
import { clsx } from 'clsx';

type BadgeTone = 'neutral' | 'success' | 'danger' | 'warning' | 'info';

const TONE_STYLES: Record<BadgeTone, string> = {
  neutral: 'bg-muted text-text-muted border border-border',
  success: 'bg-green-100 text-success border border-green-200',
  danger: 'bg-red-100 text-danger border border-red-200',
  warning: 'bg-amber-100 text-warning border border-amber-200',
  info: 'bg-sky-100 text-accent border border-sky-200',
};

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: BadgeTone;
}

export function Badge({ tone = 'neutral', className, children, ...rest }: BadgeProps): JSX.Element {
  return (
    <span
      className={clsx('inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium', TONE_STYLES[tone], className)}
      {...rest}
    >
      {children}
    </span>
  );
}
