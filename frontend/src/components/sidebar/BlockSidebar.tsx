import { useRef } from 'react';
import type { ChangeEvent } from 'react';
import { Plus, Upload, Trash2 } from 'lucide-react';
import type { BlockType } from '../../types/blocks';
import { useBlockStore } from '../../store/useBlockStore';

const BLOCK_PALETTE: { type: BlockType; label: string }[] = [
  { type: 'metadata', label: 'Metadata' },
  { type: 'objects', label: 'Objects' },
  { type: 'question', label: 'Question' },
  { type: 'code', label: 'Code' },
  { type: 'attachment', label: 'Attachment' },
  { type: 'event', label: 'Event' },
  { type: 'interview_order', label: 'Interview Order' },
];

const blockBadge = (type: BlockType) => {
  switch (type) {
    case 'metadata':
      return 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/30';
    case 'question':
      return 'bg-sky-500/10 text-sky-300 border border-sky-500/30';
    case 'code':
      return 'bg-pink-500/10 text-pink-300 border border-pink-500/30';
    case 'interview_order':
      return 'bg-indigo-500/10 text-indigo-300 border border-indigo-500/30';
    case 'attachment':
      return 'bg-amber-500/10 text-amber-200 border border-amber-500/30';
    case 'objects':
      return 'bg-purple-500/10 text-purple-300 border border-purple-500/30';
    case 'event':
      return 'bg-rose-500/10 text-rose-300 border border-rose-500/30';
    default:
      return 'bg-slate-500/10 text-slate-200 border border-slate-500/30';
  }
};

export const BlockSidebar = () => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const blocks = useBlockStore((state) => state.blocks);
  const selectedBlockId = useBlockStore((state) => state.selectedBlockId);
  const selectBlock = useBlockStore((state) => state.selectBlock);
  const addNewBlock = useBlockStore((state) => state.addNewBlock);
  const deleteBlock = useBlockStore((state) => state.deleteBlock);
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
    <aside className="w-72 bg-surface border-r border-outline/40 flex flex-col">
      <div className="px-5 pt-5 pb-4 border-b border-outline/30">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm uppercase tracking-wide text-slate-400">Blocks</p>
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
        <p className="text-xs text-slate-400 mt-1">Add new blocks to extend the interview flow.</p>
        <div className="grid grid-cols-2 gap-2 mt-4">
          {BLOCK_PALETTE.map(({ type, label }) => (
            <button
              key={type}
              type="button"
              onClick={() => addNewBlock(type)}
              className="text-left px-3 py-2 text-xs font-medium text-slate-200 bg-panel border border-outline/30 rounded-lg hover:border-accent/80 hover:text-accent-foreground transition flex items-center gap-2"
            >
              <Plus size={14} />
              {label}
            </button>
          ))}
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto">
        <ul className="divide-y divide-outline/20">
          {blocks.map((block) => {
            const isActive = block.id === selectedBlockId;
            return (
              <li key={block.id}>
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => selectBlock(block.id)}
                  onKeyDown={(e) => e.key === 'Enter' && selectBlock(block.id)}
                  className={`w-full px-4 py-3 text-left flex items-center justify-between gap-3 transition border-l-2 cursor-pointer ${
                    isActive
                      ? 'bg-panel/50 border-accent text-slate-100'
                      : 'border-transparent hover:bg-panel/30 text-slate-300'
                  }`}
                >
                  <div className="flex-1">
                    <div className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold ${blockBadge(block.type)}`}>
                      {block.type.replace('_', ' ')}
                    </div>
                    <p className="mt-1 text-sm font-medium line-clamp-2">
                      {block.label ?? 'Untitled'}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      deleteBlock(block.id);
                    }}
                    className="p-1 rounded-md bg-panel border border-outline/20 text-slate-400 hover:text-rose-300 hover:border-rose-400/40"
                    aria-label="Delete block"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      </nav>
    </aside>
  );
};
