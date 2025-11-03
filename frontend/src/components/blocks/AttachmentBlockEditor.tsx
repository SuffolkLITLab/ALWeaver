import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ChangeEvent } from 'react';
import { parse, Scalar, stringify } from 'yaml';
import { Plus, Trash2 } from 'lucide-react';
import { clsx } from 'clsx';
import type { EditorBlock } from '@/state/types';
import { useEditorStore } from '@/state/editorStore';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { RichTextEditor } from '../common/RichTextEditor';

type AttachmentFieldType = 'string' | 'text' | 'richText' | 'number' | 'boolean' | 'select' | 'stringList';

interface AttachmentFieldOption {
  label: string;
  value: string;
}

interface AttachmentFieldConfig {
  key: string;
  label: string;
  description?: string;
  category: string;
  type: AttachmentFieldType;
  placeholder?: string;
  options?: AttachmentFieldOption[];
}

const ATTACHMENT_FIELDS: AttachmentFieldConfig[] = [
  {
    key: 'name',
    label: 'Document name',
    description: 'Shown to users next to download buttons and in emails.',
    category: 'Document basics',
    type: 'string',
    placeholder: 'Intake Summary',
  },
  {
    key: 'description',
    label: 'Description',
    description: 'Markdown-friendly summary displayed under the attachment.',
    category: 'Document basics',
    type: 'richText',
    placeholder: 'A short description or instructions',
  },
  {
    key: 'filename',
    label: 'Filename seed',
    description: 'Base filename without extension. docassemble will append the file type.',
    category: 'Document basics',
    type: 'string',
    placeholder: 'intake-summary',
  },
  {
    key: 'variable name',
    label: 'Variable name',
    description: 'Define a variable (DAFileCollection) for programmatic use.',
    category: 'Document basics',
    type: 'string',
    placeholder: 'final_packet',
  },
  {
    key: 'language',
    label: 'Assembly language',
    description: 'Assemble this document using a specific language (e.g. en, es).',
    category: 'Document basics',
    type: 'string',
    placeholder: 'en',
  },
  {
    key: 'content',
    label: 'Inline content',
    description: 'Markdown / Mako content assembled directly into the document.',
    category: 'Assembly source',
    type: 'richText',
    placeholder: '## Document heading\nProvide content here...',
  },
  {
    key: 'content file',
    label: 'Content file',
    description: 'Reference to a text/Markdown file to merge (e.g. sample.md).',
    category: 'Assembly source',
    type: 'string',
    placeholder: 'sample.md',
  },
  {
    key: 'docx template file',
    label: 'DOCX template file',
    description: 'Template located in data/templates or referenced with package syntax.',
    category: 'Assembly source',
    type: 'string',
    placeholder: 'letter_template.docx',
  },
  {
    key: 'pdf template file',
    label: 'PDF template file',
    description: 'PDF form used for field mapping.',
    category: 'Assembly source',
    type: 'string',
    placeholder: 'intake-form.pdf',
  },
  {
    key: 'valid formats',
    label: 'Valid formats',
    description: 'Limit available download formats (one per line). Leave empty for defaults.',
    category: 'Output formats',
    type: 'stringList',
    placeholder: 'pdf\ndocx',
  },
  {
    key: 'always include editable files',
    label: 'Always include editable files',
    description: 'Automatically include DOCX/RTF when available.',
    category: 'Output formats',
    type: 'boolean',
  },
  {
    key: 'raw',
    label: 'Produce raw text output',
    description: 'Treat the document as plain text without PDF conversion.',
    category: 'Output formats',
    type: 'boolean',
  },
  {
    key: 'pdf/a',
    label: 'Produce PDF/A',
    description: 'Generate long-term archival PDFs.',
    category: 'Output formats',
    type: 'boolean',
  },
  {
    key: 'tagged pdf',
    label: 'Produce tagged PDF',
    description: 'Add accessibility tags to generated PDFs.',
    category: 'Output formats',
    type: 'boolean',
  },
  {
    key: 'password',
    label: 'PDF user password',
    description: 'Protect generated PDFs with this password.',
    category: 'Security',
    type: 'string',
  },
  {
    key: 'owner password',
    label: 'PDF owner password',
    description: 'Owner password for the generated PDF.',
    category: 'Security',
    type: 'string',
  },
  {
    key: 'template password',
    label: 'Template password',
    description: 'Password for encrypted template files.',
    category: 'Security',
    type: 'string',
  },
  {
    key: 'allow emailing',
    label: 'Allow emailing',
    description: 'Let users email this document from the interface.',
    category: 'Delivery & access',
    type: 'boolean',
  },
  {
    key: 'email template',
    label: 'Email template',
    description: 'Name of the docassemble template used for outgoing email.',
    category: 'Delivery & access',
    type: 'string',
  },
  {
    key: 'email subject',
    label: 'Email subject',
    description: 'Custom subject line (Markdown/Mako supported).',
    category: 'Delivery & access',
    type: 'text',
  },
  {
    key: 'email body',
    label: 'Email body',
    description: 'Custom email body (Markdown/Mako supported).',
    category: 'Delivery & access',
    type: 'richText',
    placeholder: 'Your document is attached...',
  },
  {
    key: 'email address default',
    label: 'Email address default',
    description: 'Pre-fill the email input with this value.',
    category: 'Delivery & access',
    type: 'string',
  },
  {
    key: 'allow downloading',
    label: 'Allow ZIP download',
    description: 'Offer a “Download all as ZIP” option.',
    category: 'Delivery & access',
    type: 'boolean',
  },
  {
    key: 'zip filename',
    label: 'ZIP filename',
    description: 'Filename for the generated ZIP archive.',
    category: 'Delivery & access',
    type: 'string',
    placeholder: 'bundle.zip',
  },
  {
    key: 'include attachment notice',
    label: 'Include attachment notice',
    description: 'Show the default “The following document…” heading.',
    category: 'Interface',
    type: 'boolean',
  },
  {
    key: 'include download tab',
    label: 'Include download tab',
    description: 'Show the download/preview tab interface.',
    category: 'Interface',
    type: 'boolean',
  },
  {
    key: 'describe file types',
    label: 'Describe file types',
    description: 'Show explanatory text for each file type.',
    category: 'Interface',
    type: 'boolean',
  },
  {
    key: 'manual attachment list',
    label: 'Manual attachment list',
    description: 'Hide the built-in attachment list (use custom links instead).',
    category: 'Interface',
    type: 'boolean',
  },
  {
    key: 'persistent',
    label: 'Persist after session',
    description: 'Keep generated files after the interview session is removed.',
    category: 'Permissions',
    type: 'boolean',
  },
  {
    key: 'private',
    label: 'Private file',
    description: 'Restrict download access to session participants.',
    category: 'Permissions',
    type: 'boolean',
  },
  {
    key: 'hyperlink style',
    label: 'Hyperlink character style',
    description: 'Name of the DOCX character style to use for hyperlinks.',
    category: 'Output formats',
    type: 'string',
  },
];

const ATTACHMENT_CATEGORIES = Array.from(new Set(ATTACHMENT_FIELDS.map((field) => field.category)));

const BLOCK_SCALAR_KEYS = new Set(['content', 'description', 'email subject', 'email body']);

interface PdfFieldEntry {
  id: string;
  key: string;
  value: string;
}

function normalizeAttachment(block: EditorBlock): Record<string, unknown> {
  const root = (block.metadata.rawData ?? {}) as Record<string, unknown>;
  const attachment = root.attachment;
  if (!attachment || typeof attachment !== 'object' || Array.isArray(attachment)) {
    return {};
  }
  return { ...(attachment as Record<string, unknown>) };
}

function toBlockScalar(value: string): Scalar | undefined {
  if (!value.trim()) {
    return undefined;
  }
  const normalized = value.endsWith('\n') ? value : `${value}\n`;
  const scalar = new Scalar(normalized);
  scalar.type = Scalar.BLOCK_LITERAL;
  return scalar;
}

function sanitizeAttachment(state: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  Object.entries(state).forEach(([key, value]) => {
    if (value === undefined || value === null) {
      return;
    }
    if (typeof value === 'string') {
      if (value.trim().length === 0) {
        return;
      }
      if (BLOCK_SCALAR_KEYS.has(key)) {
        const scalar = toBlockScalar(value);
        if (scalar) {
          result[key] = scalar;
        }
        return;
      }
      result[key] = value;
      return;
    }
    if (typeof value === 'number' || typeof value === 'boolean') {
      result[key] = value;
      return;
    }
    if (Array.isArray(value)) {
      const filtered = value
        .map((entry) => (typeof entry === 'string' ? entry.trim() : entry))
        .filter((entry) => {
          if (entry === undefined || entry === null) {
            return false;
          }
          if (typeof entry === 'string') {
            return entry.length > 0;
          }
          return true;
        });
      if (filtered.length === 0) {
        return;
      }
      result[key] = filtered;
      return;
    }
    if (typeof value === 'object') {
      if (key === 'fields') {
        const entries = Object.entries(value as Record<string, unknown>).filter(
          ([fieldKey, fieldValue]) =>
            fieldKey.trim().length > 0 && typeof fieldValue === 'string' && fieldValue.length > 0,
        );
        if (entries.length === 0) {
          return;
        }
        result[key] = Object.fromEntries(entries);
        return;
      }
      result[key] = value;
    }
  });
  return result;
}

function isSupportedScalar(value: unknown): boolean {
  return typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean';
}

function isStringList(value: unknown): boolean {
  return Array.isArray(value) && value.every((entry) => typeof entry === 'string');
}

function extractSupportedPdfFields(value: unknown): Record<string, string> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }
  const entries = Object.entries(value as Record<string, unknown>);
  if (entries.length === 0) {
    return {};
  }
  for (const [, entryValue] of entries) {
    if (typeof entryValue !== 'string') {
      return null;
    }
  }
  return Object.fromEntries(entries as Array<[string, string]>);
}

function serializeFieldsObject(obj: Record<string, string>): string {
  const entries = Object.entries(obj).map(([key, value]) => [key, value] as const).sort(([a], [b]) => a.localeCompare(b));
  return JSON.stringify(entries);
}

export function AttachmentBlockEditor({ block }: { block: EditorBlock }): JSX.Element {
  const upsertBlockFromRaw = useEditorStore((state) => state.upsertBlockFromRaw);
  const [attachmentState, setAttachmentState] = useState<Record<string, unknown>>(() => normalizeAttachment(block));
  const [showAllOptions, setShowAllOptions] = useState(false);
  const [customEditors, setCustomEditors] = useState<Record<string, { text: string; error?: string }>>({});
  const [isAddingCustom, setIsAddingCustom] = useState(false);
  const [customKey, setCustomKey] = useState('');
  const [customValue, setCustomValue] = useState('');
  const [customError, setCustomError] = useState<string | null>(null);
  const [pdfFields, setPdfFields] = useState<PdfFieldEntry[]>([]);
  const pdfFieldsSerializedRef = useRef<string>('');
  const [pdfFieldsSupported, setPdfFieldsSupported] = useState<boolean>(true);
  const skipPersistRef = useRef(true);

  useEffect(() => {
    const next = normalizeAttachment(block);
    skipPersistRef.current = true;
    setAttachmentState(next);
    setShowAllOptions(false);
    setIsAddingCustom(false);
    setCustomKey('');
    setCustomValue('');
    setCustomError(null);
  }, [block]);

  const serializedState = useMemo(() => JSON.stringify(attachmentState), [attachmentState]);
  const debouncedSerializedState = useDebouncedValue(serializedState, 400);

  const persistAttachment = useCallback(
    (state: Record<string, unknown>) => {
      const base = (block.metadata.rawData ?? {}) as Record<string, unknown>;
      const nextRaw = {
        ...base,
        attachment: sanitizeAttachment(state),
      };
      const yaml = stringify(nextRaw).trim();
      upsertBlockFromRaw(block.id, yaml);
    },
    [block.id, block.metadata.rawData, upsertBlockFromRaw],
  );

  useEffect(() => {
    if (skipPersistRef.current) {
      skipPersistRef.current = false;
      return;
    }
    try {
      const parsed = JSON.parse(debouncedSerializedState) as Record<string, unknown>;
      persistAttachment(parsed);
    } catch {
      // ignore JSON parse failures from transient state
    }
  }, [debouncedSerializedState, persistAttachment]);

  const setAttachmentValue = useCallback((key: string, value: unknown) => {
    setAttachmentState((prev) => {
      const next = { ...prev };
      if (value === undefined) {
        delete next[key];
      } else {
        next[key] = value;
      }
      return next;
    });
  }, []);

  const getBooleanSelectValue = (value: unknown): string => {
    if (value === true) {
      return 'true';
    }
    if (value === false) {
      return 'false';
    }
    return '';
  };

  const handleBooleanChange = (key: string) => (event: ChangeEvent<HTMLSelectElement>) => {
    const { value } = event.target;
    if (value === '') {
      setAttachmentValue(key, undefined);
    } else {
      setAttachmentValue(key, value === 'true');
    }
  };

  const handleNumberChange = (key: string) => (event: ChangeEvent<HTMLInputElement>) => {
    const { value } = event.target;
    if (value === '') {
      setAttachmentValue(key, undefined);
      return;
    }
    const parsedValue = Number(value);
    if (Number.isFinite(parsedValue)) {
      setAttachmentValue(key, parsedValue);
    }
  };

  const handleStringChange = (key: string) => (event: ChangeEvent<HTMLInputElement>) => {
    const { value } = event.target;
    if (value.trim().length === 0) {
      setAttachmentValue(key, undefined);
    } else {
      setAttachmentValue(key, value);
    }
  };

  const handleTextChange = (key: string) => (event: ChangeEvent<HTMLTextAreaElement>) => {
    const { value } = event.target;
    if (value.trim().length === 0) {
      setAttachmentValue(key, undefined);
    } else {
      setAttachmentValue(key, value);
    }
  };

  const handleRichTextChange = (key: string) => (value: string) => {
    if (value.trim().length === 0) {
      setAttachmentValue(key, undefined);
    } else {
      setAttachmentValue(key, value);
    }
  };

  const handleSelectChange = (key: string) => (event: ChangeEvent<HTMLSelectElement>) => {
    const { value } = event.target;
    if (value === '') {
      setAttachmentValue(key, undefined);
    } else {
      setAttachmentValue(key, value);
    }
  };

  const handleStringListChange = (key: string) => (event: ChangeEvent<HTMLTextAreaElement>) => {
    const { value } = event.target;
    const entries = value
      .split(/\r?\n/)
      .map((entry) => entry.trim())
      .filter((entry) => entry.length > 0);
    if (entries.length === 0) {
      setAttachmentValue(key, undefined);
    } else {
      setAttachmentValue(key, entries);
    }
  };

  const baseKnownKeys = useMemo(() => new Set(ATTACHMENT_FIELDS.map((field) => field.key)), []);

  const rawFields = attachmentState.fields;
  useEffect(() => {
    const supported = extractSupportedPdfFields(rawFields);
    if (supported === null) {
      setPdfFieldsSupported(false);
      pdfFieldsSerializedRef.current = '';
      setPdfFields([]);
      return;
    }
    setPdfFieldsSupported(true);
    const serialized = serializeFieldsObject(supported);
    if (serialized !== pdfFieldsSerializedRef.current) {
      pdfFieldsSerializedRef.current = serialized;
      const entries = Object.entries(supported);
      setPdfFields(
        entries.map(([key, value]) => ({
          id: `pdf-field-${key}`,
          key,
          value,
        })),
      );
    }
  }, [rawFields]);

  const updatePdfFields = (nextEntries: PdfFieldEntry[]) => {
    setPdfFields(nextEntries);
    const nextObject: Record<string, string> = {};
    nextEntries.forEach(({ key, value }) => {
      const trimmedKey = key.trim();
      if (trimmedKey.length === 0) {
        return;
      }
      nextObject[trimmedKey] = value;
    });
    const serialized = serializeFieldsObject(nextObject);
    pdfFieldsSerializedRef.current = serialized;
    if (Object.keys(nextObject).length === 0) {
      setAttachmentValue('fields', undefined);
    } else {
      setAttachmentValue('fields', nextObject);
    }
  };

  const handlePdfFieldKeyChange = (id: string, value: string) => {
    updatePdfFields(
      pdfFields.map((entry) => (entry.id === id ? { ...entry, key: value } : entry)),
    );
  };

  const handlePdfFieldValueChange = (id: string, value: string) => {
    updatePdfFields(
      pdfFields.map((entry) => (entry.id === id ? { ...entry, value } : entry)),
    );
  };

  const handleAddPdfField = () => {
    const newEntry: PdfFieldEntry = {
      id: `pdf-field-${Date.now().toString(36)}`,
      key: '',
      value: '',
    };
    updatePdfFields([...pdfFields, newEntry]);
  };

  const handleRemovePdfField = (id: string) => {
    updatePdfFields(pdfFields.filter((entry) => entry.id !== id));
  };

  const renderableKeys = useMemo(() => {
    const keys = new Set<string>();
    ATTACHMENT_FIELDS.forEach((field) => {
      const value = attachmentState[field.key];
      switch (field.type) {
        case 'boolean':
          if (value === undefined || typeof value === 'boolean') {
            keys.add(field.key);
          }
          break;
        case 'number':
          if (value === undefined || typeof value === 'number') {
            keys.add(field.key);
          }
          break;
        case 'string':
        case 'text':
        case 'richText':
        case 'select':
          if (value === undefined || isSupportedScalar(value)) {
            keys.add(field.key);
          }
          break;
        case 'stringList':
          if (value === undefined || isStringList(value)) {
            keys.add(field.key);
          }
          break;
        default:
          break;
      }
    });
    if (pdfFieldsSupported) {
      keys.add('fields');
    }
    return keys;
  }, [attachmentState, pdfFieldsSupported]);

  const unknownKeys = useMemo(() => {
    return Object.keys(attachmentState).filter((key) => {
      if (!baseKnownKeys.has(key) && key !== 'fields') {
        return true;
      }
      if (!renderableKeys.has(key)) {
        return true;
      }
      if (key === 'fields' && !pdfFieldsSupported) {
        return true;
      }
      return false;
    });
  }, [attachmentState, baseKnownKeys, renderableKeys, pdfFieldsSupported]);

  useEffect(() => {
    setCustomEditors((prev) => {
      const next: Record<string, { text: string; error?: string }> = {};
      unknownKeys.forEach((key) => {
        const value = attachmentState[key];
        const serialized = stringify(value).trim();
        const previous = prev[key];
        if (previous && previous.text === serialized) {
          next[key] = previous;
        } else {
          next[key] = { text: serialized };
        }
      });
      return next;
    });
  }, [attachmentState, unknownKeys]);

  const handleUnknownChange = (key: string) => (event: ChangeEvent<HTMLTextAreaElement>) => {
    const { value } = event.target;
    setCustomEditors((prev) => ({
      ...prev,
      [key]: { ...prev[key], text: value },
    }));
  };

  const handleUnknownBlur = (key: string) => () => {
    const entry = customEditors[key];
    if (!entry) {
      return;
    }
    const text = entry.text.trim();
    if (text.length === 0) {
      setCustomEditors((prev) => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
      setAttachmentValue(key, undefined);
      return;
    }
    try {
      const parsed = parse(text);
      setAttachmentValue(key, parsed);
      setCustomEditors((prev) => ({
        ...prev,
        [key]: { text, error: undefined },
      }));
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to parse value.';
      setCustomEditors((prev) => ({
        ...prev,
        [key]: { text, error: message },
      }));
    }
  };

  const activeFields = useMemo(
    () =>
      ATTACHMENT_FIELDS.filter(
        (field) =>
          attachmentState[field.key] !== undefined &&
          renderableKeys.has(field.key),
      ),
    [attachmentState, renderableKeys],
  );

  const inactiveFields = useMemo(
    () =>
      ATTACHMENT_FIELDS.filter(
        (field) =>
          attachmentState[field.key] === undefined && renderableKeys.has(field.key),
      ),
    [attachmentState, renderableKeys],
  );

  const activeByCategory = useMemo(() => {
    return ATTACHMENT_CATEGORIES.map((category) => {
      const fields = activeFields.filter((field) => field.category === category);
      return { category, fields };
    }).filter((entry) => entry.fields.length > 0);
  }, [activeFields]);

  const inactiveByCategory = useMemo(() => {
    if (!showAllOptions) {
      return [];
    }
    return ATTACHMENT_CATEGORIES.map((category) => {
      const fields = inactiveFields.filter((field) => field.category === category);
      return { category, fields };
    }).filter((entry) => entry.fields.length > 0);
  }, [inactiveFields, showAllOptions]);

  const renderFieldControl = (field: AttachmentFieldConfig) => {
    const currentValue = attachmentState[field.key];
    const fieldId = `attachment-${field.key.replace(/\s+/g, '-')}`;
    const description = field.description ? (
      <p className="text-xs text-text-muted">{field.description}</p>
    ) : null;

    switch (field.type) {
      case 'boolean':
        return (
          <div key={field.key} className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-[0.18em] text-text-muted" htmlFor={fieldId}>
              {field.label}
            </label>
            <select
              id={fieldId}
              value={getBooleanSelectValue(currentValue)}
              onChange={handleBooleanChange(field.key)}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-text-primary focus:border-primary/40 focus:outline-none focus:ring-0"
            >
              <option value="">Use default behaviour</option>
              <option value="true">Enable</option>
              <option value="false">Disable</option>
            </select>
            {description}
          </div>
        );
      case 'number':
        return (
          <div key={field.key} className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-[0.18em] text-text-muted" htmlFor={fieldId}>
              {field.label}
            </label>
            <input
              id={fieldId}
              type="number"
              value={typeof currentValue === 'number' ? currentValue : ''}
              onChange={handleNumberChange(field.key)}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-text-primary focus:border-primary/40 focus:outline-none focus:ring-0"
              placeholder={field.placeholder}
            />
            {description}
          </div>
        );
      case 'string':
        return (
          <div key={field.key} className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-[0.18em] text-text-muted" htmlFor={fieldId}>
              {field.label}
            </label>
            <input
              id={fieldId}
              type="text"
              value={typeof currentValue === 'string' ? currentValue : ''}
              onChange={handleStringChange(field.key)}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-text-primary focus:border-primary/40 focus:outline-none focus:ring-0"
              placeholder={field.placeholder}
            />
            {description}
          </div>
        );
      case 'text':
        return (
          <div key={field.key} className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-[0.18em] text-text-muted" htmlFor={fieldId}>
              {field.label}
            </label>
            <textarea
              id={fieldId}
              value={typeof currentValue === 'string' ? currentValue : ''}
              onChange={handleTextChange(field.key)}
              className="h-28 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-text-primary focus:border-primary/40 focus:outline-none focus:ring-0"
              placeholder={field.placeholder}
            />
            {description}
          </div>
        );
      case 'richText':
        return (
          <div
            key={field.key}
            className={clsx('space-y-2', field.key === 'content' ? 'md:col-span-2' : undefined)}
          >
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-text-muted">
              {field.label}
            </p>
            <RichTextEditor
              value={typeof currentValue === 'string' ? currentValue : ''}
              onChange={handleRichTextChange(field.key)}
              onBlur={handleRichTextChange(field.key)}
              placeholder={field.placeholder}
              className={field.key === 'content' ? 'min-h-[180px]' : 'min-h-[120px]'}
            />
            {description}
          </div>
        );
      case 'select': {
        const value =
          typeof currentValue === 'string'
            ? currentValue
            : currentValue === true
              ? 'true'
              : currentValue === false
                ? 'false'
                : '';
        return (
          <div key={field.key} className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-[0.18em] text-text-muted" htmlFor={fieldId}>
              {field.label}
            </label>
            <select
              id={fieldId}
              value={value}
              onChange={handleSelectChange(field.key)}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-text-primary focus:border-primary/40 focus:outline-none focus:ring-0"
            >
              {(field.options ?? []).map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            {description}
          </div>
        );
      }
      case 'stringList': {
        const listValue = Array.isArray(currentValue)
          ? currentValue.join('\n')
          : typeof currentValue === 'string'
            ? currentValue
            : '';
        return (
          <div key={field.key} className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-[0.18em] text-text-muted" htmlFor={fieldId}>
              {field.label}
            </label>
            <textarea
              id={fieldId}
              value={listValue}
              onChange={handleStringListChange(field.key)}
              className="h-24 w-full rounded-lg border border-border bg-background px-3 py-2 font-mono text-xs text-text-primary focus:border-primary/40 focus:outline-none focus:ring-0"
              placeholder={field.placeholder ?? 'One item per line'}
            />
            {description}
          </div>
        );
      }
      default:
        return null;
    }
  };

  const startAddingCustom = () => {
    setIsAddingCustom(true);
    setCustomKey('');
    setCustomValue('');
    setCustomError(null);
  };

  const cancelAddingCustom = () => {
    setIsAddingCustom(false);
    setCustomKey('');
    setCustomValue('');
    setCustomError(null);
  };

  const handleSubmitCustom = () => {
    const trimmedKey = customKey.trim();
    if (!trimmedKey) {
      setCustomError('Provide a key for the attachment setting.');
      return;
    }
    if (attachmentState[trimmedKey] !== undefined) {
      setCustomError('That key already exists on this attachment.');
      return;
    }
    const valueText = customValue.trim();
    if (!valueText) {
      setCustomError('Provide a YAML value.');
      return;
    }
    try {
      const parsed = parse(valueText);
      setAttachmentValue(trimmedKey, parsed);
      setCustomError(null);
      cancelAddingCustom();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to parse value.';
      setCustomError(message);
    }
  };

  const showPdfFields = (attachmentState['pdf template file'] !== undefined || pdfFields.length > 0) && pdfFieldsSupported;

  return (
    <div className="space-y-6">
      <section className="space-y-4">
        <header>
          <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-text-muted">In-use settings</h3>
          <p className="text-xs text-text-muted">
            These properties are currently defined on this attachment block. Edit them inline and the YAML will update automatically.
          </p>
        </header>
        {activeByCategory.length === 0 ? (
          <p className="rounded-xl border border-dashed border-border bg-background/60 px-3 py-2 text-xs text-text-muted">
            No attachment properties have been configured yet. Use &ldquo;Show all attachment options&rdquo; to enable more settings.
          </p>
        ) : (
          activeByCategory.map(({ category, fields }) => (
            <section key={category} className="space-y-3">
              <header>
                <h4 className="text-xs font-semibold uppercase tracking-[0.18em] text-text-muted">{category}</h4>
              </header>
              <div className="grid gap-4 md:grid-cols-2">{fields.map((field) => renderFieldControl(field))}</div>
            </section>
          ))
        )}
      </section>

      {showAllOptions ? (
        <section className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-text-muted">Available options</h3>
            <button
              type="button"
              className="text-sm font-medium text-primary transition hover:text-primary/80"
              onClick={() => setShowAllOptions(false)}
            >
              Hide unused options
            </button>
          </div>
          {inactiveByCategory.length === 0 ? (
            <p className="rounded-xl border border-dashed border-border bg-background/60 px-3 py-2 text-xs text-text-muted">
              All documented options are already configured in this block.
            </p>
          ) : (
            inactiveByCategory.map(({ category, fields }) => (
              <section key={category} className="space-y-4">
                <header>
                  <h4 className="text-xs font-semibold uppercase tracking-[0.18em] text-text-muted">{category}</h4>
                </header>
                <div className="grid gap-4 md:grid-cols-2">{fields.map((field) => renderFieldControl(field))}</div>
              </section>
            ))
          )}
        </section>
      ) : (
        <button
          type="button"
          className="inline-flex items-center justify-center gap-2 rounded-lg border border-dashed border-border px-3 py-2 text-sm text-text-muted transition hover:border-primary/60 hover:text-text-primary"
          onClick={() => setShowAllOptions(true)}
        >
          Show all attachment options
        </button>
      )}

      {showPdfFields && (
        <section className="space-y-4">
          <header className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-text-muted">PDF field mapping</h3>
              <p className="text-xs text-text-muted">
                Map PDF form field names to expressions. Leave value blank to remove a field.
              </p>
            </div>
            <button
              type="button"
              className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-xs text-text-muted transition hover:border-primary/60 hover:text-text-primary"
              onClick={handleAddPdfField}
            >
              <Plus className="h-4 w-4" />
              Add field
            </button>
          </header>
          {pdfFields.length === 0 ? (
            <p className="rounded-xl border border-dashed border-border bg-background/60 px-3 py-2 text-xs text-text-muted">
              No PDF fields defined yet. Add field mappings to populate the template.
            </p>
          ) : (
            <div className="space-y-2">
              {pdfFields.map((entry) => (
                <div key={entry.id} className="flex flex-col gap-2 rounded-xl border border-border bg-surface px-3 py-3 shadow-sm md:flex-row md:items-start">
                  <div className="flex-1 space-y-2">
                <label
                  className="text-[0.65rem] font-semibold uppercase tracking-[0.18em] text-text-muted"
                  htmlFor={`pdf-field-name-${entry.id}`}
                >
                  Field name
                </label>
                <input
                  id={`pdf-field-name-${entry.id}`}
                  type="text"
                  value={entry.key}
                  onChange={(event) => handlePdfFieldKeyChange(entry.id, event.target.value)}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-text-primary focus:border-primary/40 focus:outline-none focus:ring-0"
                  placeholder="Field name in the PDF"
                    />
                  </div>
                  <div className="flex-1 space-y-2">
                <label
                  className="text-[0.65rem] font-semibold uppercase tracking-[0.18em] text-text-muted"
                  htmlFor={`pdf-field-value-${entry.id}`}
                >
                  Value / expression
                </label>
                <textarea
                  id={`pdf-field-value-${entry.id}`}
                  value={entry.value}
                  onChange={(event) => handlePdfFieldValueChange(entry.id, event.target.value)}
                  className="h-20 w-full rounded-lg border border-border bg-background px-3 py-2 font-mono text-xs text-text-primary focus:border-primary/40 focus:outline-none focus:ring-0"
                  placeholder='e.g. ${ user.first_name }'
                />
                  </div>
                  <button
                    type="button"
                    className="inline-flex h-8 w-8 items-center justify-center rounded-md text-text-muted transition hover:bg-muted hover:text-text-primary"
                    onClick={() => handleRemovePdfField(entry.id)}
                    aria-label="Remove PDF field"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      <section className="space-y-4">
        <header>
          <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-text-muted">Other settings</h3>
          <p className="text-xs text-text-muted">
            These keys use custom YAML values or structures not yet supported visually. Edit them directly or switch to the code view for full control.
          </p>
        </header>
        {unknownKeys.length === 0 ? (
          <p className="rounded-xl border border-dashed border-border bg-background/60 px-3 py-2 text-xs text-text-muted">
            No additional attachment settings detected.
          </p>
        ) : (
          <div className="space-y-4">
            {unknownKeys.map((key) => {
              const control = customEditors[key];
              return (
                <Fragment key={key}>
                  <div className="space-y-2 rounded-xl border border-border bg-surface px-3 py-3 shadow-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold uppercase tracking-[0.18em] text-text-muted">{key}</span>
                    </div>
                    <textarea
                      value={control?.text ?? ''}
                      onChange={handleUnknownChange(key)}
                      onBlur={handleUnknownBlur(key)}
                      className="h-28 w-full rounded-lg border border-border bg-background px-3 py-2 font-mono text-xs text-text-primary focus:border-primary/40 focus:outline-none focus:ring-0"
                      placeholder="YAML value"
                    />
                    {control?.error ? (
                      <p className="text-xs text-warning">{control.error}</p>
                    ) : (
                      <p className="text-xs text-text-muted">YAML snippet for this attachment property.</p>
                    )}
                  </div>
                </Fragment>
              );
            })}
          </div>
        )}

        <div className="space-y-3">
          {isAddingCustom ? (
            <div className="space-y-3 rounded-xl border border-dashed border-border bg-surface px-3 py-3 shadow-sm">
              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase tracking-[0.18em] text-text-muted" htmlFor="custom-attachment-key">
                  Attachment key
                </label>
                <input
                  id="custom-attachment-key"
                  value={customKey}
                  onChange={(event) => setCustomKey(event.target.value)}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-text-primary focus:border-primary/40 focus:outline-none focus:ring-0"
                  placeholder="custom_setting"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase tracking-[0.18em] text-text-muted" htmlFor="custom-attachment-value">
                  YAML value
                </label>
                <textarea
                  id="custom-attachment-value"
                  value={customValue}
                  onChange={(event) => setCustomValue(event.target.value)}
                  className="h-28 w-full rounded-lg border border-border bg-background px-3 py-2 font-mono text-xs text-text-primary focus:border-primary/40 focus:outline-none focus:ring-0"
                  placeholder="true\n# or complex YAML"
                />
              </div>
              {customError && <p className="text-xs text-warning">{customError}</p>}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  className="inline-flex flex-1 items-center justify-center rounded-lg bg-primary px-3 py-2 text-sm font-medium text-white transition hover:bg-primary/90"
                  onClick={handleSubmitCustom}
                >
                  Add attachment entry
                </button>
                <button
                  type="button"
                  className="inline-flex flex-1 items-center justify-center rounded-lg border border-border px-3 py-2 text-sm text-text-muted transition hover:border-primary/40 hover:text-text-primary"
                  onClick={cancelAddingCustom}
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-dashed border-border px-3 py-2 text-sm text-text-muted transition hover:border-primary/60 hover:text-text-primary"
              onClick={startAddingCustom}
            >
              Add custom attachment entry
            </button>
          )}
        </div>
      </section>
    </div>
  );
}
