import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import type { BlockSummary, BlockType } from '@/api/types';
import type { EditorStore, EditorBlock, BlockViewMode } from './types';
import { buildYamlDocument, parseBlockFromRaw, parseBlocksFromYaml } from '@/utils/yaml';

const DEFAULT_BLOCK_VIEW: BlockViewMode = 'preview';

const deriveSidebarPanel = (block?: EditorBlock): EditorStore['sidebar']['activePanel'] => {
  if (!block) {
    return 'properties';
  }
  if (block.metadata.isMetadata) {
    return 'metadata';
  }
  if (block.metadata.isAttachment) {
    return 'attachment';
  }
  if (block.metadata.isMandatory) {
    return 'mandatory';
  }
  return 'properties';
};

export const useEditorStore = create<EditorStore>()(
  immer((set, get) => ({
    yamlDocument: '',
    blocks: [],
    selectedBlockId: undefined,
    blockViewMode: {},
    filters: {
      search: '',
      types: [],
    },
    sidebar: {
      isOpen: false,
      pinned: false,
      activePanel: 'properties',
    },
    validation: {
      status: 'idle',
      issues: [],
    },
    summaries: {},

    initializeFromYaml: (yaml) => {
      const blocks = parseBlocksFromYaml(yaml);
      set((state) => {
        state.yamlDocument = yaml;
        state.blocks = blocks;
        state.blockViewMode = {};
        blocks.forEach((block) => {
          state.blockViewMode[block.id] = DEFAULT_BLOCK_VIEW;
        });
        state.sidebar = {
          isOpen: false,
          pinned: false,
          activePanel: 'properties',
        };
        state.selectedBlockId = undefined;
        state.validation = {
          status: 'idle',
          issues: [],
        };
        state.summaries = {};
      });
    },

    setBlocks: (blocks) => {
      set((state) => {
        state.blocks = blocks;
        state.yamlDocument = buildYamlDocument(blocks);

        const nextModes: Record<string, BlockViewMode> = {};
        blocks.forEach((block) => {
          nextModes[block.id] = state.blockViewMode[block.id] ?? DEFAULT_BLOCK_VIEW;
        });
        state.blockViewMode = nextModes;
        state.summaries = {};
      });
    },

    selectBlock: (blockId) => {
      set((state) => {
        state.selectedBlockId = blockId;
        const block = state.blocks.find((candidate) => candidate.id === blockId);
        state.sidebar.activePanel = deriveSidebarPanel(block);
        if (blockId) {
          state.sidebar.isOpen = true;
        } else if (!state.sidebar.pinned) {
          state.sidebar.isOpen = false;
        }
      });
    },

    toggleBlockView: (blockId, mode) => {
      set((state) => {
        const current = state.blockViewMode[blockId] ?? DEFAULT_BLOCK_VIEW;
        const next = mode ?? (current === 'preview' ? 'code' : 'preview');
        state.blockViewMode[blockId] = next;
      });
    },

    setFilterSearch: (search) => {
      set((state) => {
        state.filters.search = search;
      });
    },

    toggleFilterType: (blockType: BlockType) => {
      set((state) => {
        const next = new Set(state.filters.types);
        if (next.has(blockType)) {
          next.delete(blockType);
        } else {
          next.add(blockType);
        }
        state.filters.types = Array.from(next);
      });
    },

    clearFilters: () => {
      set((state) => {
        state.filters = {
          search: '',
          types: [],
        };
      });
    },

    setYamlDocument: (yaml) => {
      const blocks = parseBlocksFromYaml(yaml);
      set((state) => {
        state.yamlDocument = yaml;
        state.blocks = blocks;
        const nextModes: Record<string, BlockViewMode> = {};
        blocks.forEach((block) => {
          nextModes[block.id] = state.blockViewMode[block.id] ?? DEFAULT_BLOCK_VIEW;
        });
        state.blockViewMode = nextModes;
        state.summaries = {};
      });
    },

    setValidationState: (validation) => {
      set((state) => {
        state.validation = {
          ...state.validation,
          ...validation,
          issues: validation.issues ?? state.validation.issues,
        };
      });
    },

    setSidebarState: (nextSidebar) => {
      set((state) => {
        state.sidebar = {
          ...state.sidebar,
          ...nextSidebar,
        };
      });
    },

    setBlockMetadata: (blockId, metadata) => {
      set((state) => {
        const target = state.blocks.find((block) => block.id === blockId);
        if (!target) {
          return;
        }
        target.metadata = {
          ...target.metadata,
          ...metadata,
          rawData: {
            ...(target.metadata.rawData ?? {}),
            ...(metadata.rawData ?? {}),
          },
        };

        if (target.metadata.rawData) {
          target.raw = buildYamlDocument([target]).trim();
        }
        state.yamlDocument = buildYamlDocument(state.blocks);
      });
    },

    upsertBlockFromRaw: (blockId, raw) => {
      set((state) => {
        const existingIndex = state.blocks.findIndex((block) => block.id === blockId);
        if (existingIndex === -1) {
          const nextBlock = parseBlockFromRaw(raw, state.blocks.length);
          nextBlock.id = blockId;
          state.blocks.push(nextBlock);
          state.blockViewMode[blockId] = state.blockViewMode[blockId] ?? 'code';
        } else {
          const reference = state.blocks[existingIndex];
          const updated = parseBlockFromRaw(raw, reference.position);
          state.blocks[existingIndex] = {
            ...updated,
            id: blockId,
            position: reference.position,
          };
          state.blockViewMode[blockId] = state.blockViewMode[blockId] ?? 'code';
        }

        state.yamlDocument = buildYamlDocument(state.blocks);
      });
    },
    setServerSummaries: (summaries) => {
      set((state) => {
        const summaryMap: Record<string, BlockSummary> = {};
        summaries.forEach((summary) => {
          summaryMap[summary.id] = summary;
        });

        state.summaries = summaryMap;

        state.blocks = state.blocks.map((block) => {
          const summary = summaryMap[block.id];
          if (!summary) {
            return block;
          }

          const updated: EditorBlock = {
            ...block,
            type: summary.type,
            label: summary.label ?? block.label,
            language: summary.language,
            metadata: {
              ...block.metadata,
              orderItems: summary.order_items ?? block.metadata.orderItems,
              isMandatory:
                summary.isMandatory ??
                (block.type === 'interview_order' ? block.metadata.isMandatory : block.metadata.isMandatory),
              isAttachment: summary.isAttachment ?? block.metadata.isAttachment,
              isMetadata: summary.isMetadata ?? block.metadata.isMetadata,
            },
          };

          return updated;
        });
      });
    },
  })),
);
