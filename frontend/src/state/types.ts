import type { BlockLanguage, BlockSummary, BlockType, ValidationIssue } from '@/api/types';

export interface QuestionFieldPreview {
  id: string;
  label: string;
  variable: string;
  datatype?: string;
  required?: boolean;
}

export interface QuestionPreview {
  question?: string;
  subquestion?: string;
  fields: QuestionFieldPreview[];
}

export interface BlockMetadata {
  isMandatory: boolean;
  isAttachment: boolean;
  isMetadata: boolean;
  orderItems: string[];
  questionPreview?: QuestionPreview;
  rawData?: Record<string, unknown>;
}

export interface EditorBlock {
  id: string;
  type: BlockType;
  label?: string | null;
  language: BlockLanguage;
  position: number;
  raw: string;
  metadata: BlockMetadata;
}

export type BlockViewMode = 'preview' | 'code';

export interface EditorFilters {
  search: string;
  types: BlockType[];
}

export type SidebarPanel = 'properties' | 'metadata' | 'mandatory' | 'attachment' | 'validation';

export interface SidebarState {
  isOpen: boolean;
  pinned: boolean;
  activePanel: SidebarPanel;
}

export interface ValidationState {
  status: 'idle' | 'loading' | 'valid' | 'invalid' | 'error';
  issues: ValidationIssue[];
  errorMessage?: string;
  lastUpdatedAt?: number;
}

export interface EditorStoreState {
  yamlDocument: string;
  blocks: EditorBlock[];
  selectedBlockId?: string;
  blockViewMode: Record<string, BlockViewMode>;
  filters: EditorFilters;
  sidebar: SidebarState;
  validation: ValidationState;
  summaries: Record<string, BlockSummary>;
}

export interface EditorStoreActions {
  initializeFromYaml: (yaml: string) => void;
  setBlocks: (blocks: EditorBlock[]) => void;
  selectBlock: (blockId?: string) => void;
  toggleBlockView: (blockId: string, mode?: BlockViewMode) => void;
  setFilterSearch: (search: string) => void;
  toggleFilterType: (blockType: BlockType) => void;
  clearFilters: () => void;
  setYamlDocument: (yaml: string) => void;
  setValidationState: (validation: Partial<ValidationState>) => void;
  setSidebarState: (state: Partial<SidebarState>) => void;
  setBlockMetadata: (blockId: string, metadata: Partial<BlockMetadata>) => void;
  upsertBlockFromRaw: (blockId: string, raw: string) => void;
  setServerSummaries: (summaries: BlockSummary[]) => void;
}

export type EditorStore = EditorStoreState & EditorStoreActions;
