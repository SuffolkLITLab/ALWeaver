import { useMemo, useState } from 'react';
import { Filter, X } from 'lucide-react';
import { useEditorStore } from '@/state/editorStore';
import { BLOCK_TYPE_ORDER, resolveBlockTypeLabel } from '@/utils/constants';
import { clsx } from 'clsx';
import { useFilteredBlocks } from '@/hooks/useFilteredBlocks';

const DEFAULT_VISIBLE_COUNT = 12;

export function OutlineSidebar(): JSX.Element {
  const filters = useEditorStore((state) => state.filters);
  const selectedBlockId = useEditorStore((state) => state.selectedBlockId);
  const selectBlock = useEditorStore((state) => state.selectBlock);
  const setFilterSearch = useEditorStore((state) => state.setFilterSearch);
  const toggleFilterType = useEditorStore((state) => state.toggleFilterType);
  const toggleMandatoryFilter = useEditorStore((state) => state.toggleMandatoryFilter);
  const clearFilters = useEditorStore((state) => state.clearFilters);
  const filteredBlocks = useFilteredBlocks();

  const [showAllTypes, setShowAllTypes] = useState(false);


  const collapsedVisibleTypes = useMemo(() => {
    const base = new Set(BLOCK_TYPE_ORDER.slice(0, DEFAULT_VISIBLE_COUNT));
    filters.types.forEach((type) => {
      if (type) {
        base.add(type);
      }
    });
    return base;
  }, [filters.types]);

  const visibleTypes = useMemo(() => {
    if (showAllTypes) {
      return BLOCK_TYPE_ORDER;
    }
    return BLOCK_TYPE_ORDER.filter((type) => collapsedVisibleTypes.has(type));
  }, [showAllTypes, collapsedVisibleTypes]);

  const hiddenTypeCount = useMemo(() => {
    return BLOCK_TYPE_ORDER.filter((type) => !collapsedVisibleTypes.has(type)).length;
  }, [collapsedVisibleTypes]);

  return (
    <aside className="flex w-72 flex-col border-r border-border bg-surface">
      <div className="border-b border-border p-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-text-primary">Outline</h2>
          <button
            type="button"
            onClick={() => clearFilters()}
            className="text-xs text-text-muted hover:text-text-primary"
          >
            Reset
          </button>
        </div>
        <div className="mt-3 flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-2">
          <Filter className="h-4 w-4 text-text-muted" />
          <input
            className="w-full border-none bg-transparent text-sm outline-none"
            placeholder="Search blocks…"
            value={filters.search}
            onChange={(event) => setFilterSearch(event.currentTarget.value)}
          />
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => toggleMandatoryFilter()}
            className={clsx(
              'flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-medium transition-colors',
              filters.mandatoryOnly
                ? 'border-warning bg-warning/10 text-warning hover:bg-warning/15'
                : 'border-border text-text-muted hover:bg-muted hover:text-text-primary',
            )}
          >
            Mandatory only
            {filters.mandatoryOnly && <X className="h-3 w-3" />}
          </button>
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          {visibleTypes.map((type) => {
            const isActive = filters.types.includes(type);
            return (
              <button
                key={type}
                type="button"
                onClick={() => toggleFilterType(type)}
                className={clsx(
                  'flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-medium transition-colors',
                  isActive
                    ? 'border-primary bg-primary/10 text-primary hover:bg-primary/15'
                    : 'border-border text-text-muted hover:bg-muted hover:text-text-primary',
                )}
              >
                <span>{resolveBlockTypeLabel(type)}</span>
                {isActive && <X className="h-3 w-3" />}
              </button>
            );
          })}
        </div>
        {(hiddenTypeCount > 0 || showAllTypes) && (
          <button
            type="button"
            onClick={() => setShowAllTypes((prev) => !prev)}
            className="mt-2 text-xs font-semibold text-primary transition hover:text-primary/80"
          >
            {showAllTypes
              ? 'Show fewer block types'
              : `Show ${hiddenTypeCount} more block types`}
          </button>
        )}

      </div>

      <div className="flex-1 overflow-y-auto px-2 py-3 scrollbar-thin">
        {filteredBlocks.length === 0 ? (
          <p className="px-2 text-sm text-text-muted">No blocks match the current filters.</p>
        ) : (
          <ul className="space-y-1">
            {filteredBlocks.map((block) => (
              <li key={block.id}>
                <button
                  type="button"
                  onClick={() => selectBlock(block.id)}
                  className={clsx(
                    'flex w-full flex-col rounded-lg border border-transparent px-3 py-2 text-left transition-colors',
                    selectedBlockId === block.id
                      ? 'border-primary bg-primary/10 text-text-primary shadow-soft'
                      : 'hover:border-border hover:bg-muted',
                  )}
                >
                  <span className="text-xs uppercase tracking-wide text-text-muted">
                    {resolveBlockTypeLabel(block.type)}
                  </span>
                  <span className="truncate text-sm font-medium text-text-primary">
                    {block.label ?? block.id}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </aside>
  );
}
