import { useMemo } from 'react';
import { useEditorStore } from '@/state/editorStore';

export function useFilteredBlocks() {
  const blocks = useEditorStore((state) => state.blocks);
  const filters = useEditorStore((state) => state.filters);

  return useMemo(() => {
    return blocks.filter((block) => {
      const matchesQuery =
        !filters.search ||
        block.label?.toLowerCase().includes(filters.search.toLowerCase()) ||
        block.id.toLowerCase().includes(filters.search.toLowerCase());
      const matchesType = filters.types.length === 0 || filters.types.includes(block.type);
      return matchesQuery && matchesType;
    });
  }, [blocks, filters]);
}
