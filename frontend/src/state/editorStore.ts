import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import type { BlockSummary, BlockType } from '@/api/types';
import type { EditorStore, EditorBlock, BlockViewMode, OriginalYaml } from './types';
import { buildYamlDocument, parseBlockFromRaw, parseBlocksFromYaml, serializeBlock } from '@/utils/yaml';
import { createBlockTemplate } from '@/utils/blockTemplates';

const defaultBlockView = (block: EditorBlock): BlockViewMode => {
  return block.type === 'code' ? 'code' : 'preview';
};
const DEFAULT_DOCUMENT_NAME = 'untitled.yml';

const deriveSidebarPanel = (block?: EditorBlock): EditorStore['sidebar']['activePanel'] => {
  if (!block) {
    return 'properties';
  }
  if (block.metadata.isInterviewOrder) {
    return 'mandatory';
  }
  if (block.metadata.isMetadata) {
    return 'metadata';
  }
  if (block.metadata.isAttachment) {
    return 'attachment';
  }
  return 'properties';
};

export const useEditorStore = create<EditorStore>()(
  immer((set) => ({
    yamlDocument: '',
    blocks: [],
    selectedBlockId: undefined,
    blockViewMode: {},
    filters: {
      search: '',
      types: [],
      mandatoryOnly: false,
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
    activeView: 'visual',
    documentName: DEFAULT_DOCUMENT_NAME,
    originalYaml: '',

    initializeFromYaml: (yaml, options) => {
      const blocks = parseBlocksFromYaml(yaml);
      set((state) => {
        state.yamlDocument = yaml;
        state.originalYaml = yaml;
        state.blocks = blocks;
        state.blockViewMode = {};
        blocks.forEach((block) => {
          state.blockViewMode[block.id] = defaultBlockView(block);
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
        state.filters = {
          search: '',
          types: [],
          mandatoryOnly: false,
        };
        state.documentName = options?.documentName ?? state.documentName ?? DEFAULT_DOCUMENT_NAME;
      });
    },

    setBlocks: (blocks) => {
      set((state) => {
        state.blocks = blocks;
        state.yamlDocument = buildYamlDocument(blocks);

        const nextModes: Record<string, BlockViewMode> = {};
        blocks.forEach((block) => {
          nextModes[block.id] = state.blockViewMode[block.id] ?? defaultBlockView(block);
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
        const target = state.blocks.find((candidate) => candidate.id === blockId);
        const fallback = target ? defaultBlockView(target) : 'preview';
        const current = state.blockViewMode[blockId] ?? fallback;
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
    toggleMandatoryFilter: () => {
      set((state) => {
        state.filters.mandatoryOnly = !state.filters.mandatoryOnly;
      });
    },

    clearFilters: () => {
      set((state) => {
        state.filters = {
          search: '',
          types: [],
          mandatoryOnly: false,
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
          nextModes[block.id] = state.blockViewMode[block.id] ?? defaultBlockView(block);
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
          state.blockViewMode[blockId] = state.blockViewMode[blockId] ?? defaultBlockView(nextBlock);
        } else {
          const reference = state.blocks[existingIndex];
          const updated = parseBlockFromRaw(raw, reference.position);
          state.blocks[existingIndex] = {
            ...updated,
            id: blockId,
            position: reference.position,
          };
          state.blockViewMode[blockId] = state.blockViewMode[blockId] ?? defaultBlockView(updated);
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
              isMandatory: summary.isMandatory ?? block.metadata.isMandatory,
              isAttachment: summary.isAttachment ?? block.metadata.isAttachment,
              isMetadata: summary.isMetadata ?? block.metadata.isMetadata,
            },
          };

          return updated;
        });
      });
    },
    setActiveView: (view) => {
      set((state) => {
        state.activeView = view;
        if (view !== 'visual') {
          state.sidebar.isOpen = false;
        }
      });
    },
    setDocumentName: (name) => {
      set((state) => {
        state.documentName = name || DEFAULT_DOCUMENT_NAME;
      });
    },
    addBlockAfter: (blockId, type) => {
      set((state) => {
        const template = createBlockTemplate(type);
        const serializedBlocks = state.blocks.map((block) => serializeBlock(block));
        const insertIndex = blockId ? state.blocks.findIndex((block) => block.id === blockId) : -1;

        if (insertIndex === -1 && blockId) {
          return;
        }

        serializedBlocks.splice(insertIndex + 1, 0, template);

        const nextYaml = serializedBlocks.join('\n\n---\n\n');
        const nextBlocks = parseBlocksFromYaml(nextYaml);

        const nextModes: Record<string, BlockViewMode> = {};
        nextBlocks.forEach((block) => {
          nextModes[block.id] = state.blockViewMode[block.id] ?? defaultBlockView(block);
        });

        state.yamlDocument = nextYaml;
        state.blocks = nextBlocks;
        state.blockViewMode = nextModes;
        state.summaries = {};

        const createdBlock = nextBlocks[insertIndex + 1];
        if (createdBlock) {
          state.selectedBlockId = createdBlock.id;
          state.sidebar.activePanel = deriveSidebarPanel(createdBlock);
          state.sidebar.isOpen = true;
        }
      });
    },
  })),
);
