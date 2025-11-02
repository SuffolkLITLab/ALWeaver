import { create } from 'zustand';
import type { DocassembleConfig } from '@/utils/docassembleConfig';
import { loadDocassembleConfig, saveDocassembleConfig, clearDocassembleConfig } from '@/utils/docassembleConfig';

export interface DocassembleStoreState {
  config: DocassembleConfig | null;
  selectedProject?: string;
  selectedFilename?: string;
}

export interface DocassembleStoreActions {
  setConfig: (config: DocassembleConfig) => void;
  updateConfig: (partial: Partial<DocassembleConfig>) => void;
  clearConfig: () => void;
  setSelectedProject: (project?: string) => void;
  setSelectedFilename: (filename?: string) => void;
}

export type DocassembleStore = DocassembleStoreState & DocassembleStoreActions;

const initialConfig = loadDocassembleConfig();

export const useDocassembleStore = create<DocassembleStore>((set, get) => ({
  config: initialConfig,
  selectedProject: initialConfig?.project,
  selectedFilename: initialConfig?.filename,

  setConfig: (config) => {
    const next = { ...config };
    saveDocassembleConfig(next);
    set({
      config: next,
      selectedProject: next.project,
      selectedFilename: next.filename,
    });
  },

  updateConfig: (partial) => {
    const current = get().config;
    if (!current) {
      return;
    }
    const next = { ...current, ...partial };
    saveDocassembleConfig(next);
    set({
      config: next,
      selectedProject: next.project,
      selectedFilename: next.filename,
    });
  },

  clearConfig: () => {
    clearDocassembleConfig();
    set({
      config: null,
      selectedProject: undefined,
      selectedFilename: undefined,
    });
  },

  setSelectedProject: (project) => {
    const { config, updateConfig } = get();
    if (!config) {
      return;
    }
    updateConfig({ project, filename: undefined });
  },

  setSelectedFilename: (filename) => {
    const { config, updateConfig } = get();
    if (!config) {
      return;
    }
    updateConfig({ filename });
  },
}));
