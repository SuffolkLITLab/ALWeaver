import { useCallback, useMemo } from 'react';
import { Code2, Eye, GripVertical, PanelRight } from 'lucide-react';
import { clsx } from 'clsx';
import type { EditorBlock } from '@/state/types';
import { useEditorStore } from '@/state/editorStore';
import { LANGUAGE_LABELS, resolveBlockTypeLabel } from '@/utils/constants';
import { BlockPreview } from './BlockPreview';
import { BlockCodeEditor } from './BlockCodeEditor';

interface BlockCardProps {
  block: EditorBlock;
  isSelected: boolean;
  virtualHeight?: number;
}

export function BlockCard({ block, isSelected }: BlockCardProps): JSX.Element {
  const viewMode = useEditorStore((state) => state.blockViewMode[block.id] ?? 'preview');
  const toggleBlockView = useEditorStore((state) => state.toggleBlockView);
  const selectBlock = useEditorStore((state) => state.selectBlock);
  const setSidebarState = useEditorStore((state) => state.setSidebarState);

  const languageLabel = LANGUAGE_LABELS[block.language] ?? block.language;

  const handleToggleView = useCallback(() => {
    toggleBlockView(block.id);
  }, [block.id, toggleBlockView]);

  const handleFocus = useCallback(() => {
    selectBlock(block.id);
  }, [block.id, selectBlock]);

  const handleOpenSidebar = useCallback(() => {
    selectBlock(block.id);
    setSidebarState({ isOpen: true, activePanel: 'properties' });
  }, [block.id, selectBlock, setSidebarState]);

  const headerTitle = useMemo(() => block.label ?? `${resolveBlockTypeLabel(block.type)} (${block.position + 1})`, [block]);

  return (
    <article
      className={clsx(
        'group rounded-3xl border bg-surface p-4 shadow-soft transition-shadow duration-200',
        isSelected ? 'border-primary shadow-card' : 'border-border hover:border-primary/60',
      )}
      onClick={handleFocus}
      role="presentation"
    >
      <header className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="rounded-full bg-muted px-3 py-1 text-xs font-semibold uppercase tracking-wide text-text-muted">
            {resolveBlockTypeLabel(block.type)}
          </span>
          <div>
            <p className="text-base font-semibold text-text-primary">{headerTitle}</p>
            <p className="text-xs text-text-muted">{block.id}</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <span className="rounded-full bg-muted px-3 py-1 text-xs text-text-muted">{languageLabel}</span>
          <button
            type="button"
            onClick={handleToggleView}
            className="inline-flex h-8 w-8 items-center justify-center rounded-full text-text-muted transition-colors hover:bg-muted hover:text-text-primary"
            aria-label={viewMode === 'preview' ? 'Switch to code view' : 'Switch to preview'}
          >
            {viewMode === 'preview' ? <Code2 className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
          <button
            type="button"
            onClick={handleOpenSidebar}
            className="inline-flex h-8 w-8 items-center justify-center rounded-full text-text-muted transition-colors hover:bg-muted hover:text-text-primary"
            aria-label="Open properties"
          >
            <PanelRight className="h-4 w-4" />
          </button>
        </div>
      </header>

      <div className="mt-4 rounded-2xl border border-dashed border-border bg-background/60 p-5">
        {viewMode === 'preview' ? <BlockPreview block={block} /> : <BlockCodeEditor block={block} />}
      </div>

      <footer className="mt-4 flex items-center justify-between text-xs text-text-muted">
        <div className="flex items-center gap-2">
          <GripVertical className="h-3.5 w-3.5 opacity-60" />
          <span>Position {block.position + 1}</span>
        </div>
        {block.metadata.isMandatory && <span className="rounded-full bg-warning/20 px-3 py-1 text-[0.7rem] text-warning">Mandatory</span>}
      </footer>
    </article>
  );
}
