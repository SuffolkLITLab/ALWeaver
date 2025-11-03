import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ChangeEvent } from 'react';
import { parse, stringify } from 'yaml';
import type { EditorBlock } from '@/state/types';
import { useEditorStore } from '@/state/editorStore';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';

type MetadataFieldType = 'string' | 'text' | 'number' | 'boolean' | 'select' | 'stringList';

interface MetadataFieldOption {
  label: string;
  value: string;
}

interface MetadataFieldConfig {
  key: string;
  label: string;
  description?: string;
  category: string;
  type: MetadataFieldType;
  placeholder?: string;
  options?: MetadataFieldOption[];
}

const METADATA_FIELDS: MetadataFieldConfig[] = [
  {
    key: 'title',
    label: 'Title',
    description: 'Shown in the navigation bar and browser tab when no tab title is set.',
    category: 'Basic info',
    type: 'text',
    placeholder: 'Interview title...',
  },
  {
    key: 'short title',
    label: 'Short title',
    description: 'Used on small screens when the full title will not fit.',
    category: 'Basic info',
    type: 'string',
  },
  {
    key: 'tab title',
    label: 'Browser tab title',
    description: 'Overrides the browser tab text without changing the navigation title.',
    category: 'Basic info',
    type: 'string',
  },
  {
    key: 'subtitle',
    label: 'Subtitle',
    description: 'Shown under the title in saved interview lists.',
    category: 'Basic info',
    type: 'text',
  },
  {
    key: 'description',
    label: 'Description',
    description: 'Detailed explanation of what the interview does.',
    category: 'User guidance',
    type: 'text',
  },
  {
    key: 'can_I_use_this_form',
    label: 'Can I use this form?',
    description: 'Explain when the interview should be used.',
    category: 'User guidance',
    type: 'text',
  },
  {
    key: 'before_you_start',
    label: 'Before you start',
    description: 'Tell users what information to gather before starting.',
    category: 'User guidance',
    type: 'text',
  },
  {
    key: 'maturity',
    label: 'Maturity',
    description: 'Flag the development status of the interview.',
    category: 'Publishing & scheduling',
    type: 'select',
    options: [
      { label: 'Not set', value: '' },
      { label: 'Production', value: 'production' },
      { label: 'Testing', value: 'testing' },
      { label: 'Development', value: 'development' },
    ],
  },
  {
    key: 'estimated_completion_minutes',
    label: 'Estimated completion minutes',
    description: 'How long a typical user takes to finish the interview.',
    category: 'Publishing & scheduling',
    type: 'number',
    placeholder: 'e.g. 15',
  },
  {
    key: 'estimated_completion_delta',
    label: 'Completion time margin',
    description: 'Variation (± minutes) in the completion time.',
    category: 'Publishing & scheduling',
    type: 'number',
    placeholder: 'e.g. 5',
  },
  {
    key: 'review_date',
    label: 'Review date',
    description: 'Schedule the next content review (YYYY-MM-DD).',
    category: 'Publishing & scheduling',
    type: 'string',
    placeholder: 'YYYY-MM-DD',
  },
  {
    key: 'revision_date',
    label: 'Revision date',
    description: 'Date when the interview was last revised.',
    category: 'Publishing & scheduling',
    type: 'string',
    placeholder: 'YYYY-MM-DD',
  },
  {
    key: 'original_form',
    label: 'Original form URL',
    description: 'Link to the blank form being automated.',
    category: 'Publishing & scheduling',
    type: 'string',
    placeholder: 'https://example.com/form.pdf',
  },
  {
    key: 'original_form_published_on',
    label: 'Original form published on',
    description: 'Publication date of the original form (YYYY-MM-DD).',
    category: 'Publishing & scheduling',
    type: 'string',
  },
  {
    key: 'update_notes',
    label: 'Update notes',
    description: 'Track major changes and review history.',
    category: 'Publishing & scheduling',
    type: 'text',
  },
  {
    key: 'languages',
    label: 'Available languages',
    description: 'Language codes for available translations (one per line).',
    category: 'Localization',
    type: 'stringList',
    placeholder: 'en\nes',
  },
  {
    key: 'default language',
    label: 'Default language',
    description: 'Overrides the server-wide default language for this interview.',
    category: 'Localization',
    type: 'string',
    placeholder: 'e.g. en',
  },
  {
    key: 'help_page_url',
    label: 'Help page URL',
    description: 'Link to additional help or information.',
    category: 'Help & references',
    type: 'string',
    placeholder: 'https://example.com/help',
  },
  {
    key: 'help_page_title',
    label: 'Help page title',
    description: 'Display name for the help page link.',
    category: 'Help & references',
    type: 'string',
  },
  {
    key: 'LIST_topics',
    label: 'LIST topics',
    description: 'LIST taxonomy codes (preferred classification).',
    category: 'Classification',
    type: 'stringList',
    placeholder: 'BE-04-00-00-00',
  },
  {
    key: 'tags',
    label: 'Tags',
    description: 'Fallback taxonomy codes if LIST topics are not available.',
    category: 'Classification',
    type: 'stringList',
  },
  {
    key: 'jurisdiction',
    label: 'Jurisdiction',
    description: 'Geographic scope using jurisdiction codes.',
    category: 'Classification',
    type: 'string',
    placeholder: 'NAM-US-US+MA',
  },
  {
    key: 'form_titles',
    label: 'Form titles',
    description: 'Names of forms included in the interview.',
    category: 'Form details',
    type: 'stringList',
  },
  {
    key: 'form_numbers',
    label: 'Form numbers',
    description: 'Official identifiers for the forms.',
    category: 'Form details',
    type: 'stringList',
  },
  {
    key: 'fees',
    label: 'Fees',
    description: 'Filing fees or costs associated with the interview.',
    category: 'Form details',
    type: 'stringList',
    placeholder: 'Filing fee: 0.00',
  },
  {
    key: 'logo',
    label: 'Logo HTML',
    description: 'Raw HTML for the navigation bar logo.',
    category: 'Branding & layout',
    type: 'text',
  },
  {
    key: 'short logo',
    label: 'Short logo HTML',
    description: 'A narrower logo for small screens.',
    category: 'Branding & layout',
    type: 'text',
  },
  {
    key: 'navigation bar html',
    label: 'Navigation bar HTML',
    description: 'Raw HTML inserted into the navigation bar.',
    category: 'Branding & layout',
    type: 'text',
  },
  {
    key: 'pre',
    label: 'Screen part: pre',
    description: 'Content injected above the question area.',
    category: 'Screen parts',
    type: 'text',
  },
  {
    key: 'post',
    label: 'Screen part: post',
    description: 'Content injected below the question area.',
    category: 'Screen parts',
    type: 'text',
  },
  {
    key: 'submit',
    label: 'Screen part: submit',
    description: 'Content shown near the buttons.',
    category: 'Screen parts',
    type: 'text',
  },
  {
    key: 'under',
    label: 'Screen part: under',
    description: 'Content displayed below the main card.',
    category: 'Screen parts',
    type: 'text',
  },
  {
    key: 'right',
    label: 'Screen part: right',
    description: 'Sidebar content for wider layouts.',
    category: 'Screen parts',
    type: 'text',
  },
  {
    key: 'footer',
    label: 'Footer',
    description: 'Content appended to the bottom of each screen.',
    category: 'Screen parts',
    type: 'text',
  },
  {
    key: 'help label',
    label: 'Help label',
    description: 'Overrides the label for the help tab or button.',
    category: 'Buttons & labels',
    type: 'string',
  },
  {
    key: 'help button color',
    label: 'Help button color',
    description: 'Bootstrap color variant for the help button.',
    category: 'Buttons & labels',
    type: 'string',
    placeholder: 'primary | secondary | warning | ...',
  },
  {
    key: 'continue button label',
    label: 'Continue button label',
    description: 'Custom text for the Continue button.',
    category: 'Buttons & labels',
    type: 'string',
  },
  {
    key: 'continue button color',
    label: 'Continue button color',
    description: 'Bootstrap color variant for the Continue button.',
    category: 'Buttons & labels',
    type: 'string',
  },
  {
    key: 'back button label',
    label: 'Back button label',
    description: 'Custom text for the Back button.',
    category: 'Buttons & labels',
    type: 'string',
  },
  {
    key: 'back button color',
    label: 'Back button color',
    description: 'Bootstrap color variant for the Back button.',
    category: 'Buttons & labels',
    type: 'string',
  },
  {
    key: 'resume button label',
    label: 'Resume button label',
    description: 'Text for the Resume button on review screens.',
    category: 'Buttons & labels',
    type: 'string',
  },
  {
    key: 'resume button color',
    label: 'Resume button color',
    description: 'Bootstrap color variant for the Resume button.',
    category: 'Buttons & labels',
    type: 'string',
  },
  {
    key: 'title url',
    label: 'Title link URL',
    description: 'Make the title clickable and navigate to this URL.',
    category: 'Navigation & links',
    type: 'string',
    placeholder: 'https://example.com',
  },
  {
    key: 'title url opens in other window',
    label: 'Title link opens in new tab',
    description: 'Open the title URL in a new browser tab.',
    category: 'Navigation & links',
    type: 'boolean',
  },
  {
    key: 'exit link',
    label: 'Exit link behaviour',
    description: 'Control what happens when a user selects Exit.',
    category: 'Navigation & links',
    type: 'select',
    options: [
      { label: 'Use default behaviour', value: '' },
      { label: 'Exit (delete answers, go to exit URL)', value: 'exit' },
      { label: 'Leave (keep answers, go to exit URL)', value: 'leave' },
      { label: 'Logout', value: 'logout' },
      { label: 'Exit and logout', value: 'exit_logout' },
    ],
  },
  {
    key: 'exit url',
    label: 'Exit URL',
    description: 'Destination when the user selects Exit.',
    category: 'Navigation & links',
    type: 'string',
  },
  {
    key: 'exit label',
    label: 'Exit label',
    description: 'Override the text of the Exit menu option.',
    category: 'Navigation & links',
    type: 'string',
  },
  {
    key: 'show login',
    label: 'Show login prompt',
    description: 'Display the sign in/up link during the interview.',
    category: 'Access & sessions',
    type: 'boolean',
  },
  {
    key: 'require login',
    label: 'Require login',
    description: 'Force users to sign in before using the interview.',
    category: 'Access & sessions',
    type: 'boolean',
  },
  {
    key: 'hidden',
    label: 'Hide from “My Interviews” list',
    description: 'Keep sessions for this interview out of user dashboards.',
    category: 'Access & sessions',
    type: 'boolean',
  },
  {
    key: 'unlisted',
    label: 'Hide from listings',
    description: 'Remove this interview from the /list catalogue.',
    category: 'Access & sessions',
    type: 'boolean',
  },
  {
    key: 'error help',
    label: 'Error help message',
    description: 'Markdown text appended to error screens.',
    category: 'Maintenance & notes',
    type: 'text',
  },
];

const METADATA_CATEGORIES = Array.from(new Set(METADATA_FIELDS.map((field) => field.category)));

function normalizeMetadata(block: EditorBlock): Record<string, unknown> {
  const raw = (block.metadata.rawData ?? {}) as Record<string, unknown>;
  const metadata = raw.metadata;
  if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) {
    return {};
  }
  return { ...(metadata as Record<string, unknown>) };
}

function sanitizeMetadata(state: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  Object.entries(state).forEach(([key, value]) => {
    if (value === undefined || value === null) {
      return;
    }
    if (typeof value === 'string') {
      if (value.trim().length === 0) {
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
        .map((entry) => {
          if (typeof entry === 'string') {
            return entry.trim();
          }
          return entry;
        })
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
    result[key] = value;
  });
  return result;
}

function stringifyValue(value: unknown): string {
  const yaml = stringify(value);
  return yaml.trim();
}

function isRenderable(field: MetadataFieldConfig, value: unknown): boolean {
  if (value === undefined) {
    return false;
  }
  switch (field.type) {
    case 'boolean':
      return typeof value === 'boolean';
    case 'number':
      return typeof value === 'number';
    case 'string':
    case 'text':
      return typeof value === 'string';
    case 'select':
      return typeof value === 'string' || typeof value === 'boolean';
    case 'stringList':
      return (
        Array.isArray(value) &&
        value.every((entry) => typeof entry === 'string')
      );
    default:
      return false;
  }
}

export function MetadataBlockEditor({ block }: { block: EditorBlock }): JSX.Element {
  const upsertBlockFromRaw = useEditorStore((state) => state.upsertBlockFromRaw);
  const [metadataState, setMetadataState] = useState<Record<string, unknown>>(() => normalizeMetadata(block));
  const latestStateRef = useRef(metadataState);
  const skipPersistRef = useRef(true);
  const [showAllOptions, setShowAllOptions] = useState(false);
  const [customEditors, setCustomEditors] = useState<Record<string, { text: string; error?: string }>>({});
  const [isAddingCustom, setIsAddingCustom] = useState(false);
  const [customKey, setCustomKey] = useState('');
  const [customValue, setCustomValue] = useState('');
  const [customError, setCustomError] = useState<string | null>(null);

  useEffect(() => {
    const next = normalizeMetadata(block);
    skipPersistRef.current = true;
    setMetadataState(next);
    setShowAllOptions(false);
  }, [block]);

  useEffect(() => {
    latestStateRef.current = metadataState;
  }, [metadataState]);

  const serializedState = useMemo(() => JSON.stringify(metadataState), [metadataState]);
  const debouncedSerializedState = useDebouncedValue(serializedState, 400);

  const persistMetadata = useCallback(
    (state: Record<string, unknown>) => {
      const base = (block.metadata.rawData ?? {}) as Record<string, unknown>;
      const nextRaw = {
        ...base,
        metadata: sanitizeMetadata(state),
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
      persistMetadata(parsed);
    } catch {
      // ignore JSON parse failures
    }
  }, [debouncedSerializedState, persistMetadata]);

  const setMetadataValue = useCallback((key: string, value: unknown) => {
    setMetadataState((prev) => {
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
      setMetadataValue(key, undefined);
    } else {
      setMetadataValue(key, value === 'true');
    }
  };

  const handleNumberChange = (key: string) => (event: ChangeEvent<HTMLInputElement>) => {
    const { value } = event.target;
    if (value === '') {
      setMetadataValue(key, undefined);
      return;
    }
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      setMetadataValue(key, parsed);
    }
  };

  const handleStringChange = (key: string) => (event: ChangeEvent<HTMLInputElement>) => {
    const { value } = event.target;
    if (value.trim().length === 0) {
      setMetadataValue(key, undefined);
    } else {
      setMetadataValue(key, value);
    }
  };

  const handleTextChange = (key: string) => (event: ChangeEvent<HTMLTextAreaElement>) => {
    const { value } = event.target;
    if (value.trim().length === 0) {
      setMetadataValue(key, undefined);
    } else {
      setMetadataValue(key, value);
    }
  };

  const handleSelectChange = (key: string) => (event: ChangeEvent<HTMLSelectElement>) => {
    const { value } = event.target;
    if (value === '') {
      setMetadataValue(key, undefined);
    } else {
      setMetadataValue(key, value);
    }
  };

  const handleStringListChange = (key: string) => (event: ChangeEvent<HTMLTextAreaElement>) => {
    const { value } = event.target;
    const entries = value
      .split(/\r?\n/)
      .map((entry) => entry.trim())
      .filter((entry) => entry.length > 0);
    if (entries.length === 0) {
      setMetadataValue(key, undefined);
    } else {
      setMetadataValue(key, entries);
    }
  };

  const knownKeys = useMemo(() => new Set(METADATA_FIELDS.map((field) => field.key)), []);

  const unsupportedKnownKeys = useMemo(() => {
    const unsupported = new Set<string>();
    METADATA_FIELDS.forEach((field) => {
      const value = metadataState[field.key];
      if (value !== undefined && !isRenderable(field, value)) {
        unsupported.add(field.key);
      }
    });
    return unsupported;
  }, [metadataState]);

  const unknownKeys = useMemo(
    () =>
      Object.keys(metadataState).filter((key) => {
        if (!knownKeys.has(key)) {
          return true;
        }
        return unsupportedKnownKeys.has(key);
      }),
    [metadataState, knownKeys, unsupportedKnownKeys],
  );

  const activeFields = useMemo(
    () =>
      METADATA_FIELDS.filter((field) => {
        if (unsupportedKnownKeys.has(field.key)) {
          return false;
        }
        return metadataState[field.key] !== undefined;
      }),
    [metadataState, unsupportedKnownKeys],
  );

  const inactiveFields = useMemo(
    () =>
      METADATA_FIELDS.filter((field) => metadataState[field.key] === undefined),
    [metadataState],
  );

  useEffect(() => {
    setCustomEditors((prev) => {
      const next: Record<string, { text: string; error?: string }> = {};
      unknownKeys.forEach((key) => {
        const value = metadataState[key];
        const serialized = stringifyValue(value);
        const previous = prev[key];
        if (previous && previous.text === serialized) {
          next[key] = previous;
        } else {
          next[key] = { text: serialized };
        }
      });
      return next;
    });
  }, [metadataState, unknownKeys]);

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
      setMetadataValue(key, undefined);
      return;
    }
    try {
      const parsed = parse(text);
      setMetadataValue(key, parsed);
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

  const activeByCategory = useMemo(() => {
    return METADATA_CATEGORIES.map((category) => {
      const fields = activeFields.filter((field) => field.category === category);
      return { category, fields };
    }).filter((entry) => entry.fields.length > 0);
  }, [activeFields]);

  const inactiveByCategory = useMemo(() => {
    if (!showAllOptions) {
      return [];
    }
    return METADATA_CATEGORIES.map((category) => {
      const fields = inactiveFields.filter((field) => field.category === category);
      return { category, fields };
    }).filter((entry) => entry.fields.length > 0);
  }, [inactiveFields, showAllOptions]);

  const startAddingCustom = () => {
    setCustomKey('');
    setCustomValue('');
    setCustomError(null);
    setIsAddingCustom(true);
  };

  const cancelAddingCustom = () => {
    setIsAddingCustom(false);
    setCustomKey('');
    setCustomValue('');
    setCustomError(null);
  };

  const handleSubmitCustom = () => {
    const trimmedKey = customKey.trim();
    if (trimmedKey.length === 0) {
      setCustomError('Provide a metadata key.');
      return;
    }
    if (metadataState[trimmedKey] !== undefined) {
      setCustomError('That key already exists in this metadata block.');
      return;
    }
    const text = customValue.trim();
    if (text.length === 0) {
      setCustomError('Provide a YAML value.');
      return;
    }
    try {
      const parsed = parse(text);
      setMetadataValue(trimmedKey, parsed);
      setCustomError(null);
      cancelAddingCustom();
      if (!knownKeys.has(trimmedKey)) {
        setShowAllOptions(false);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to parse value.';
      setCustomError(message);
    }
  };

  const renderFieldControl = (field: MetadataFieldConfig) => {
    const currentValue = metadataState[field.key];
    const fieldId = `metadata-${field.key.replace(/\s+/g, '-')}`;
    const description = field.description ? (
      <p className="text-xs text-text-muted">{field.description}</p>
    ) : null;

    switch (field.type) {
      case 'boolean':
        return (
          <div key={field.key} className="space-y-2">
            <label
              className="text-xs font-semibold uppercase tracking-[0.18em] text-text-muted"
              htmlFor={fieldId}
            >
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
            <label
              className="text-xs font-semibold uppercase tracking-[0.18em] text-text-muted"
              htmlFor={fieldId}
            >
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
            <label
              className="text-xs font-semibold uppercase tracking-[0.18em] text-text-muted"
              htmlFor={fieldId}
            >
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
            <label
              className="text-xs font-semibold uppercase tracking-[0.18em] text-text-muted"
              htmlFor={fieldId}
            >
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
      case 'select': {
        const selectValue =
          typeof currentValue === 'string'
            ? currentValue
            : currentValue === true
              ? 'true'
              : currentValue === false
                ? 'false'
                : '';
        return (
          <div key={field.key} className="space-y-2">
            <label
              className="text-xs font-semibold uppercase tracking-[0.18em] text-text-muted"
              htmlFor={fieldId}
            >
              {field.label}
            </label>
            <select
              id={fieldId}
              value={selectValue}
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
            <label
              className="text-xs font-semibold uppercase tracking-[0.18em] text-text-muted"
              htmlFor={fieldId}
            >
              {field.label}
            </label>
            <textarea
              id={fieldId}
              value={listValue}
              onChange={handleStringListChange(field.key)}
              className="h-28 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-text-primary focus:border-primary/40 focus:outline-none focus:ring-0"
              placeholder={field.placeholder ?? 'One entry per line'}
            />
            {description}
          </div>
        );
      }
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      <section className="space-y-4">
        <header>
          <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-text-muted">In-use metadata</h3>
          <p className="text-xs text-text-muted">
            These fields are currently defined in this block. Adjust them here to update the YAML instantly.
          </p>
        </header>
        {activeByCategory.length === 0 ? (
          <p className="rounded-xl border border-dashed border-border bg-background/60 px-3 py-2 text-xs text-text-muted">
            No metadata fields are set yet. Use &ldquo;Show all metadata fields&rdquo; to add common values or add a
            custom entry below.
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
            <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-text-muted">Available metadata fields</h3>
            <button
              type="button"
              className="text-sm font-medium text-primary transition hover:text-primary/80"
              onClick={() => setShowAllOptions(false)}
            >
              Hide unused fields
            </button>
          </div>
          {inactiveByCategory.length === 0 ? (
            <p className="rounded-xl border border-dashed border-border bg-background/60 px-3 py-2 text-xs text-text-muted">
              All documented metadata fields are already configured in this block.
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
          Show all metadata fields
        </button>
      )}

      <section className="space-y-4">
        <header>
          <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-text-muted">Other settings</h3>
          <p className="text-xs text-text-muted">
            These entries use custom YAML. Edit them directly or switch to the code view for full control. They will be
            preserved when saving.
          </p>
        </header>
        {unknownKeys.length === 0 ? (
          <p className="rounded-xl border border-dashed border-border bg-background/60 px-3 py-2 text-xs text-text-muted">
            No additional metadata detected.
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
                      <p className="text-xs text-text-muted">Edit the YAML value for {key}.</p>
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
                <label className="text-xs font-semibold uppercase tracking-[0.18em] text-text-muted" htmlFor="custom-metadata-key">
                  Metadata key
                </label>
                <input
                  id="custom-metadata-key"
                  value={customKey}
                  onChange={(event) => setCustomKey(event.target.value)}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-text-primary focus:border-primary/40 focus:outline-none focus:ring-0"
                  placeholder="e.g. custom_setting"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase tracking-[0.18em] text-text-muted" htmlFor="custom-metadata-value">
                  YAML value
                </label>
                <textarea
                  id="custom-metadata-value"
                  value={customValue}
                  onChange={(event) => setCustomValue(event.target.value)}
                  className="h-28 w-full rounded-lg border border-border bg-background px-3 py-2 font-mono text-xs text-text-primary focus:border-primary/40 focus:outline-none focus:ring-0"
                  placeholder="Enter a YAML value, e.g. true or a list"
                />
              </div>
              {customError && <p className="text-xs text-warning">{customError}</p>}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  className="inline-flex flex-1 items-center justify-center rounded-lg bg-primary px-3 py-2 text-sm font-medium text-white transition hover:bg-primary/90"
                  onClick={handleSubmitCustom}
                >
                  Add metadata entry
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
              Add custom metadata entry
            </button>
          )}
        </div>
      </section>
    </div>
  );
}
