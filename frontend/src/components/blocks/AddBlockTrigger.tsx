import { useEffect, useRef, useState } from 'react';
import { Plus, X } from 'lucide-react';
import { useEditorStore } from '@/state/editorStore';
import type { BlockType } from '@/api/types';
import { BLOCK_TYPE_ORDER, resolveBlockTypeLabel } from '@/utils/constants';

interface AddBlockTriggerProps {
  insertAfterId?: string;
  compact?: boolean;
}

export function AddBlockTrigger({ insertAfterId, compact }: AddBlockTriggerProps): JSX.Element {
  const addBlockAfter = useEditorStore((state) => state.addBlockAfter);
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const handler = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      window.addEventListener('mousedown', handler);
    }
    return () => {
      window.removeEventListener('mousedown', handler);
    };
  }, [isOpen]);

  const handleAddBlock = (type: BlockType) => {
    addBlockAfter(insertAfterId, type);
    setIsOpen(false);
  };

  return (
    <div ref={containerRef} className="relative my-3 flex items-center justify-center">
      <div className="h-px w-full bg-border" />
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className={`absolute inline-flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-border bg-surface text-text-muted shadow-soft transition-opacity duration-150 hover:text-text-primary focus:outline-none focus:ring-2 focus:ring-primary focus-visible:opacity-100 ${compact ? '' : 'opacity-0 group-hover:opacity-100'}`}
        aria-label="Add block"
      >
        {isOpen ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
      </button>
      {isOpen && (
        <div className="absolute top-8 z-30 w-56 rounded-xl border border-border bg-surface p-2 shadow-card">
          <p className="px-2 pb-2 text-xs font-medium text-text-muted">Insert block</p>
          <div className="space-y-1">
            {BLOCK_TYPE_ORDER.map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => handleAddBlock(type)}
                className="w-full rounded-lg px-3 py-2 text-left text-sm text-text-primary transition-colors hover:bg-muted"
              >
                {resolveBlockTypeLabel(type)}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
