import { useCallback } from 'react';
import { Clipboard, ClipboardCheck, X } from 'lucide-react';
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
  const [editingId, setEditingId] = useState(false);
  const [idValue, setIdValue] = useState(block.metadata.yamlId || '');

  const handleCopyId = useCallback(async () => {
    try {
      const idToCopy = block.metadata.yamlId || block.id;
      await navigator.clipboard.writeText(idToCopy);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopied(false);
    }
  }, [block.id, block.metadata.yamlId]);

  const handleSaveId = useCallback(
    (newId: string) => {
      const base = { ...((block.metadata.rawData ?? {}) as Record<string, unknown>) };
      if (newId.trim()) {
        base.id = newId.trim();
      } else {
        delete base.id;
      }
      const yaml = stringify(base).trim();
      upsertBlockFromRaw(block.id, yaml);
      setEditingId(false);
    },
    [block.id, block.metadata.rawData, upsertBlockFromRaw],
  );

  const handleCancelEdit = useCallback(() => {
    setIdValue(block.metadata.yamlId || '');
    setEditingId(false);
  }, [block.metadata.yamlId]);

  const handleToggleMandatory = useCallback(
    (next: boolean) => {
      const base = { ...((block.metadata.rawData ?? {}) as Record<string, unknown>) };
      if (block.metadata.isInterviewOrder) {
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
    [block.id, block.metadata.isInterviewOrder, block.metadata.rawData, upsertBlockFromRaw],
  );

  return (
    <div className="space-y-5">
      <section className="space-y-2">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-text-muted">Type</p>
            <p className="text-sm font-medium text-text-primary">{resolveBlockTypeLabel(block.type)}</p>
          </div>
          <div>
            <p className="text-xs font-medium text-text-muted">Language</p>
            <p className="text-sm text-text-primary">{LANGUAGE_LABELS[block.language] ?? block.language}</p>
          </div>
        </div>

        <div className="rounded-lg border border-border bg-muted px-3 py-2">
          <p className="text-xs font-medium text-text-muted">Block ID</p>
          <div className="mt-1 flex items-center justify-between gap-2">
            {editingId ? (
              <>
                <div className="flex items-center gap-2 flex-1">
                  <span className="text-xs text-text-muted">id:&nbsp;</span>
                  <input
                  type="text"
                  value={idValue}
                  onChange={(e) => setIdValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleSaveId(idValue);
                    } else if (e.key === 'Escape') {
                      handleCancelEdit();
                    }
                  }}
                  onBlur={() => handleSaveId(idValue)}
                  autoFocus
                  className="flex-1 font-mono text-sm bg-surface border border-border rounded px-2 py-1 text-text-primary focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="No ID"
                  />
                </div>
                <button
                  type="button"
                  onClick={handleCancelEdit}
                  className="inline-flex h-7 w-7 items-center justify-center rounded text-text-muted transition-colors hover:bg-surface hover:text-text-primary flex-shrink-0"
                  aria-label="Cancel editing"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </>
              ) : (
              <>
                {block.metadata.yamlId ? (
                  <div className="flex items-center gap-2 flex-1">
                    <span className="text-xs text-text-muted">id:&nbsp;</span>
                    <span
                    onClick={() => setEditingId(true)}
                    className="flex-1 font-mono text-sm text-text-primary truncate cursor-text hover:bg-surface/50 px-2 py-1 rounded transition-colors"
                    >
                      {block.metadata.yamlId}
                    </span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 flex-1">
                    <span className="text-xs text-text-muted">id:&nbsp;</span>
                    <span
                    onClick={() => setEditingId(true)}
                    className="flex-1 font-mono text-sm text-text-muted/60 cursor-text hover:bg-surface/50 px-2 py-1 rounded transition-colors"
                    >
                      Click to add ID
                    </span>
                  </div>
                )}
                <button
                  type="button"
                  onClick={handleCopyId}
                  className="inline-flex h-7 w-7 items-center justify-center rounded text-text-muted transition-colors hover:bg-surface hover:text-text-primary flex-shrink-0"
                  aria-label="Copy block id"
                >
                  {copied ? <ClipboardCheck className="h-3.5 w-3.5" /> : <Clipboard className="h-3.5 w-3.5" />}
                </button>
              </>
            )}
          </div>
        </div>
      </section>

      <section className="space-y-2">
        <h4 className="text-xs font-medium text-text-muted">Flags</h4>
        <div className="flex items-center justify-between rounded-lg border border-border bg-muted px-3 py-2">
          <div>
            <p className="text-sm font-medium text-text-primary">Mandatory block</p>
            <p className="text-xs text-text-muted">Always run this block</p>
          </div>
          <Button
            type="button"
            variant={block.metadata.isMandatory ? 'primary' : 'ghost'}
            size="sm"
            onClick={() => handleToggleMandatory(!block.metadata.isMandatory)}
            aria-pressed={block.metadata.isMandatory}
          >
            {block.metadata.isMandatory ? 'On' : 'Off'}
          </Button>
        </div>
      </section>

      {block.metadata.orderItems && block.metadata.orderItems.length > 0 && (
        <section className="space-y-2">
          <h4 className="text-xs font-medium text-text-muted">Order items</h4>
          <div className="space-y-1.5">
            {block.metadata.orderItems.map((item, index) => (
              <div key={item} className="flex items-center gap-2 rounded-lg border border-border px-3 py-2">
                <span className="text-xs font-medium text-text-muted">{index + 1}</span>
                <span className="font-mono text-xs text-text-primary truncate">{item}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="space-y-2">
        <h4 className="text-xs font-medium text-text-muted">Raw YAML</h4>
        <pre className="max-h-72 overflow-auto rounded-lg border border-border bg-background px-3 py-2 text-xs">
          {block.raw}
        </pre>
      </section>
    </div>
  );
}
