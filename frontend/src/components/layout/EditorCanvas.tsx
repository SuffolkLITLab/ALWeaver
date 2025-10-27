import { useMemo, useRef } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { useFilteredBlocks } from '@/hooks/useFilteredBlocks';
import { useEditorStore } from '@/state/editorStore';
import { BlockCard } from '../blocks/BlockCard';

export function EditorCanvas(): JSX.Element {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const blocks = useFilteredBlocks();
  const selectedBlockId = useEditorStore((state) => state.selectedBlockId);

  const rowVirtualizer = useVirtualizer({
    count: blocks.length,
    getScrollElement: () => containerRef.current,
    estimateSize: () => 340,
    overscan: 6,
  });

  const virtualItems = rowVirtualizer.getVirtualItems();
  const paddingStart = virtualItems[0]?.start ?? 0;

  const emptyState = useMemo(
    () => (
      <div className="flex h-full flex-1 flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-surface/60">
        <p className="text-sm text-text-muted">No blocks match the current filters.</p>
        <p className="text-xs text-text-muted">Adjust your filters or add a new block.</p>
      </div>
    ),
    [],
  );

  return (
    <section ref={containerRef} className="flex-1 overflow-y-auto bg-transparent px-6 py-6 scrollbar-thin">
      {blocks.length === 0 ? (
        emptyState
      ) : (
        <div className="relative" style={{ height: rowVirtualizer.getTotalSize(), width: '100%' }}>
          <div style={{ transform: `translateY(${paddingStart}px)` }} className="absolute left-0 top-0 w-full space-y-4">
            {virtualItems.map((virtualRow) => {
              const block = blocks[virtualRow.index];
              return (
                <BlockCard
                  key={block.id}
                  block={block}
                  isSelected={selectedBlockId === block.id}
                  virtualHeight={virtualRow.size}
                />
              );
            })}
          </div>
        </div>
      )}
    </section>
  );
}
