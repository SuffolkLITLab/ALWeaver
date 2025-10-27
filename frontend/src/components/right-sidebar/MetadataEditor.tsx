import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ChangeEvent, FocusEvent } from 'react';
import { stringify } from 'yaml';
import type { EditorBlock } from '@/state/types';
import { useEditorStore } from '@/state/editorStore';

interface MetadataEditorProps {
  block: EditorBlock;
}

type MetadataField = 'title' | 'language' | 'author' | 'description';

interface MetadataFormState {
  title: string;
  language: string;
  author: string;
  description: string;
}

const EMPTY_FORM: MetadataFormState = {
  title: '',
  language: '',
  author: '',
  description: '',
};

export function MetadataEditor({ block }: MetadataEditorProps): JSX.Element {
  const upsertBlockFromRaw = useEditorStore((state) => state.upsertBlockFromRaw);
  const [formState, setFormState] = useState<MetadataFormState>(EMPTY_FORM);

  const metadata = useMemo(() => {
    const rawMetadata = (block.metadata.rawData?.metadata ?? {}) as Record<string, unknown>;
    return {
      title: typeof rawMetadata.title === 'string' ? rawMetadata.title : '',
      language: typeof rawMetadata.language === 'string' ? rawMetadata.language : '',
      author: typeof rawMetadata.author === 'string' ? rawMetadata.author : '',
      description: typeof rawMetadata.description === 'string' ? rawMetadata.description : '',
    };
  }, [block.metadata.rawData]);

  useEffect(() => {
    setFormState(metadata);
  }, [metadata]);

  const commitUpdate = useCallback(
    (partial: Partial<Record<MetadataField, string>>) => {
      const base = (block.metadata.rawData ?? {}) as Record<string, unknown>;
      const currentMetadata = (base.metadata ?? {}) as Record<string, unknown>;
      const nextMetadata = {
        ...currentMetadata,
        ...partial,
      };

      Object.entries(nextMetadata).forEach(([key, value]) => {
        if (typeof value === 'string' && value.trim().length === 0) {
          delete nextMetadata[key];
        }
      });

      const nextRawData = {
        ...base,
        metadata: nextMetadata,
      };

      const yaml = stringify(nextRawData).trim();
      upsertBlockFromRaw(block.id, yaml);
    },
    [block.id, block.metadata.rawData, upsertBlockFromRaw],
  );

  const handleChange = (field: MetadataField) => (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { value } = event.target;
    setFormState((prev) => ({ ...prev, [field]: value }));
  };

  const handleBlur = (field: MetadataField) => (event: FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    commitUpdate({ [field]: event.target.value });
  };

  return (
    <form className="space-y-4">
      <fieldset className="space-y-2">
        <label className="text-xs font-semibold uppercase tracking-[0.18em] text-text-muted" htmlFor="metadata-title">
          Title
        </label>
        <input
          id="metadata-title"
          name="title"
          value={formState.title}
          onChange={handleChange('title')}
          onBlur={handleBlur('title')}
          className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text-primary outline-none focus:border-primary"
          placeholder="Enter interview title"
        />
      </fieldset>

      <fieldset className="space-y-2">
        <label className="text-xs font-semibold uppercase tracking-[0.18em] text-text-muted" htmlFor="metadata-language">
          Language
        </label>
        <input
          id="metadata-language"
          name="language"
          value={formState.language}
          onChange={handleChange('language')}
          onBlur={handleBlur('language')}
          className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text-primary outline-none focus:border-primary"
          placeholder="e.g. en"
        />
      </fieldset>

      <fieldset className="space-y-2">
        <label className="text-xs font-semibold uppercase tracking-[0.18em] text-text-muted" htmlFor="metadata-author">
          Author
        </label>
        <input
          id="metadata-author"
          name="author"
          value={formState.author}
          onChange={handleChange('author')}
          onBlur={handleBlur('author')}
          className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text-primary outline-none focus:border-primary"
          placeholder="Author name"
        />
      </fieldset>

      <fieldset className="space-y-2">
        <label
          className="text-xs font-semibold uppercase tracking-[0.18em] text-text-muted"
          htmlFor="metadata-description"
        >
          Description
        </label>
        <textarea
          id="metadata-description"
          name="description"
          value={formState.description}
          onChange={handleChange('description')}
          onBlur={handleBlur('description')}
          rows={4}
          className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text-primary outline-none focus:border-primary"
          placeholder="Short description of the interview"
        />
      </fieldset>
    </form>
  );
}
