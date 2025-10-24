import { create } from 'zustand';
import type { Block, BlockMode, ValidationIssue } from '../types/blocks';
import { sampleInterviewYaml } from '../data/sampleInterview';
import {
  parseBlocksFromYaml,
  serializeBlocksToYaml,
  mergeBlocks,
  addBlock,
  ensureUniqueId,
  deriveFlowElements,
} from '../utils/yamlMapper';

type VisualPanel = 'form' | 'preview' | 'flow';

type BlockStore = {
  blocks: Block[];
  selectedBlockId?: string;
  mode: BlockMode;
  visualPanel: VisualPanel;
  validationIssues: ValidationIssue[];
  isDirty: boolean;
  selectBlock: (id: string) => void;
  setMode: (mode: BlockMode) => void;
  setVisualPanel: (panel: VisualPanel) => void;
  updateBlock: (blockId: string, updater: (block: Block) => Block) => void;
  addNewBlock: (type: Block['type']) => void;
  deleteBlock: (blockId: string) => void;
  loadYaml: (yaml: string) => void;
  exportYaml: () => string;
  getFlowElements: () => ReturnType<typeof deriveFlowElements>;
  setValidationIssues: (issues: ValidationIssue[]) => void;
};

const initialBlocks = parseBlocksFromYaml(sampleInterviewYaml);

export const useBlockStore = create<BlockStore>((set, get) => ({
  blocks: initialBlocks,
  selectedBlockId: initialBlocks[0]?.id,
  mode: 'visual',
  visualPanel: 'flow',
  validationIssues: [],
  isDirty: false,
  selectBlock: (id) => set({ selectedBlockId: id }),
  setMode: (mode) => set({ mode }),
  setVisualPanel: (panel) => set({ visualPanel: panel }),
  updateBlock: (blockId, updater) =>
    set((state) => {
      const block = state.blocks.find(({ id }) => id === blockId);
      if (!block) return state;

      const nextBlock = updater(block);
      const blocks = mergeBlocks(state.blocks, nextBlock);
      return {
        ...state,
        blocks,
        isDirty: true,
      };
    }),
  addNewBlock: (type) =>
    set((state) => {
      const id = ensureUniqueId(state.blocks, type);
      const base: Block = {
        id,
        type,
        content: `${type}: placeholder`,
        language: type === 'code' || type === 'interview_order' ? 'python' : 'yaml',
        label: `${type[0].toUpperCase()}${type.slice(1)} block`,
        position: state.blocks.length,
      };
      const blocks = addBlock(state.blocks, base);
      return {
        ...state,
        blocks,
        selectedBlockId: id,
        isDirty: true,
      };
    }),
  deleteBlock: (blockId) =>
    set((state) => ({
      blocks: state.blocks.filter(({ id }) => id !== blockId),
      selectedBlockId: state.selectedBlockId === blockId ? state.blocks[0]?.id : state.selectedBlockId,
      isDirty: true,
    })),
  loadYaml: (yaml) => {
    const blocks = parseBlocksFromYaml(yaml);
    set({
      blocks,
      selectedBlockId: blocks[0]?.id,
      isDirty: false,
      validationIssues: [],
    });
  },
  exportYaml: () => serializeBlocksToYaml(get().blocks),
  getFlowElements: () => deriveFlowElements(get().blocks),
  setValidationIssues: (issues) => set({ validationIssues: issues }),
}));
