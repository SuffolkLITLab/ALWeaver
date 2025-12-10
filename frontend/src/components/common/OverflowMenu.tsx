import { useState, useRef, useEffect } from 'react';
import { Menu, X } from 'lucide-react';
import { clsx } from 'clsx';

export interface OverflowMenuItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  variant?: 'ghost' | 'secondary' | 'primary';
}

interface OverflowMenuProps {
  items: OverflowMenuItem[];
  label?: string;
}

export function OverflowMenu({ items, label = 'Menu' }: OverflowMenuProps): JSX.Element {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [isOpen]);

  const getButtonClasses = (variant: string = 'ghost'): string => {
    const baseClasses = 'w-full flex items-center gap-3 px-4 py-2 text-sm text-left transition-colors';
    switch (variant) {
      case 'primary':
        return clsx(baseClasses, 'hover:bg-primary/10 text-text-primary');
      case 'secondary':
        return clsx(baseClasses, 'hover:bg-muted text-text-primary');
      default:
        return clsx(baseClasses, 'hover:bg-muted text-text-primary');
    }
  };

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={clsx(
          'flex items-center justify-center h-9 w-9 rounded-md border border-border transition-colors',
          isOpen ? 'bg-muted text-text-primary' : 'hover:bg-muted text-text-muted hover:text-text-primary',
        )}
        aria-label={label}
        type="button"
      >
        {isOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-56 rounded-lg border border-border bg-surface shadow-lg z-50">
          <div className="py-1">
            {items.map((item) => (
              <button
                key={item.id}
                onClick={() => {
                  item.onClick();
                  setIsOpen(false);
                }}
                disabled={item.disabled}
                className={clsx(
                  getButtonClasses(item.variant),
                  item.disabled && 'opacity-50 cursor-not-allowed hover:bg-surface',
                )}
                type="button"
              >
                <span className="flex-shrink-0">{item.icon}</span>
                <span className="flex-1">{item.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
