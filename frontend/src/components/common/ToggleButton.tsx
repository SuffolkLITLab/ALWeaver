import { clsx } from 'clsx';
import type { ReactNode } from 'react';

export interface ToggleOption<T extends string> {
  value: T;
  label: string;
  icon?: ReactNode;
}

export interface ToggleButtonProps<T extends string> {
  options: [ToggleOption<T>, ToggleOption<T>];
  value: T;
  onChange: (value: T) => void;
  className?: string;
  size?: 'sm' | 'md';
}

export function ToggleButton<T extends string>({
  options,
  value,
  onChange,
  className,
  size = 'sm',
}: ToggleButtonProps<T>): JSX.Element {
  const sizeClasses = size === 'sm' ? 'h-8 text-sm' : 'h-9 text-sm';
  const paddingClasses = size === 'sm' ? 'px-3' : 'px-4';

  return (
    <div
      className={clsx(
        'inline-flex rounded-md border border-border bg-muted p-0.5',
        className,
      )}
      role="group"
    >
      {options.map((option) => {
        const isActive = value === option.value;
        return (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            className={clsx(
              'inline-flex items-center justify-center gap-1.5 rounded transition-colors duration-150',
              sizeClasses,
              paddingClasses,
              isActive
                ? 'bg-surface text-text-primary shadow-sm'
                : 'text-text-muted hover:text-text-primary',
            )}
            aria-pressed={isActive}
          >
            {option.icon && <span className="flex-shrink-0">{option.icon}</span>}
            <span>{option.label}</span>
          </button>
        );
      })}
    </div>
  );
}
