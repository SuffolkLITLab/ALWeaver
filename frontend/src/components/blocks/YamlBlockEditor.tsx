import { useCallback, useEffect, useRef, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { stringify } from 'yaml';
import type { EditorBlock } from '@/state/types';
import { useEditorStore } from '@/state/editorStore';

type NodeKind = 'scalar' | 'object' | 'array';

const TYPE_OPTIONS: Array<{ value: NodeKind; label: string }> = [
  { value: 'scalar', label: 'Value' },
  { value: 'object', label: 'Map' },
  { value: 'array', label: 'List' },
];

function detectKind(value: unknown): NodeKind {
  if (Array.isArray(value)) {
    return 'array';
  }
  if (value && typeof value === 'object') {
    return 'object';
  }
  return 'scalar';
}

function cloneEditable(value: unknown): Record<string, unknown> {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return JSON.parse(JSON.stringify(value)) as Record<string, unknown>;
  }
  return {};
}

function ensureRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function createUniqueKey(existing: Iterable<string>, base = 'new_key'): string {
  const used = new Set(existing);
  if (!used.has(base)) {
    return base;
  }
  let index = 1;
  let candidate = `${base}_${index}`;
  while (used.has(candidate)) {
    index += 1;
    candidate = `${base}_${index}`;
  }
  return candidate;
}

function toKind(value: unknown, kind: NodeKind): unknown {
  switch (kind) {
    case 'object':
      return ensureRecord(value);
    case 'array':
      return Array.isArray(value) ? value : [];
    case 'scalar':
    default:
      if (Array.isArray(value)) {
        return '';
      }
      if (value === null || value === undefined) {
        return '';
      }
      if (typeof value === 'object') {
        return '';
      }
      return value;
  }
}

function valueToString(value: unknown): string {
  if (value === null) {
    return 'null';
  }
  if (typeof value === 'boolean') {
    return value ? 'true' : 'false';
  }
  if (typeof value === 'number') {
    return Number.isFinite(value) ? String(value) : '';
  }
  if (typeof value === 'string') {
    return value;
  }
  return '';
}

function parseScalar(input: string): unknown {
  const trimmed = input.trim();
  if (trimmed.length === 0) {
    return '';
  }
  if (trimmed === 'null') {
    return null;
  }
  if (trimmed === 'true' || trimmed === 'false') {
    return trimmed === 'true';
  }
  if (/^-?(0|[1-9][0-9]*)(\.[0-9]+)?$/.test(trimmed)) {
    return Number(trimmed);
  }
  return input;
}

interface TypeSelectorProps {
  value: NodeKind;
  onChange: (next: NodeKind) => void;
}

function TypeSelector({ value, onChange }: TypeSelectorProps): JSX.Element {
  return (
    <select
      className="h-8 rounded-md border border-border bg-background px-2 text-xs text-text-muted"
      value={value}
      onChange={(event) => onChange(event.target.value as NodeKind)}
    >
      {TYPE_OPTIONS.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
}

interface ScalarEditorProps {
  value: unknown;
  onChange: (next: unknown) => void;
}

function ScalarEditor({ value, onChange }: ScalarEditorProps): JSX.Element {
  const [text, setText] = useState(() => valueToString(value));

  useEffect(() => {
    setText(valueToString(value));
  }, [value]);

  const handleChange = useCallback(
    (next: string) => {
      setText(next);
      onChange(parseScalar(next));
    },
    [onChange],
  );

  return (
    <textarea
      className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-text-primary"
      rows={3}
      value={text}
      onChange={(event) => handleChange(event.target.value)}
      placeholder="Enter value..."
    />
  );
}

interface YamlNodeEditorProps {
  value: unknown;
  onChange: (next: unknown) => void;
  depth: number;
}

function YamlNodeEditor({ value, onChange, depth }: YamlNodeEditorProps): JSX.Element {
  const kind = detectKind(value);

  if (kind === 'object') {
    return (
      <ObjectEditor
        value={ensureRecord(value)}
        onChange={(next) => onChange(next)}
        depth={depth}
      />
    );
  }

  if (kind === 'array') {
    return (
      <ArrayEditor
        value={Array.isArray(value) ? value : []}
        onChange={(next) => onChange(next)}
        depth={depth}
      />
    );
  }

  return <ScalarEditor value={value} onChange={onChange} />;
}

interface ObjectEditorProps {
  value: Record<string, unknown>;
  onChange: (next: Record<string, unknown>) => void;
  depth: number;
}

function ObjectEditor({ value, onChange, depth }: ObjectEditorProps): JSX.Element {
  const entries = Object.entries(value);

  const handleEntryChange = useCallback(
    (key: string, nextValue: unknown) => {
      onChange({ ...value, [key]: nextValue });
    },
    [onChange, value],
  );

  const handleRename = useCallback(
    (oldKey: string, nextKey: string) => {
      const trimmed = nextKey.trim();
      if (!trimmed || trimmed === oldKey) {
        return;
      }
      if (Object.prototype.hasOwnProperty.call(value, trimmed) && trimmed !== oldKey) {
        return;
      }
      const next: Record<string, unknown> = {};
      for (const [entryKey, entryValue] of Object.entries(value)) {
        if (entryKey === oldKey) {
          next[trimmed] = entryValue;
        } else {
          next[entryKey] = entryValue;
        }
      }
      onChange(next);
    },
    [value, onChange],
  );

  const handleRemove = useCallback(
    (target: string) => {
      const next: Record<string, unknown> = {};
      for (const [entryKey, entryValue] of Object.entries(value)) {
        if (entryKey !== target) {
          next[entryKey] = entryValue;
        }
      }
      onChange(next);
    },
    [value, onChange],
  );

  const handleTypeChange = useCallback(
    (key: string, nextKind: NodeKind) => {
      const current = value[key];
      handleEntryChange(key, toKind(current, nextKind));
    },
    [handleEntryChange, value],
  );

  const handleAdd = useCallback(() => {
    const key = createUniqueKey(Object.keys(value));
    onChange({ ...value, [key]: '' });
  }, [value, onChange]);

  return (
    <div className="space-y-3">
      {entries.length === 0 && (
        <p className="text-sm text-text-muted">No keys yet. Use Add key to create one.</p>
      )}
      {entries.map(([key, entryValue]) => (
        <div
          key={key}
          className="rounded-xl border border-border bg-surface px-3 py-3 shadow-sm"
        >
          <div className="flex flex-wrap items-center gap-2">
            <input
              className="min-w-[120px] flex-1 rounded-md border border-border bg-background px-2 py-1 text-sm text-text-primary"
              value={key}
              onChange={(event) => handleRename(key, event.target.value)}
            />
            <TypeSelector
              value={detectKind(entryValue)}
              onChange={(kind) => handleTypeChange(key, kind)}
            />
            <button
              type="button"
              className="inline-flex h-8 w-8 items-center justify-center rounded-md text-text-muted transition hover:bg-muted hover:text-text-primary"
              onClick={() => handleRemove(key)}
              aria-label="Remove key"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
          <div className="mt-3 ml-4">
            <YamlNodeEditor
              value={entryValue}
              onChange={(next) => handleEntryChange(key, next)}
              depth={depth + 1}
            />
          </div>
        </div>
      ))}
      <button
        type="button"
        className="inline-flex items-center justify-center gap-2 rounded-lg border border-dashed border-border px-3 py-2 text-sm text-text-muted transition hover:border-primary/60 hover:text-text-primary"
        onClick={handleAdd}
      >
        <Plus className="h-4 w-4" />
        Add key
      </button>
    </div>
  );
}

interface ArrayEditorProps {
  value: unknown[];
  onChange: (next: unknown[]) => void;
  depth: number;
}

function ArrayEditor({ value, onChange, depth }: ArrayEditorProps): JSX.Element {
  const handleItemChange = useCallback(
    (index: number, nextValue: unknown) => {
      const next = value.slice();
      next[index] = nextValue;
      onChange(next);
    },
    [value, onChange],
  );

  const handleRemove = useCallback(
    (index: number) => {
      const next = value.slice();
      next.splice(index, 1);
      onChange(next);
    },
    [value, onChange],
  );

  const handleTypeChange = useCallback(
    (index: number, kind: NodeKind) => {
      handleItemChange(index, toKind(value[index], kind));
    },
    [handleItemChange, value],
  );

  const handleAdd = useCallback(() => {
    onChange([...value, '']);
  }, [value, onChange]);

  return (
    <div className="space-y-3">
      {value.length === 0 && (
        <p className="text-sm text-text-muted">List is empty. Add an item to get started.</p>
      )}
      {value.map((item, index) => (
        <div
          key={index}
          className="rounded-xl border border-border bg-surface px-3 py-3 shadow-sm"
        >
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-md bg-muted px-2 py-1 text-xs font-medium text-text-muted">#{index + 1}</span>
            <TypeSelector
              value={detectKind(item)}
              onChange={(kind) => handleTypeChange(index, kind)}
            />
            <button
              type="button"
              className="inline-flex h-8 w-8 items-center justify-center rounded-md text-text-muted transition hover:bg-muted hover:text-text-primary"
              onClick={() => handleRemove(index)}
              aria-label="Remove item"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
          <div className="mt-3 ml-4">
            <YamlNodeEditor
              value={item}
              onChange={(next) => handleItemChange(index, next)}
              depth={depth + 1}
            />
          </div>
        </div>
      ))}
      <button
        type="button"
        className="inline-flex items-center justify-center gap-2 rounded-lg border border-dashed border-border px-3 py-2 text-sm text-text-muted transition hover:border-primary/60 hover:text-text-primary"
        onClick={handleAdd}
      >
        <Plus className="h-4 w-4" />
        Add item
      </button>
    </div>
  );
}

interface YamlBlockEditorProps {
  block: EditorBlock;
}

export function YamlBlockEditor({ block }: YamlBlockEditorProps): JSX.Element {
  const upsertBlockFromRaw = useEditorStore((state) => state.upsertBlockFromRaw);
  const [editable, setEditable] = useState<Record<string, unknown>>(() => cloneEditable(block.metadata.rawData));
  const skipPersistRef = useRef(true);

  useEffect(() => {
    setEditable(cloneEditable(block.metadata.rawData));
    skipPersistRef.current = true;
  }, [block.id, block.metadata.rawData]);

  useEffect(() => {
    if (skipPersistRef.current) {
      skipPersistRef.current = false;
      return;
    }
    const handle = window.setTimeout(() => {
      const yaml = stringify(editable ?? {});
      upsertBlockFromRaw(block.id, yaml.trim());
    }, 300);

    return () => window.clearTimeout(handle);
  }, [editable, block.id, upsertBlockFromRaw]);

  const handleRootChange = useCallback((next: unknown) => {
    setEditable(ensureRecord(next));
  }, []);

  return (
    <div className="space-y-3">
      <YamlNodeEditor value={editable} onChange={handleRootChange} depth={0} />
    </div>
  );
}
