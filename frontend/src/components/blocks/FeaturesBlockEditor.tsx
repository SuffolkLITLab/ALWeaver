import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ChangeEvent } from 'react';
import { parse, stringify } from 'yaml';
import type { EditorBlock } from '@/state/types';
import { useEditorStore } from '@/state/editorStore';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';

type FeatureFieldType = 'boolean' | 'string' | 'number' | 'select' | 'stringList';

interface FeatureFieldConfig {
  key: string;
  label: string;
  description?: string;
  type: FeatureFieldType;
  category: string;
  placeholder?: string;
  options?: Array<{ label: string; value: string }>;
}

const FEATURE_FIELDS: FeatureFieldConfig[] = [
  {
    key: 'debug',
    label: 'Debug tools',
    description: 'Override the server default to show or hide the Source/debug link.',
    type: 'boolean',
    category: 'General',
  },
  {
    key: 'centered',
    label: 'Center interview',
    description: 'Controls whether interview content is centered on the screen.',
    type: 'boolean',
    category: 'Layout',
  },
  {
    key: 'wide side by side',
    label: 'Wide side-by-side layout',
    description: 'Expands the layout when the right screen part is used.',
    type: 'boolean',
    category: 'Layout',
  },
  {
    key: 'progress bar',
    label: 'Progress bar',
    description: 'Determines if a progress bar should be displayed.',
    type: 'boolean',
    category: 'Progress',
  },
  {
    key: 'show progress bar percentage',
    label: 'Show percentage',
    description: 'Adds a percentage label next to the progress bar.',
    type: 'boolean',
    category: 'Progress',
  },
  {
    key: 'progress bar multiplier',
    label: 'Progress multiplier',
    description: 'Defaults to 0.05. Determines how much the bar advances without explicit modifiers.',
    type: 'number',
    category: 'Progress',
    placeholder: '0.05',
  },
  {
    key: 'progress bar method',
    label: 'Progress method',
    description: 'Use stepped to jump to the next highest defined progress value.',
    type: 'select',
    category: 'Progress',
    options: [
      { label: 'Not set (default behaviour)', value: '' },
      { label: 'Default', value: 'default' },
      { label: 'Stepped', value: 'stepped' },
    ],
  },
  {
    key: 'progress can go backwards',
    label: 'Allow backwards progress',
    description: 'Permit the progress bar to decrease when users revisit earlier questions.',
    type: 'boolean',
    category: 'Progress',
  },
  {
    key: 'navigation',
    label: 'Navigation bar',
    description: 'Enable sections navigation or force the horizontal style.',
    type: 'select',
    category: 'Navigation',
    options: [
      { label: 'Not set (server default)', value: '' },
      { label: 'Enabled', value: 'true' },
      { label: 'Disabled', value: 'false' },
      { label: 'Horizontal', value: 'horizontal' },
    ],
  },
  {
    key: 'small screen navigation',
    label: 'Small-screen navigation',
    description: 'Control navigation behaviour on mobile devices.',
    type: 'select',
    category: 'Navigation',
    options: [
      { label: 'Not set (sidebar or fallback)', value: '' },
      { label: 'Show navigation', value: 'true' },
      { label: 'Hide navigation', value: 'false' },
      { label: 'Use dropdown menu', value: 'dropdown' },
    ],
  },
  {
    key: 'navigation back button',
    label: 'Top back button',
    description: 'Toggle the default Back button in the upper-left corner.',
    type: 'boolean',
    category: 'Navigation',
  },
  {
    key: 'question back button',
    label: 'Question back button',
    description: 'Show a Back button alongside question buttons.',
    type: 'boolean',
    category: 'Navigation',
  },
  {
    key: 'question help button',
    label: 'Question help button',
    description: 'Display a Help button inside the question body.',
    type: 'boolean',
    category: 'Help & Guidance',
  },
  {
    key: 'labels above fields',
    label: 'Labels above fields',
    description: 'Use stacked form labels instead of the Bootstrap horizontal layout.',
    type: 'boolean',
    category: 'Layout',
  },
  {
    key: 'floating labels',
    label: 'Floating labels',
    description: 'Use Bootstrap floating labels (disables field hints).',
    type: 'boolean',
    category: 'Layout',
  },
  {
    key: 'suppress autofill',
    label: 'Suppress browser autofill',
    description: 'Tell browsers not to offer autofill suggestions.',
    type: 'boolean',
    category: 'General',
  },
  {
    key: 'hide standard menu',
    label: 'Hide standard menu links',
    description: 'Remove the default Profile / Saved Sessions menu entries.',
    type: 'boolean',
    category: 'Navigation',
  },
  {
    key: 'hide corner interface',
    label: 'Hide corner interface',
    description: 'Remove the corner menu/login interface entirely.',
    type: 'boolean',
    category: 'Navigation',
  },
  {
    key: 'hide navbar',
    label: 'Hide top navbar',
    description: 'Completely hide the top navigation bar.',
    type: 'boolean',
    category: 'Navigation',
  },
  {
    key: 'bootstrap theme',
    label: 'Bootstrap theme file',
    description: 'Path or URL to a Bootstrap theme to load.',
    type: 'string',
    category: 'Styling',
    placeholder: 'e.g. docassemble.demo:data/static/lumen.min.css',
  },
  {
    key: 'javascript',
    label: 'Custom JavaScript files',
    description: 'One per line. Paths relative to the package, another package, or a URL.',
    type: 'stringList',
    category: 'Styling',
    placeholder: 'my-scripts.js\nhttps://example.com/file.js',
  },
  {
    key: 'css',
    label: 'Custom CSS files',
    description: 'One per line. Paths relative to the package, another package, or a URL.',
    type: 'stringList',
    category: 'Styling',
    placeholder: 'my-styles.css',
  },
  {
    key: 'disable analytics',
    label: 'Disable analytics',
    description: 'Turn off Segment and Google Analytics for this interview.',
    type: 'boolean',
    category: 'General',
  },
  {
    key: 'inverse navbar',
    label: 'Inverse navbar',
    description: 'Use the light (non-inverted) navbar style.',
    type: 'boolean',
    category: 'Styling',
  },
  {
    key: 'table width',
    label: 'Attachment table width',
    description: 'Default table width for attachments (in characters).',
    type: 'number',
    category: 'Documents',
    placeholder: '65',
  },
  {
    key: 'cache documents',
    label: 'Cache assembled documents',
    description: 'Disable caching when set to False.',
    type: 'boolean',
    category: 'Documents',
  },
  {
    key: 'pdftk',
    label: 'Use pdftk for PDFs',
    description: 'Generate PDFs using pdftk instead of pikepdf.',
    type: 'boolean',
    category: 'Documents',
  },
  {
    key: 'pdf/a',
    label: 'Produce PDF/A',
    description: 'Generate PDF/A compliant documents by default.',
    type: 'boolean',
    category: 'Documents',
  },
  {
    key: 'tagged pdf',
    label: 'Produce tagged PDFs',
    description: 'Create tagged PDFs by default when using DOCX templates.',
    type: 'boolean',
    category: 'Documents',
  },
  {
    key: 'maximum image size',
    label: 'Maximum image size',
    description: 'Default maximum dimension (in pixels) for uploaded images.',
    type: 'number',
    category: 'Uploads',
    placeholder: 'e.g. 100',
  },
  {
    key: 'image upload type',
    label: 'Image upload type',
    description: 'Force browser-side conversion of uploads to this format.',
    type: 'select',
    category: 'Uploads',
    options: [
      { label: 'No conversion', value: '' },
      { label: 'PNG', value: 'png' },
      { label: 'JPEG', value: 'jpeg' },
      { label: 'BMP', value: 'bmp' },
    ],
  },
  {
    key: 'go full screen',
    label: 'Go full screen',
    description: 'Useful for embedded interviews. Choose always or only on mobile.',
    type: 'select',
    category: 'Navigation',
    options: [
      { label: 'Don’t force full screen', value: '' },
      { label: 'Always', value: 'true' },
      { label: 'Mobile devices', value: 'mobile' },
    ],
  },
  {
    key: 'loop limit',
    label: 'Loop limit',
    description: 'Overrides the maximum number of loop iterations.',
    type: 'number',
    category: 'Performance',
    placeholder: 'e.g. 600',
  },
  {
    key: 'recursion limit',
    label: 'Recursion limit',
    description: 'Overrides Python’s recursion limit for this interview.',
    type: 'number',
    category: 'Performance',
    placeholder: 'e.g. 600',
  },
  {
    key: 'review button color',
    label: 'Review button color',
    description: 'Bootstrap color for buttons on review screens.',
    type: 'string',
    category: 'Review Pages',
    placeholder: 'primary | secondary | success | ...',
  },
  {
    key: 'review button icon',
    label: 'Review button icon',
    description: 'Font Awesome icon name for review buttons (e.g. pencil-alt).',
    type: 'string',
    category: 'Review Pages',
    placeholder: 'pencil-alt',
  },
  {
    key: 'use catchall',
    label: 'Enable catchall variables',
    description: 'Create DACatchAll objects for undefined variables.',
    type: 'boolean',
    category: 'Advanced',
  },
  {
    key: 'default date min',
    label: 'Default date min',
    description: 'ISO date string used as the default earliest date.',
    type: 'string',
    category: 'Fields',
    placeholder: 'YYYY-MM-DD',
  },
  {
    key: 'default date max',
    label: 'Default date max',
    description: 'ISO date string used as the default latest date.',
    type: 'string',
    category: 'Fields',
    placeholder: 'YYYY-MM-DD',
  },
  {
    key: 'send question data',
    label: 'Expose question data to JS',
    description: 'Publish daQuestionData to the browser.',
    type: 'boolean',
    category: 'Advanced',
  },
  {
    key: 'popover trigger',
    label: 'Popover trigger',
    description: 'Bootstrap trigger(s) for popovers. Space-separated list.',
    type: 'string',
    category: 'Fields',
    placeholder: 'focus | hover | click | manual',
  },
  {
    key: 'custom datatypes to load',
    label: 'Custom datatypes to load',
    description: 'One per line. Ensures the associated JavaScript is loaded.',
    type: 'stringList',
    category: 'Advanced',
    placeholder: 'ssn\niso639language',
  },
  {
    key: 'auto jinja filter',
    label: 'Auto Jinja filter',
    description: 'Name of a Python function applied to all Jinja2 interpolations.',
    type: 'string',
    category: 'Advanced',
  },
];

const FEATURE_CATEGORIES = Array.from(
  new Set(FEATURE_FIELDS.map((field) => field.category)),
);

function normalizeFeatures(block: EditorBlock): Record<string, unknown> {
  const root = (block.metadata.rawData ?? {}) as Record<string, unknown>;
  const features = root.features;
  if (!features || typeof features !== 'object' || Array.isArray(features)) {
    return {};
  }
  return { ...(features as Record<string, unknown>) };
}

function sanitizeFeatures(input: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  Object.entries(input).forEach(([key, value]) => {
    if (value === undefined || value === null) {
      return;
    }
    if (typeof value === 'string') {
      const trimmed = value.trim();
      if (trimmed.length === 0) {
        return;
      }
      result[key] = trimmed;
      return;
    }
    if (Array.isArray(value)) {
      const list = value
        .map((entry) => (typeof entry === 'string' ? entry.trim() : String(entry)))
        .filter((entry) => entry.length > 0);
      if (list.length === 0) {
        return;
      }
      result[key] = list;
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

export function FeaturesBlockEditor({ block }: { block: EditorBlock }): JSX.Element {
  const upsertBlockFromRaw = useEditorStore((state) => state.upsertBlockFromRaw);
  const [featuresState, setFeaturesState] = useState<Record<string, unknown>>(() => normalizeFeatures(block));
  const skipPersistRef = useRef(true);
  const latestStateRef = useRef(featuresState);
  const [customEditors, setCustomEditors] = useState<Record<string, { text: string; error?: string }>>({});
  const [showAllOptions, setShowAllOptions] = useState(false);

  useEffect(() => {
    const next = normalizeFeatures(block);
    skipPersistRef.current = true;
    setFeaturesState(next);
  }, [block]);

  useEffect(() => {
    latestStateRef.current = featuresState;
  }, [featuresState]);

  const serializedState = useMemo(() => JSON.stringify(featuresState), [featuresState]);
  const debouncedSerializedState = useDebouncedValue(serializedState, 400);

  const persistFeatures = useCallback(
    (state: Record<string, unknown>) => {
      const base = (block.metadata.rawData ?? {}) as Record<string, unknown>;
      const nextRaw = {
        ...base,
        features: sanitizeFeatures(state),
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
      persistFeatures(parsed);
    } catch {
      // ignore JSON parse issues
    }
  }, [debouncedSerializedState, persistFeatures]);

  const setFeatureValue = useCallback((key: string, value: unknown) => {
    setFeaturesState((prev) => {
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
      setFeatureValue(key, undefined);
    } else {
      setFeatureValue(key, value === 'true');
    }
  };

  const handleNumberChange = (key: string) => (event: ChangeEvent<HTMLInputElement>) => {
    const { value } = event.target;
    if (value === '') {
      setFeatureValue(key, undefined);
      return;
    }
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      setFeatureValue(key, parsed);
    }
  };

  const handleStringChange = (key: string) => (event: ChangeEvent<HTMLInputElement>) => {
    const { value } = event.target;
    if (value.trim().length === 0) {
      setFeatureValue(key, undefined);
    } else {
      setFeatureValue(key, value);
    }
  };

  const handleSelectChange = (key: string) => (event: ChangeEvent<HTMLSelectElement>) => {
    const { value } = event.target;
    if (value === '') {
      setFeatureValue(key, undefined);
    } else if (value === 'true') {
      setFeatureValue(key, true);
    } else if (value === 'false') {
      setFeatureValue(key, false);
    } else {
      setFeatureValue(key, value);
    }
  };

  const handleStringListChange = (key: string) => (event: ChangeEvent<HTMLTextAreaElement>) => {
    const { value } = event.target;
    const entries = value
      .split(/\r?\n/)
      .map((entry) => entry.trim())
      .filter((entry) => entry.length > 0);
    if (entries.length === 0) {
      setFeatureValue(key, undefined);
    } else {
      setFeatureValue(key, entries);
    }
  };

  const knownKeys = useMemo(() => new Set(FEATURE_FIELDS.map((field) => field.key)), []);
  const unknownKeys = useMemo(
    () => Object.keys(featuresState).filter((key) => !knownKeys.has(key)),
    [featuresState, knownKeys],
  );

  useEffect(() => {
    setCustomEditors((prev) => {
      const next: Record<string, { text: string; error?: string }> = {};
      unknownKeys.forEach((key) => {
        const currentValue = featuresState[key];
        const serialized = stringifyValue(currentValue);
        const previous = prev[key];
        if (previous && previous.text === serialized) {
          next[key] = previous;
        } else {
          next[key] = { text: serialized };
        }
      });
      return next;
    });
  }, [featuresState, unknownKeys]);

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
      setFeatureValue(key, undefined);
      return;
    }
    try {
      const parsed = parse(text);
      setFeatureValue(key, parsed);
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
    () => FEATURE_FIELDS.filter((field) => featuresState[field.key] !== undefined),
    [featuresState],
  );
  const inactiveFields = useMemo(
    () => FEATURE_FIELDS.filter((field) => featuresState[field.key] === undefined),
    [featuresState],
  );

  const renderFeatureControl = (field: FeatureFieldConfig) => {
    const currentValue = featuresState[field.key];
    const fieldId = `feature-${field.key.replace(/\s+/g, '-')}`;
    const description = field.description ? <p className="text-xs text-text-muted">{field.description}</p> : null;
    switch (field.type) {
      case 'boolean': {
        return (
          <div key={field.key} className="space-y-2">
            <label className="text-xs font-medium text-text-muted" htmlFor={fieldId}>
              {field.label}
            </label>
            <select
              id={fieldId}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-text-primary focus:border-primary/40 focus:outline-none focus:ring-0"
              value={getBooleanSelectValue(currentValue)}
              onChange={handleBooleanChange(field.key)}
            >
              <option value="">Use default behaviour</option>
              <option value="true">Enable</option>
              <option value="false">Disable</option>
            </select>
            {description}
          </div>
        );
      }
      case 'number': {
        return (
          <div key={field.key} className="space-y-2">
            <label className="text-xs font-medium text-text-muted" htmlFor={fieldId}>
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
      }
      case 'string': {
        return (
          <div key={field.key} className="space-y-2">
            <label className="text-xs font-medium text-text-muted" htmlFor={fieldId}>
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
      }
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
            <label className="text-xs font-medium text-text-muted" htmlFor={fieldId}>
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
            <label className="text-xs font-medium text-text-muted" htmlFor={fieldId}>
              {field.label}
            </label>
            <textarea
              id={fieldId}
              value={listValue}
              onChange={handleStringListChange(field.key)}
              className="h-28 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-text-primary focus:border-primary/40 focus:outline-none focus:ring-0"
              placeholder={field.placeholder}
            />
            {description}
          </div>
        );
      }
      default:
        return null;
    }
  };

  const inactiveCategories = useMemo(() => {
    if (!showAllOptions) {
      return [];
    }
    return FEATURE_CATEGORIES.map((category) => ({
      category,
      fields: inactiveFields.filter((field) => field.category === category),
    })).filter((entry) => entry.fields.length > 0);
  }, [inactiveFields, showAllOptions]);

  return (
    <div className="space-y-6">
      <section className="space-y-4">
        <header>
          <h3 className="text-sm font-semibold text-text-muted">In-use settings</h3>
          <p className="text-xs text-text-muted">
            Values currently defined in this features block. Adjust them here to see the YAML update instantly.
          </p>
        </header>
        {activeFields.length === 0 ? (
          <p className="rounded-xl border border-dashed border-border bg-background/60 px-3 py-2 text-xs text-text-muted">
            No optional features are set yet. Use &ldquo;Show all options&rdquo; to enable more.
          </p>
        ) : (
          <div className="space-y-4">{activeFields.map(renderFeatureControl)}</div>
        )}
      </section>

      {showAllOptions ? (
        <section className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-text-muted">Available options</h3>
            <button
              type="button"
              className="text-sm font-medium text-primary transition hover:text-primary/80"
              onClick={() => setShowAllOptions(false)}
            >
              Hide unused options
            </button>
          </div>
          {inactiveCategories.length === 0 ? (
            <p className="rounded-xl border border-dashed border-border bg-background/60 px-3 py-2 text-xs text-text-muted">
              All documented options are already configured in this block.
            </p>
          ) : (
            inactiveCategories.map(({ category, fields }) => (
              <section key={category} className="space-y-4">
                <header>
                  <h4 className="text-xs font-medium text-text-muted">{category}</h4>
                </header>
                <div className="space-y-4">{fields.map(renderFeatureControl)}</div>
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
          Show all options
        </button>
      )}

      <section className="space-y-4">
        <header>
          <h3 className="text-sm font-semibold text-text-muted">Other settings</h3>
          <p className="text-xs text-text-muted">
            These keys are not yet supported by the visual editor. Edit their YAML values directly or switch to the code
            view for full control. They will be preserved when saving.
          </p>
        </header>
        {unknownKeys.length === 0 ? (
          <p className="rounded-xl border border-dashed border-border bg-background/60 px-3 py-2 text-xs text-text-muted">
            No additional feature settings detected.
          </p>
        ) : (
          <div className="space-y-4">
            {unknownKeys.map((key) => {
              const control = customEditors[key];
              return (
                <Fragment key={key}>
                  <div className="space-y-2 rounded-xl border border-border bg-surface px-3 py-3 shadow-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-text-muted">{key}</span>
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
                      <p className="text-xs text-text-muted">YAML snippet for this feature value.</p>
                    )}
                  </div>
                </Fragment>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
