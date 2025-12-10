import { useEffect, useState } from 'react';
import { clsx } from 'clsx';
import { CheckCircle, XCircle, Info } from 'lucide-react';

export type ToastStatus = 'success' | 'error' | 'info';

export interface StatusToastProps {
  message: string;
  status: ToastStatus;
  visible: boolean;
  onDismiss?: () => void;
  /** Auto-dismiss after this many milliseconds (default: 3000). Set to 0 to disable. */
  autoDismissMs?: number;
}

const STATUS_STYLES: Record<ToastStatus, { bg: string; icon: typeof CheckCircle }> = {
  success: { bg: 'bg-success/10 border-success/30 text-success', icon: CheckCircle },
  error: { bg: 'bg-danger/10 border-danger/30 text-danger', icon: XCircle },
  info: { bg: 'bg-primary/10 border-primary/30 text-primary', icon: Info },
};

export function StatusToast({
  message,
  status,
  visible,
  onDismiss,
  autoDismissMs = 3000,
}: StatusToastProps): JSX.Element | null {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (visible) {
      // Small delay to trigger CSS transition
      const showTimer = setTimeout(() => setShow(true), 10);
      return () => clearTimeout(showTimer);
    } else {
      setShow(false);
    }
  }, [visible]);

  useEffect(() => {
    if (visible && autoDismissMs > 0 && onDismiss) {
      const timer = setTimeout(onDismiss, autoDismissMs);
      return () => clearTimeout(timer);
    }
  }, [visible, autoDismissMs, onDismiss]);

  if (!visible && !show) return null;

  const { bg, icon: Icon } = STATUS_STYLES[status];

  return (
    <div
      className={clsx(
        'fixed bottom-4 right-4 z-50 flex items-center gap-2 rounded-lg border px-4 py-2.5 text-sm shadow-lg transition-all duration-300',
        bg,
        show ? 'translate-y-0 opacity-100' : 'translate-y-2 opacity-0',
      )}
      role="status"
      aria-live="polite"
    >
      <Icon className="h-4 w-4 flex-shrink-0" />
      <span>{message}</span>
    </div>
  );
}
