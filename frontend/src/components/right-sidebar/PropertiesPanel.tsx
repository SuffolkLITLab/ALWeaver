import { useCallback } from 'react';
import { Clipboard, ClipboardCheck } from 'lucide-react';
import { useState } from 'react';
import type { EditorBlock } from '@/state/types';
import { LANGUAGE_LABELS, resolveBlockTypeLabel } from '@/utils/constants';
import { Button } from '@/components/common/Button';
import { useEditorStore } from '@/state/editorStore';
import { stringify } from 'yaml';

interface PropertiesPanelProps {
  block: EditorBlock;
}

export function PropertiesPanel({ block }: PropertiesPanelProps): JSX.Element {
  const upsertBlockFromRaw = useEditorStore((state) => state.upsertBlockFromRaw);
  const [copied, setCopied] = useState(false);

  const handleCopyId = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(block.id);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopied(false);
    }
  }, [block.id]);

  const handleToggleMandatory = useCallback(
    (next: boolean) => {
      const base = { ...((block.metadata.rawData ?? {}) as Record<string, unknown>) };
      if (block.type === 'interview_order') {
        const interviewOrder = {
          ...(((base.interview_order ?? {}) as Record<string, unknown>) || {}),
        };
        if (next) {
          interviewOrder.mandatory = true;
        } else {
          delete interviewOrder.mandatory;
        }
        const nextRawData = {
          ...base,
          interview_order: interviewOrder,
        };
        const yaml = stringify(nextRawData).trim();
        upsertBlockFromRaw(block.id, yaml);
        return;
      }

      if (next) {
        base.mandatory = true;
      } else {
        delete base.mandatory;
      }
      const yaml = stringify(base).trim();
      upsertBlockFromRaw(block.id, yaml);
    },
    [block.id, block.metadata.rawData, block.type, upsertBlockFromRaw],
  );

  return (
    <div className="space-y-5">
      <section className="space-y-2">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-text-muted">Type</p>
            <p className="text-sm font-medium text-text-primary">{resolveBlockTypeLabel(block.type)}</p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-text-muted">Language</p>
            <p className="text-sm text-text-primary">{LANGUAGE_LABELS[block.language] ?? block.language}</p>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-muted px-3 py-2">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-text-muted">Block Id</p>
          <div className="mt-1 flex items-center justify-between">
            <span className="font-mono text-sm text-text-primary">{block.id}</span>
            <button
              type="button"
              onClick={handleCopyId}
              className="inline-flex h-8 w-8 items-center justify-center rounded-full text-text-muted transition-colors hover:bg-surface hover:text-text-primary"
              aria-label="Copy block id"
            >
              {copied ? <ClipboardCheck className="h-4 w-4" /> : <Clipboard className="h-4 w-4" />}
            </button>
          </div>
        </div>
      </section>

      <section className="space-y-2">
        <h4 className="text-xs font-semibold uppercase tracking-[0.2em] text-text-muted">Flags</h4>
        <div className="flex items-center justify-between rounded-xl border border-border bg-muted px-3 py-2">
          <div>
            <p className="text-sm font-medium text-text-primary">Mandatory block</p>
            <p className="text-xs text-text-muted">Run this block before optional screens.</p>
          </div>
          <Button
            type="button"
            variant={block.metadata.isMandatory ? 'primary' : 'ghost'}
            size="sm"
            onClick={() => handleToggleMandatory(!block.metadata.isMandatory)}
            aria-pressed={block.metadata.isMandatory}
          >
            {block.metadata.isMandatory ? 'Mandatory: On' : 'Mandatory: Off'}
          </Button>
        </div>
      </section>

      {block.metadata.orderItems.length > 0 && (
        <section className="space-y-2">
          <h4 className="text-xs font-semibold uppercase tracking-[0.2em] text-text-muted">Order Items</h4>
          <div className="space-y-2">
            {block.metadata.orderItems.map((item, index) => (
              <div key={item} className="flex items-center gap-3 rounded-xl border border-border px-3 py-2">
                <span className="text-xs font-semibold text-text-muted">{index + 1}</span>
                <span className="font-mono text-xs text-text-primary">{item}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="space-y-2">
        <h4 className="text-xs font-semibold uppercase tracking-[0.2em] text-text-muted">Raw YAML</h4>
        <pre className="max-h-72 overflow-auto rounded-xl border border-border bg-background px-3 py-2 text-xs">
          {block.raw}
        </pre>
      </section>
    </div>
  );
}
