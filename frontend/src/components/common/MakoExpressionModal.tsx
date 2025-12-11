import { useEffect, useMemo, useRef, useState, type FormEvent, type KeyboardEvent as ReactKeyboardEvent, type MouseEvent as ReactMouseEvent } from 'react';
import { X } from 'lucide-react';
import { clsx } from 'clsx';
import { useDocassembleStore } from '@/state/docassembleStore';
import { fetchPlaygroundVariables } from '@/api/docassemble';
import type { VariableInfo } from '@/api/types';
import { Button } from './Button';

type BuilderMode = 'builder' | 'manual';

const LOGICAL_TOKENS = ['and', 'or', 'not', 'in', '==', '!=', '>=', '<=', '>', '<'];

export interface MakoExpressionModalProps {
  open: boolean;
  type: 'expression' | 'conditional';
  yamlDocument: string;
  initialExpression?: string;
  onClose: () => void;
  onSubmit: (expression: string) => void;
}

export function MakoExpressionModal({
  open,
  type,
  yamlDocument: _yamlDocument,
  initialExpression,
  onClose,
  onSubmit,
}: MakoExpressionModalProps): JSX.Element | null {
  void _yamlDocument;
  const docassembleConfig = useDocassembleStore((state) => state.config);
  const selectedProject = useDocassembleStore((state) => state.selectedProject);
  const selectedFilename = useDocassembleStore((state) => state.selectedFilename);
  const [expression, setExpression] = useState(initialExpression ?? '');
  const [mode, setMode] = useState<BuilderMode>('builder');
  const [variables, setVariables] = useState<VariableInfo[]>([]);
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [equalityHelper, setEqualityHelper] = useState<{ top: number; left: number } | null>(null);
  const [literalValue, setLiteralValue] = useState('');
  const equalityHelperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) {
      return;
    }
    setExpression(initialExpression?.trim() ?? '');
    setMode('builder');
    setSearch('');
    setEqualityHelper(null);
  }, [open, initialExpression]);

  useEffect(() => {
    if (!open) {
      return;
    }

    if (!docassembleConfig || !selectedProject || !selectedFilename) {
      setIsLoading(false);
      setVariables([]);
      setError('Connect to Docassemble and load an interview to browse variables.');
      return;
    }

    let cancelled = false;
    setIsLoading(true);
    setError(null);

    fetchPlaygroundVariables(docassembleConfig, selectedProject, selectedFilename)
      .then((items) => {
        if (!cancelled) {
          setVariables(items ?? []);
          setIsLoading(false);
        }
      })
      .catch((err: Error) => {
        if (!cancelled) {
          setVariables([]);
          setError(err.message || 'Unable to load variables from Docassemble.');
          setIsLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [docassembleConfig, open, selectedFilename, selectedProject]);

  useEffect(() => {
    if (!equalityHelper) {
      return;
    }

    setLiteralValue('');

    const handleOutsideClick = (event: globalThis.MouseEvent) => {
      if (!equalityHelperRef.current) {
        return;
      }
      if (!equalityHelperRef.current.contains(event.target as Node)) {
        setEqualityHelper(null);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setEqualityHelper(null);
      }
    };

    document.addEventListener('mousedown', handleOutsideClick);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [equalityHelper]);

  const filteredVariables = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) {
      return variables;
    }
    return variables.filter((variable) => {
      return (
        variable.name.toLowerCase().includes(term) ||
        variable.type.toLowerCase().includes(term)
      );
    });
  }, [variables, search]);

  const equalityHelperVariables = useMemo(() => filteredVariables.slice(0, 8), [filteredVariables]);

  if (!open) {
    return null;
  }

  const handleAppend = (snippet: string, options?: { suppressLeadingSpace?: boolean }) => {
    setExpression((prev) => {
      const previous = prev ?? '';
      const needsSpaceBefore =
        !options?.suppressLeadingSpace &&
        previous.length > 0 &&
        !previous.endsWith(' ') &&
        !previous.endsWith('(') &&
        !previous.endsWith('[') &&
        !previous.endsWith('{');
      const base = needsSpaceBefore ? `${previous} ${snippet}` : `${previous}${snippet}`;
      return base;
    });
  };

  const handleSubmit = (event?: FormEvent) => {
    event?.preventDefault();
    const trimmed = expression.trim();
    if (!trimmed) {
      return;
    }
    onSubmit(trimmed);
  };

  const handleEqualityTokenClick = (event: ReactMouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();
    if (equalityHelper) {
      setEqualityHelper(null);
      return;
    }
    handleAppend('== ');
    const rect = event.currentTarget.getBoundingClientRect();
    const width = 280;
    const viewportWidth = window.innerWidth;
    const gutter = 16;
    const left = Math.min(Math.max(rect.left, gutter), viewportWidth - width - gutter);
    setEqualityHelper({
      top: rect.bottom + 8,
      left,
    });
  };

  const escapeSingleQuotes = (value: string) => {
    return value.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
  };

  const formatLiteralValue = (raw: string): string | null => {
    const trimmed = raw.trim();
    if (!trimmed) {
      return null;
    }
    const numericPattern = /^-?\d+(\.\d+)?$/;
    if (numericPattern.test(trimmed)) {
      return trimmed;
    }
    return `'${escapeSingleQuotes(trimmed)}'`;
  };

  const applyLiteralValue = () => {
    const formatted = formatLiteralValue(literalValue);
    if (!formatted) {
      return;
    }
    handleAppend(formatted, { suppressLeadingSpace: true });
    setLiteralValue('');
    setEqualityHelper(null);
  };

  const handleLiteralKeyDown = (event: ReactKeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      applyLiteralValue();
    }
  };

  const handleVariableComparisonInsert = (variableName: string) => {
    handleAppend(variableName, { suppressLeadingSpace: true });
    setEqualityHelper(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 py-6">
      <div className="relative w-full max-w-2xl rounded-xl border border-border bg-surface p-6 shadow-soft">
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-text-primary">
              {type === 'expression' ? 'Insert Mako expression' : 'Insert Mako conditional'}
            </h2>
            <p className="text-sm text-text-muted">
              Choose from existing variables or build the expression manually.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="inline-flex h-8 w-8 items-center justify-center rounded-full text-text-muted hover:bg-muted hover:text-text-primary focus-visible:ring-2 focus-visible:ring-primary/40"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form className="space-y-5" onSubmit={handleSubmit}>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setMode('builder')}
              className={clsx(
                'rounded-lg px-3 py-1.5 text-sm font-medium transition-colors',
                mode === 'builder'
                  ? 'bg-primary/10 text-primary'
                  : 'bg-muted text-text-muted hover:text-text-primary',
              )}
            >
              Builder
            </button>
            <button
              type="button"
              onClick={() => setMode('manual')}
              className={clsx(
                'rounded-lg px-3 py-1.5 text-sm font-medium transition-colors',
                mode === 'manual'
                  ? 'bg-primary/10 text-primary'
                  : 'bg-muted text-text-muted hover:text-text-primary',
              )}
            >
              Manual entry
            </button>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-text-primary" htmlFor="mako-expression-input">
              Expression
            </label>
            <textarea
              id="mako-expression-input"
              value={expression}
              onChange={(event) => setExpression(event.target.value)}
              className="h-24 w-full rounded-lg border border-border bg-muted/50 px-3 py-2 font-mono text-sm text-text-primary focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
              placeholder={type === 'expression' ? 'user.name' : 'user.is_eligible'}
            />
          </div>

          {mode === 'builder' && (
            <div className="grid gap-4 md:grid-cols-2">
              <div className="flex flex-col gap-3">
                <div>
                  <label
                    className="block text-xs font-medium text-text-muted"
                    htmlFor="mako-variable-search"
                  >
                    Variables
                  </label>
                  <input
                    id="mako-variable-search"
                    type="search"
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Search variables…"
                    className="mt-1 w-full rounded-lg border border-border bg-surface px-3 py-1.5 text-sm text-text-primary focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </div>
                <div className="max-h-48 overflow-y-auto rounded-lg border border-border bg-muted/40 p-2">
                  {isLoading && <p className="text-sm text-text-muted">Loading variables…</p>}
                  {error && (
                    <p className="text-sm text-danger">
                      {error}
                    </p>
                  )}
                  {!isLoading && !error && filteredVariables.length === 0 && (
                    <p className="text-sm text-text-muted">No variables found.</p>
                  )}
                  <ul className="space-y-1">
                    {filteredVariables.map((variable) => (
                      <li key={variable.name}>
                        <button
                          type="button"
                          onClick={() => handleAppend(variable.name)}
                          className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm text-text-primary hover:bg-surface"
                        >
                          <span className="font-medium">{variable.name}</span>
                          <span className="text-xs text-text-muted">{variable.type}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              <div className="flex flex-col gap-3">
                <div>
                  <p className="block text-xs font-medium text-text-muted">
                    Quick tokens
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {LOGICAL_TOKENS.map((token) => {
                      if (token === '==') {
                        return (
                          <button
                            key={token}
                            type="button"
                            onClick={(event) => handleEqualityTokenClick(event)}
                            aria-expanded={Boolean(equalityHelper)}
                            className={clsx(
                              'rounded-full border border-border bg-muted px-3 py-1 text-sm text-text-muted hover:text-text-primary',
                              equalityHelper && 'border-primary bg-primary/10 text-primary',
                            )}
                          >
                            {token}
                          </button>
                        );
                      }
                      return (
                        <button
                          key={token}
                          type="button"
                          onClick={() => handleAppend(`${token} `)}
                          className="rounded-full border border-border bg-muted px-3 py-1 text-sm text-text-muted hover:text-text-primary"
                        >
                          {token}
                        </button>
                      );
                    })}
                  </div>
                </div>
                <div>
                  <p className="block text-xs font-medium text-text-muted">
                    Additional snippets
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => handleAppend('(')}
                      className="rounded-full border border-border bg-muted px-3 py-1 text-sm text-text-muted hover:text-text-primary"
                    >
                      (
                    </button>
                    <button
                      type="button"
                      onClick={() => handleAppend(')', { suppressLeadingSpace: true })}
                      className="rounded-full border border-border bg-muted px-3 py-1 text-sm text-text-muted hover:text-text-primary"
                    >
                      )
                    </button>
                    <button
                      type="button"
                      onClick={() => handleAppend('not in ')}
                      className="rounded-full border border-border bg-muted px-3 py-1 text-sm text-text-muted hover:text-text-primary"
                    >
                      not in
                    </button>
                    <button
                      type="button"
                      onClick={() => handleAppend('is defined ')}
                      className="rounded-full border border-border bg-muted px-3 py-1 text-sm text-text-muted hover:text-text-primary"
                    >
                      is defined
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {equalityHelper && (
            <div
              ref={equalityHelperRef}
              className="fixed z-50 w-72 rounded-lg border border-border bg-surface p-4 shadow-soft"
              style={{ top: equalityHelper.top, left: equalityHelper.left }}
            >
              <p className="text-sm font-medium text-text-primary">Finish the comparison</p>
              <p className="text-xs text-text-muted">
                Add a literal value—we will quote strings automatically—or pick another variable.
              </p>
              <div className="mt-3 space-y-2">
                <label htmlFor="mako-literal-helper" className="block text-xs font-medium text-text-muted">
                  Literal value
                </label>
                <div className="flex items-center gap-2">
                  <input
                    id="mako-literal-helper"
                    value={literalValue}
                    onChange={(event) => setLiteralValue(event.target.value)}
                    onKeyDown={handleLiteralKeyDown}
                    placeholder="e.g. Approved"
                    className="flex-1 rounded-lg border border-border bg-muted/40 px-2 py-1.5 text-sm text-text-primary focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                  <Button type="button" size="sm" onClick={applyLiteralValue} disabled={!literalValue.trim()}>
                    Apply
                  </Button>
                </div>
              </div>
              {equalityHelperVariables.length > 0 && (
                <div className="mt-4">
                  <p className="text-xs font-medium text-text-muted">Variables</p>
                  <ul className="mt-2 max-h-32 space-y-1 overflow-y-auto">
                    {equalityHelperVariables.map((variable) => (
                      <li key={variable.name}>
                        <button
                          type="button"
                          onClick={() => handleVariableComparisonInsert(variable.name)}
                          className="flex w-full items-center justify-between rounded-md px-3 py-1.5 text-left text-sm text-text-primary hover:bg-muted"
                        >
                          <span>{variable.name}</span>
                          <span className="text-xs text-text-muted">{variable.type}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={!expression.trim()}>
              Insert
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
