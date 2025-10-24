import { useRef } from 'react';
import type { ChangeEvent } from 'react';
import { Upload } from 'lucide-react';
import { useBlockStore } from '../../store/useBlockStore';
import { BlockListItem } from './BlockListItem';

export const BlockSidebar = () => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const blocks = useBlockStore((state) => state.blocks);
  const selectedBlockId = useBlockStore((state) => state.selectedBlockId);
  const loadYaml = useBlockStore((state) => state.loadYaml);

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    loadYaml(text);
    event.target.value = '';
  };

  return (
    <aside className="bg-surface border-r border-outline/40 flex flex-col">
      <div className="px-5 pt-5 pb-4 border-b border-outline/30">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm tracking-wide text-slate-400">Blocks</p>
            <h2 className="text-lg font-semibold text-slate-200">Interview Outline</h2>
          </div>
          <button
            type="button"
            onClick={handleUploadClick}
            className="p-2 rounded-lg bg-panel border border-outline/30 hover:border-accent transition"
            title="Import YAML"
          >
            <Upload size={16} />
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".yaml,.yml"
            className="hidden"
            onChange={handleFileChange}
          />
        </div>
        <p className="text-xs text-slate-400 mt-1">Click the plus icon on a block to add a new one.</p>
      </div>

      <nav className="flex-1 overflow-y-auto">
        <ul className="divide-y divide-outline/20">
          {blocks.map((block) => (
            <BlockListItem key={block.id} block={block} isActive={block.id === selectedBlockId} />
          ))}
        </ul>
      </nav>
    </aside>
  );
};
