import type { BlockType } from '@/api/types';
import type { EditorBlock } from '@/state/types';
import { QuestionEditor } from './QuestionEditor';
import { YamlBlockEditor } from './YamlBlockEditor';
import { StringListBlockEditor } from './StringListBlockEditor';
import { FeaturesBlockEditor } from './FeaturesBlockEditor';
import { MetadataBlockEditor } from './MetadataBlockEditor';

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

function AttachmentPreview({ block }: BlockPreviewProps): JSX.Element {
  const attachment = (block.metadata.rawData?.attachment ?? {}) as Record<string, unknown>;
  return (
    <div className="space-y-3">
      <div className="rounded-xl bg-muted px-3 py-2 text-sm text-text-primary">
        <span className="font-semibold">{attachment.name ?? 'Untitled attachment'}</span>
        {attachment.filename && (
          <span className="ml-2 text-xs text-text-muted">({attachment.filename as string})</span>
        )}
      </div>
      {Array.isArray(attachment['valid formats']) && (
        <div className="flex flex-wrap gap-2 text-xs text-text-muted">
          {(attachment['valid formats'] as unknown[]).map((item, index) => (
            <span key={index} className="rounded-full bg-muted px-3 py-1">
              {String(item)}
            </span>
          ))}
        </div>
      )}
      {typeof attachment.content === 'string' && (
        <pre className="max-h-52 overflow-auto rounded-xl border border-border bg-surface px-3 py-2 text-xs">
          {attachment.content}
        </pre>
      )}
    </div>
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
          <div key={index} className="flex items-center gap-3 rounded-xl border border-border bg-surface px-3 py-2">
            <span className="text-xs font-semibold uppercase tracking-wide text-text-muted">{index + 1}</span>
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
      return <AttachmentPreview block={block} />;
    case 'features':
      return <FeaturesBlockEditor block={block} />;
    default:
      return <YamlBlockEditor block={block} />;
  }
}
