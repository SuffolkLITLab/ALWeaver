import { useMemo } from 'react';
import { useFilteredBlocks } from '@/hooks/useFilteredBlocks';
import { useEditorStore } from '@/state/editorStore';
import { BlockCard } from '../blocks/BlockCard';
import { AddBlockTrigger } from '../blocks/AddBlockTrigger';

export function EditorCanvas(): JSX.Element {
  const blocks = useFilteredBlocks();
  const selectedBlockId = useEditorStore((state) => state.selectedBlockId);

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
    <section className="flex-1 overflow-y-auto bg-transparent px-6 py-6 scrollbar-thin">
      <div className="mx-auto flex max-w-5xl flex-col gap-4">
        <AddBlockTrigger compact insertAfterId={undefined} />
        {blocks.length === 0
          ? emptyState
          : blocks.map((block, index) => (
              <div key={block.id} className="group">
                <BlockCard block={block} isSelected={selectedBlockId === block.id} />
                <AddBlockTrigger insertAfterId={block.id} compact={index === blocks.length - 1} />
              </div>
            ))}
      </div>
    </section>
  );
}
