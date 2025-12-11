import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ChangeEvent, FocusEvent } from 'react';
import { stringify } from 'yaml';
import type { EditorBlock } from '@/state/types';
import { useEditorStore } from '@/state/editorStore';

interface AttachmentEditorProps {
  block: EditorBlock;
}

interface AttachmentFormState {
  name: string;
  filename: string;
  formats: string;
  content: string;
}

const EMPTY_ATTACHMENT: AttachmentFormState = {
  name: '',
  filename: '',
  formats: '',
  content: '',
};

export function AttachmentEditor({ block }: AttachmentEditorProps): JSX.Element {
  const upsertBlockFromRaw = useEditorStore((state) => state.upsertBlockFromRaw);
  const attachment = useMemo(() => {
    return (block.metadata.rawData?.attachment ?? {}) as Record<string, unknown>;
  }, [block.metadata.rawData]);

  const [formState, setFormState] = useState<AttachmentFormState>(EMPTY_ATTACHMENT);

  useEffect(() => {
    setFormState({
      name: typeof attachment.name === 'string' ? attachment.name : '',
      filename: typeof attachment.filename === 'string' ? attachment.filename : '',
      formats: Array.isArray(attachment['valid formats'])
        ? (attachment['valid formats'] as unknown[]).map((value) => String(value)).join(', ')
        : '',
      content: typeof attachment.content === 'string' ? attachment.content : '',
    });
  }, [attachment]);

  const commitUpdate = useCallback(
    (partial: Partial<AttachmentFormState>) => {
      const base = (block.metadata.rawData ?? {}) as Record<string, unknown>;
      const currentAttachment = (base.attachment ?? {}) as Record<string, unknown>;

      const nextAttachment: Record<string, unknown> = {
        ...currentAttachment,
      };

      if (partial.name !== undefined) {
        nextAttachment.name = partial.name || undefined;
      }
      if (partial.filename !== undefined) {
        nextAttachment.filename = partial.filename || undefined;
      }
      if (partial.formats !== undefined) {
        const values = partial.formats
          .split(',')
          .map((value) => value.trim())
          .filter(Boolean);
        nextAttachment['valid formats'] = values.length > 0 ? values : undefined;
      }
      if (partial.content !== undefined) {
        nextAttachment.content = partial.content || undefined;
      }

      const nextRawData = {
        ...base,
        attachment: nextAttachment,
      };

      const yaml = stringify(nextRawData).trim();
      upsertBlockFromRaw(block.id, yaml);
    },
    [block.id, block.metadata.rawData, upsertBlockFromRaw],
  );

  const handleChange = (field: keyof AttachmentFormState) => (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { value } = event.target;
    setFormState((prev) => ({ ...prev, [field]: value }));
  };

  const handleBlur = (field: keyof AttachmentFormState) => (
    event: FocusEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    commitUpdate({ [field]: event.target.value } as Partial<AttachmentFormState>);
  };

  return (
    <form className="space-y-4">
      <fieldset className="space-y-2">
        <label className="text-xs font-medium text-text-muted" htmlFor="attachment-name">
          Attachment name
        </label>
        <input
          id="attachment-name"
          value={formState.name}
          onChange={handleChange('name')}
          onBlur={handleBlur('name')}
          className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text-primary outline-none focus:border-primary"
          placeholder="Intake Summary"
        />
      </fieldset>

      <fieldset className="space-y-2">
        <label className="text-xs font-medium text-text-muted" htmlFor="attachment-filename">
          Filename
        </label>
        <input
          id="attachment-filename"
          value={formState.filename}
          onChange={handleChange('filename')}
          onBlur={handleBlur('filename')}
          className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text-primary outline-none focus:border-primary"
          placeholder="intake-summary.docx"
        />
      </fieldset>

      <fieldset className="space-y-2">
        <label className="text-xs font-medium text-text-muted" htmlFor="attachment-formats">
          Valid formats
        </label>
        <input
          id="attachment-formats"
          value={formState.formats}
          onChange={handleChange('formats')}
          onBlur={handleBlur('formats')}
          className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text-primary outline-none focus:border-primary"
          placeholder="pdf, docx"
        />
        <p className="text-xs text-text-muted">Separate formats with commas.</p>
      </fieldset>

      <fieldset className="space-y-2">
        <label className="text-xs font-medium text-text-muted" htmlFor="attachment-content">
          Content (Markdown / Mako)
        </label>
        <textarea
          id="attachment-content"
          value={formState.content}
          onChange={handleChange('content')}
          onBlur={handleBlur('content')}
          rows={6}
          className="w-full rounded-lg border border-border bg-surface px-3 py-2 font-mono text-xs text-text-primary outline-none focus:border-primary"
          placeholder="## Title\n..."
        />
      </fieldset>
    </form>
  );
}
