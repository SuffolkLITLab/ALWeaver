import type { EditorBlock } from '@/state/types';
import { QuestionEditor } from './QuestionEditor';
import { YamlBlockEditor } from './YamlBlockEditor';

interface BlockPreviewProps {
  block: EditorBlock;
}

function MetadataPreview({ block }: BlockPreviewProps): JSX.Element {
  const metadata = (block.metadata.rawData?.metadata ?? {}) as Record<string, unknown>;
  const entries = Object.entries(metadata);
  return (
    <div className="space-y-2">
      {entries.length === 0 ? (
        <p className="text-sm text-text-muted">No metadata values defined.</p>
      ) : (
        entries.map(([key, value]) => (
          <div key={key} className="flex items-start justify-between gap-4 rounded-xl bg-muted px-3 py-2">
            <span className="text-xs font-medium uppercase tracking-wide text-text-muted">{key}</span>
            <span className="text-sm text-text-primary">
              {typeof value === 'string' ? value : JSON.stringify(value, null, 2)}
            </span>
          </div>
        ))
      )}
    </div>
  );
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
export function BlockPreview({ block }: BlockPreviewProps): JSX.Element {
  if (block.metadata.isInterviewOrder) {
    return <InterviewOrderPreview block={block} />;
  }
  switch (block.type) {
    case 'metadata':
      return <MetadataPreview block={block} />;
    case 'question':
      return <QuestionEditor block={block} />;
    case 'code':
      return <CodePreview block={block} />;
    case 'attachment':
      return <AttachmentPreview block={block} />;
    default:
      return <YamlBlockEditor block={block} />;
  }
}
