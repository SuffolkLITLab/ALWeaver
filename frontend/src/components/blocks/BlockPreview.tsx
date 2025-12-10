import type { BlockType } from '@/api/types';
import type { EditorBlock } from '@/state/types';
import { QuestionEditor } from './QuestionEditor';
import { YamlBlockEditor } from './YamlBlockEditor';
import { StringListBlockEditor } from './StringListBlockEditor';
import { FeaturesBlockEditor } from './FeaturesBlockEditor';
import { MetadataBlockEditor } from './MetadataBlockEditor';
import { AttachmentBlockEditor } from './AttachmentBlockEditor';

interface BlockPreviewProps {
  block: EditorBlock;
}

function CodePreview({ block }: BlockPreviewProps): JSX.Element {
  const payload = (block.metadata.rawData?.code ?? block.raw) as string;
  return (
    <pre className="max-h-72 overflow-auto rounded-xl bg-[#0f172a] px-4 py-3 font-mono text-xs text-slate-100">
      {typeof payload === 'string' ? payload : block.raw}
    </pre>
  );
}

function InterviewOrderPreview({ block }: BlockPreviewProps): JSX.Element {
  const items = block.metadata.orderItems;
  return (
    <div className="space-y-2">
      {items.length === 0 ? (
        <p className="text-sm text-text-muted">No goal variables defined.</p>
      ) : (
        items.map((item, index) => (
          <div key={index} className="flex items-center gap-3 rounded-lg border border-border bg-surface px-3 py-2">
            <span className="text-xs font-medium text-text-muted">{index + 1}</span>
            <span className="font-mono text-sm text-text-primary">{item}</span>
          </div>
        ))
      )}
    </div>
  );
}

const STRING_LIST_TYPES: BlockType[] = ['include', 'translations'];

function isStringListBlock(block: EditorBlock): boolean {
  if (!STRING_LIST_TYPES.includes(block.type)) {
    return false;
  }
  const rawData = (block.metadata.rawData ?? {}) as Record<string, unknown>;
  return Array.isArray(rawData[block.type]);
}
export function BlockPreview({ block }: BlockPreviewProps): JSX.Element {
  if (block.metadata.isInterviewOrder) {
    return <InterviewOrderPreview block={block} />;
  }
  if (isStringListBlock(block)) {
    return <StringListBlockEditor block={block} />;
  }
  switch (block.type) {
    case 'metadata':
      return <MetadataBlockEditor block={block} />;
    case 'question':
      return <QuestionEditor block={block} />;
    case 'code':
      return <CodePreview block={block} />;
    case 'attachment':
      return <AttachmentBlockEditor block={block} />;
    case 'features':
      return <FeaturesBlockEditor block={block} />;
    default:
      return <YamlBlockEditor block={block} />;
  }
}
