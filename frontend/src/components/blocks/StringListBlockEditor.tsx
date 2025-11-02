import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { stringify } from 'yaml';
import { fetchPlaygroundFiles, fetchPlaygroundSourceFiles } from '@/api/docassemble';
import { useDocassembleStore } from '@/state/docassembleStore';
import type { EditorBlock } from '@/state/types';
import { useEditorStore } from '@/state/editorStore';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';

function toEditableString(value: unknown): string {
  if (typeof value === 'string') {
    return value;
  }
  if (value === null || value === undefined) {
    return '';
  }
  return String(value);
}

function extractStringList(rawData: Record<string, unknown> | undefined, key: string): string[] {
  const record = (rawData ?? {}) as Record<string, unknown>;
  const candidate = record[key];
  if (!Array.isArray(candidate)) {
    return [];
  }
  return candidate.map((item) => toEditableString(item));
}

function areListsEqual(a: string[], b: string[]): boolean {
  if (a === b) {
    return true;
  }
  if (a.length !== b.length) {
    return false;
  }
  for (let index = 0; index < a.length; index += 1) {
    if (a[index] !== b[index]) {
      return false;
    }
  }
  return true;
}

interface StringListBlockEditorProps {
  block: EditorBlock;
}

export function StringListBlockEditor({ block }: StringListBlockEditorProps): JSX.Element {
  const upsertBlockFromRaw = useEditorStore((state) => state.upsertBlockFromRaw);
  const listKey = block.type;
  const inputId = useId();
  const supportsSuggestions = listKey === 'include' || listKey === 'translations';
  const config = useDocassembleStore((state) => state.config);
  const project = useDocassembleStore((state) => state.selectedProject ?? state.config?.project);

  const [items, setItems] = useState<string[]>(() => extractStringList(block.metadata.rawData, listKey));
  const [isAdding, setIsAdding] = useState(false);
  const [draftValue, setDraftValue] = useState('');
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
  const [suggestionsError, setSuggestionsError] = useState<string | null>(null);
  const lastAppliedRef = useRef(items);
  const latestRawRef = useRef<Record<string, unknown> | undefined>(block.metadata.rawData);
  const skipPersistRef = useRef(true);
  const addInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    latestRawRef.current = block.metadata.rawData as Record<string, unknown> | undefined;
    const nextItems = extractStringList(block.metadata.rawData, listKey);
    if (!areListsEqual(lastAppliedRef.current, nextItems)) {
      lastAppliedRef.current = nextItems;
      skipPersistRef.current = true;
      setItems(nextItems);
    }
  }, [block.metadata.rawData, listKey]);

  const persistItems = useCallback(
    (nextItems: string[]) => {
      if (areListsEqual(lastAppliedRef.current, nextItems)) {
        return;
      }
      lastAppliedRef.current = nextItems;
      const baseRecord = (latestRawRef.current ?? {}) as Record<string, unknown>;
      const updatedRecord: Record<string, unknown> = {
        ...baseRecord,
        [listKey]: nextItems,
      };
      const yaml = stringify(updatedRecord).trim();
      upsertBlockFromRaw(block.id, yaml);
    },
    [block.id, listKey, upsertBlockFromRaw],
  );

  const debouncedItems = useDebouncedValue(items, 300);

  useEffect(() => {
    if (skipPersistRef.current) {
      skipPersistRef.current = false;
      return;
    }
    persistItems(debouncedItems);
  }, [debouncedItems, persistItems]);

  useEffect(() => {
    if (!isAdding) {
      return;
    }
    const handle = window.setTimeout(() => {
      addInputRef.current?.focus();
      addInputRef.current?.select();
    }, 30);
    return () => window.clearTimeout(handle);
  }, [isAdding]);

  useEffect(() => {
    if (!isAdding || !supportsSuggestions || !config) {
      return;
    }
    let cancelled = false;

    const loadSuggestions = async (): Promise<void> => {
      setIsLoadingSuggestions(true);
      setSuggestionsError(null);
      try {
        const list =
          listKey === 'include'
            ? await fetchPlaygroundFiles(config, project)
            : await fetchPlaygroundSourceFiles(config, project);
        if (cancelled) {
          return;
        }
        setSuggestions(list);
      } catch (error) {
        if (cancelled) {
          return;
        }
        const message =
          error instanceof Error
            ? error.message
            : 'Unable to load files from the Docassemble playground.';
        setSuggestionsError(message);
        setSuggestions([]);
      } finally {
        if (!cancelled) {
          setIsLoadingSuggestions(false);
        }
      }
    };

    void loadSuggestions();

    return () => {
      cancelled = true;
    };
  }, [config, isAdding, listKey, project, supportsSuggestions]);

  const handleItemChange = useCallback((index: number, value: string) => {
    setItems((prev) => {
      const next = prev.slice();
      next[index] = value;
      return next;
    });
  }, []);

  const handleRemove = useCallback((index: number) => {
    setItems((prev) => {
      const next = prev.slice();
      next.splice(index, 1);
      return next;
    });
  }, []);

  const addItem = useCallback((rawValue: string) => {
    const value = rawValue.trim();
    if (!value) {
      return;
    }
    setItems((prev) => [...prev, value]);
    setIsAdding(false);
    setDraftValue('');
  }, []);

  const handleSubmitDraft = useCallback(() => {
    addItem(draftValue);
  }, [addItem, draftValue]);

  const handleSelectSuggestion = useCallback(
    (value: string) => {
      addItem(value);
    },
    [addItem],
  );

  const handleCancelAdd = useCallback(() => {
    setIsAdding(false);
    setDraftValue('');
  }, []);

  const handleStartAdd = useCallback(() => {
    setDraftValue('');
    setIsAdding(true);
  }, []);

  const handleBlur = useCallback(() => {
    persistItems(items);
  }, [items, persistItems]);

  const filteredSuggestions = useMemo(() => {
    const normalized = draftValue.trim().toLowerCase();
    const existing = new Set(items.map((item) => item.trim()));
    return suggestions
      .filter((candidate) => !existing.has(candidate))
      .filter((candidate) => (normalized ? candidate.toLowerCase().includes(normalized) : true))
      .slice(0, 12);
  }, [draftValue, items, suggestions]);

  return (
    <div className="space-y-3">
      {items.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border bg-background/60 px-3 py-2 text-sm text-text-muted">
          No entries yet. Add one to get started.
        </p>
      ) : (
        <ul className="space-y-2">
          {items.map((item, index) => (
            <li
              key={`list-item-${index}`}
              className="flex items-center gap-2 rounded-xl border border-border bg-surface px-3 py-2 shadow-sm"
            >
              <span className="text-xs font-semibold uppercase tracking-wide text-text-muted">
                #{index + 1}
              </span>
              <input
                className="flex-1 rounded-md border border-transparent bg-transparent px-2 py-1 text-sm text-text-primary transition focus:border-primary/40 focus:outline-none focus:ring-0"
                value={item}
                onChange={(event) => handleItemChange(index, event.target.value)}
                onBlur={handleBlur}
                placeholder="Enter value..."
              />
              <button
                type="button"
                className="inline-flex h-8 w-8 items-center justify-center rounded-md text-text-muted transition hover:bg-muted hover:text-text-primary"
                onClick={() => handleRemove(index)}
                aria-label={`Remove item ${index + 1}`}
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </li>
          ))}
        </ul>
      )}
      {isAdding ? (
        <div className="space-y-3 rounded-xl border border-dashed border-border bg-surface px-3 py-3 shadow-sm">
          <div>
            <label htmlFor={inputId} className="text-xs font-semibold uppercase tracking-wide text-text-muted">
              New value
            </label>
            <input
              ref={addInputRef}
              id={inputId}
              className="mt-2 w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-text-primary focus:border-primary/40 focus:outline-none focus:ring-0"
              value={draftValue}
              onChange={(event) => setDraftValue(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault();
                  handleSubmitDraft();
                }
                if (event.key === 'Escape') {
                  event.preventDefault();
                  handleCancelAdd();
                }
              }}
              placeholder={
                listKey === 'include'
                  ? 'Enter a YAML filename (e.g. interview.yml)'
                  : 'Enter a source filename'
              }
            />
          </div>
          {supportsSuggestions && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold uppercase tracking-wide text-text-muted">
                  Suggestions
                </span>
                {!config && <span className="text-text-muted">Connect to Docassemble</span>}
              </div>
              {!config && (
                <p className="text-xs text-text-muted">
                  Provide Docassemble credentials to browse playground files.
                </p>
              )}
              {config && isLoadingSuggestions && (
                <p className="text-xs text-text-muted">Loading suggestions…</p>
              )}
              {config && suggestionsError && (
                <p className="text-xs text-warning">{suggestionsError}</p>
              )}
              {config && !isLoadingSuggestions && !suggestionsError && filteredSuggestions.length === 0 && (
                <p className="text-xs text-text-muted">No matching files found.</p>
              )}
              {config && filteredSuggestions.length > 0 && (
                <ul className="space-y-1">
                  {filteredSuggestions.map((suggestion) => (
                    <li key={suggestion}>
                      <button
                        type="button"
                        className="w-full rounded-md border border-transparent px-3 py-2 text-left text-sm text-text-primary transition hover:border-primary/40 hover:bg-muted"
                        onClick={() => handleSelectSuggestion(suggestion)}
                      >
                        {suggestion}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="inline-flex flex-1 items-center justify-center rounded-lg bg-primary px-3 py-2 text-sm font-medium text-white transition hover:bg-primary/90 disabled:opacity-50"
              onClick={handleSubmitDraft}
              disabled={!draftValue.trim()}
            >
              Add value
            </button>
            <button
              type="button"
              className="inline-flex flex-1 items-center justify-center rounded-lg border border-border px-3 py-2 text-sm text-text-muted transition hover:border-primary/40 hover:text-text-primary"
              onClick={handleCancelAdd}
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          className="inline-flex items-center justify-center gap-2 rounded-lg border border-dashed border-border px-3 py-2 text-sm text-text-muted transition hover:border-primary/60 hover:text-text-primary"
          onClick={handleStartAdd}
        >
          <Plus className="h-4 w-4" />
          Add item
        </button>
      )}
    </div>
  );
}
