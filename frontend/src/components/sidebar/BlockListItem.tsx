import { Fragment } from 'react';
import { Trash2 } from 'lucide-react';
import type { Block } from '../../types/blocks';
import { useBlockStore } from '../../store/useBlockStore';
import { CodeEditor } from '../editor/CodeEditor';
import { MetadataForm } from '../editor/forms/MetadataForm';
import { QuestionForm } from '../editor/forms/QuestionForm';
import { InterviewOrderForm } from '../editor/forms/InterviewOrderForm';

const VISUAL_BLOCK_TYPES: Block['type'][] = ['metadata', 'question', 'interview_order'];

const blockBadge = (type: Block['type']) => {
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

const renderVisualEditor = (block: Block) => {
  switch (block.type) {
    case 'metadata':
      return <MetadataForm block={block} />;
    case 'question':
      return <QuestionForm block={block} />;
    case 'interview_order':
      return <InterviewOrderForm block={block} />;
    default:
      return null;
  }
};

const CodeBlockPreview = ({ content }: { content: string }) => {
  const preview = content.split('\n').slice(0, 3).join('\n');
  return (
    <pre className="text-xs text-slate-400 bg-panel/50 p-2 rounded-md mt-2 overflow-hidden">
      <code>{preview}</code>
    </pre>
  );
};

export const BlockListItem = ({ block, isActive }: { block: Block; isActive: boolean }) => {
  const selectBlock = useBlockStore((state) => state.selectBlock);
  const deleteBlock = useBlockStore((state) => state.deleteBlock);
  const mode = useBlockStore((state) => state.mode);

  const supportsVisual = VISUAL_BLOCK_TYPES.includes(block.type);
  const effectiveMode = supportsVisual ? mode : 'code';

  return (
    <li className="border-b border-outline/20">
      <div
        role="button"
        tabIndex={0}
        onClick={() => selectBlock(isActive ? null : block.id)}
        onKeyDown={(e) => e.key === 'Enter' && selectBlock(isActive ? null : block.id)}
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
          {!isActive && block.type === 'code' && <CodeBlockPreview content={block.content} />}
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
      {isActive && (
        <div className="bg-surface/80 p-4">
          {effectiveMode === 'visual' ? (
            <Fragment>
              {supportsVisual ? (
                <div className="rounded-xl border border-outline/30 bg-surface/80 p-6 shadow-panel">
                  {renderVisualEditor(block)}
                </div>
              ) : (
                <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-6 text-amber-100 text-sm">
                  Visual editing for this block type is coming soon. Switch to code view to edit directly.
                </div>
              )}
            </Fragment>
          ) : (
            <div style={{ height: '24rem' }}>
              <CodeEditor block={block} />
            </div>
          )}
        </div>
      )}
    </li>
  );
};