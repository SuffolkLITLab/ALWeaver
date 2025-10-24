import { Fragment } from 'react';
import { CodeEditor } from './CodeEditor';
import { MetadataForm } from './forms/MetadataForm';
import { QuestionForm } from './forms/QuestionForm';
import { InterviewOrderForm } from './forms/InterviewOrderForm';
import { useBlockStore } from '../../store/useBlockStore';
import type { Block } from '../../types/blocks';

const VISUAL_BLOCK_TYPES: Block['type'][] = ['metadata', 'question', 'interview_order'];

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

export const EditorPane = () => {
  const selectedBlockId = useBlockStore((state) => state.selectedBlockId);
  const blocks = useBlockStore((state) => state.blocks);
  const mode = useBlockStore((state) => state.mode);

  const block = blocks.find((item) => item.id === selectedBlockId);

  if (!block) {
    return (
      <div className="h-full flex items-center justify-center text-slate-400 border border-dashed border-outline/30 rounded-xl">
        Select or create a block to begin editing.
      </div>
    );
  }

  const supportsVisual = VISUAL_BLOCK_TYPES.includes(block.type);
  const effectiveMode = supportsVisual ? mode : 'code';

  return (
    <div className="h-full flex flex-col">
      <header className="flex items-center justify-between pb-4">
        <div>
          <p className="text-xs uppercase tracking-wide text-slate-400">Currently editing</p>
          <h2 className="text-xl font-semibold text-slate-100">{block.label ?? 'Untitled block'}</h2>
        </div>
        <div className="text-xs text-slate-400 uppercase tracking-wide">{block.type.replace('_', ' ')}</div>
      </header>

      <div className="flex-1 overflow-y-auto pr-2">
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
          <CodeEditor block={block} />
        )}
      </div>
    </div>
  );
};
