import { useState, useCallback, useRef } from 'react';
import { clsx } from 'clsx';
import {
  Eye,
  GitFork,
  Pencil,
  Heading,
  Bold,
  Italic,
  Quote,
  Code,
  Link,
  List,
  ListOrdered,
  Braces,
} from 'lucide-react';
import { markdownToHtml } from '@/utils/markdown';
import { useEditorStore } from '@/state/editorStore';
import { MakoExpressionModal } from './MakoExpressionModal';

export interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  onBlur?: (value: string) => void;
  placeholder?: string;
  className?: string;
}

const BUTTON_BASE = 'inline-flex h-8 w-8 items-center justify-center rounded-md transition-colors text-text-muted hover:bg-muted hover:text-text-primary';

type MakoModalState = {
  type: 'expression' | 'conditional';
  selectionStart: number;
  selectionEnd: number;
  selectionText: string;
  initialExpression: string;
};

export function RichTextEditor({ value, onChange, onBlur, placeholder, className }: RichTextEditorProps): JSX.Element {
  const yamlDocument = useEditorStore((state) => state.yamlDocument);
  const [mode, setMode] = useState<'edit' | 'preview'>('edit');
  const [makoModal, setMakoModal] = useState<MakoModalState | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleTextChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    onChange(event.target.value);
  };

  const handleTextBlur = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    onBlur?.(event.target.value);
  };

  const applyMarkdown = useCallback((logic: (selection: string, start: number, end: number) => { newValue: string; newCursor: number }) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const { selectionStart, selectionEnd } = textarea;
    const selection = value.substring(selectionStart, selectionEnd);
    const { newValue, newCursor } = logic(selection, selectionStart, selectionEnd);

    onChange(newValue);

    setTimeout(() => {
      textarea.focus();
      textarea.selectionStart = newCursor;
      textarea.selectionEnd = newCursor;
    }, 0);
  }, [value, onChange]);

  const wrap = (prefix: string, suffix: string) => applyMarkdown((sel, start) => {
    const text = `${prefix}${sel}${suffix}`;
    return { newValue: `${value.substring(0, start)}${text}${value.substring(start + sel.length)}`, newCursor: start + (sel ? text.length : prefix.length) };
  });

  const prefixLines = (prefix: string) => applyMarkdown((sel, start, end) => {
    const lines = (sel || '').split('\n');
    const newText = lines.map(l => `${prefix}${l}`).join('\n');
    return { newValue: `${value.substring(0, start)}${newText}${value.substring(end)}`, newCursor: start + newText.length };
  });

  const insertLink = () => applyMarkdown((sel, start) => {
    const url = window.prompt('Enter URL', 'https://');
    if (!url) return { newValue: value, newCursor: start };
    const text = `[${sel || 'link text'}](${url})`;
    return { newValue: `${value.substring(0, start)}${text}${value.substring(start + sel.length)}`, newCursor: start + text.length };
  });

  const openMakoModal = useCallback((type: 'expression' | 'conditional') => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const selectionStart = textarea.selectionStart ?? 0;
    const selectionEnd = textarea.selectionEnd ?? selectionStart;
    const selectionText = value.substring(selectionStart, selectionEnd);

    let initialExpression = '';
    if (type === 'expression') {
      const trimmed = selectionText.trim();
      if (trimmed) {
        const match = trimmed.match(/^\$\{\s*(.+?)\s*\}$/);
        initialExpression = match ? match[1] : trimmed;
      }
    }

    setMakoModal({
      type,
      selectionStart,
      selectionEnd,
      selectionText,
      initialExpression,
    });
  }, [value]);

  const handleMakoSubmit = useCallback((expression: string) => {
    if (!makoModal) return;

    const trimmedExpression = expression.trim();
    const { type, selectionStart, selectionEnd, selectionText } = makoModal;

    const before = value.substring(0, selectionStart);
    const after = value.substring(selectionEnd);

    let inserted = '';
    let nextSelectionStart = 0;
    let nextSelectionEnd = 0;

    if (type === 'expression') {
      inserted = `\${ ${trimmedExpression} }`;
      const cursor = before.length + inserted.length;
      nextSelectionStart = cursor;
      nextSelectionEnd = cursor;
    } else {
      const bodyContent = selectionText || 'Your content here';
      inserted = `% if ${trimmedExpression}:\n${bodyContent}\n% endif`;
      const bodyStart = before.length + `% if ${trimmedExpression}:\n`.length;
      if (selectionText) {
        const bodyEnd = bodyStart + selectionText.length;
        nextSelectionStart = bodyEnd;
        nextSelectionEnd = bodyEnd;
      } else {
        const bodyEnd = bodyStart + 'Your content here'.length;
        nextSelectionStart = bodyStart;
        nextSelectionEnd = bodyEnd;
      }
    }

    const newValue = `${before}${inserted}${after}`;
    onChange(newValue);
    setMakoModal(null);

    setTimeout(() => {
      const textarea = textareaRef.current;
      if (!textarea) return;
      textarea.focus();
      textarea.selectionStart = nextSelectionStart;
      textarea.selectionEnd = nextSelectionEnd;
    }, 0);
  }, [makoModal, onChange, value]);

  const handleMakoClose = useCallback(() => {
    setMakoModal(null);
  }, []);

  const preventFocusSteal = (e: React.MouseEvent) => e.preventDefault();

  return (
    <>
      <div className={clsx('group rounded-xl border border-border bg-surface shadow-soft', className)}>
        <div className="flex flex-wrap items-center gap-1 border-b border-border px-2 py-1.5">
          <button type="button" className={BUTTON_BASE} onMouseDown={preventFocusSteal} onClick={() => prefixLines('## ')} aria-label="Heading"><Heading className="h-4 w-4" /></button>
          <button type="button" className={BUTTON_BASE} onMouseDown={preventFocusSteal} onClick={() => wrap('**', '**')} aria-label="Bold"><Bold className="h-4 w-4" /></button>
          <button type="button" className={BUTTON_BASE} onMouseDown={preventFocusSteal} onClick={() => wrap('*', '*')} aria-label="Italic"><Italic className="h-4 w-4" /></button>
          <button type="button" className={BUTTON_BASE} onMouseDown={preventFocusSteal} onClick={() => prefixLines('> ')} aria-label="Quote"><Quote className="h-4 w-4" /></button>
          <button type="button" className={BUTTON_BASE} onMouseDown={preventFocusSteal} onClick={() => wrap('`', '`')} aria-label="Code"><Code className="h-4 w-4" /></button>
          <button type="button" className={BUTTON_BASE} onMouseDown={preventFocusSteal} onClick={insertLink} aria-label="Link"><Link className="h-4 w-4" /></button>
          <button type="button" className={BUTTON_BASE} onMouseDown={preventFocusSteal} onClick={() => prefixLines('- ')} aria-label="Unordered List"><List className="h-4 w-4" /></button>
          <button type="button" className={BUTTON_BASE} onMouseDown={preventFocusSteal} onClick={() => prefixLines('1. ')} aria-label="Ordered List"><ListOrdered className="h-4 w-4" /></button>
          <button type="button" className={BUTTON_BASE} onMouseDown={preventFocusSteal} onClick={() => openMakoModal('conditional')} aria-label="Insert Mako conditional"><GitFork className="h-4 w-4" /></button>
          <button type="button" className={BUTTON_BASE} onMouseDown={preventFocusSteal} onClick={() => openMakoModal('expression')} aria-label="Insert Mako expression"><Braces className="h-4 w-4" /></button>

          <div className="ml-auto flex items-center gap-1">
            <button
              type="button"
              className={clsx(BUTTON_BASE, mode === 'edit' && 'bg-primary/10 text-primary')}
              onMouseDown={preventFocusSteal}
              onClick={() => setMode('edit')}
              aria-label="Edit"
              disabled={mode === 'edit'}
            >
              <Pencil className="h-4 w-4" />
            </button>
            <button
              type="button"
              className={clsx(BUTTON_BASE, mode === 'preview' && 'bg-primary/10 text-primary')}
              onMouseDown={preventFocusSteal}
              onClick={() => setMode('preview')}
              aria-label="Preview"
              disabled={mode === 'preview'}
            >
              <Eye className="h-4 w-4" />
            </button>
          </div>
        </div>
        <div className="max-h-72 min-h-[8rem] overflow-y-auto px-3 py-2">
          {mode === 'edit' ? (
            <textarea
              ref={textareaRef}
              value={value}
              onChange={handleTextChange}
              onBlur={handleTextBlur}
              placeholder={placeholder ?? 'Write content in Markdown…'}
              className="block h-full w-full resize-none border-none bg-transparent font-mono text-sm text-text-primary focus:outline-none focus:ring-0"
            />
          ) : (
            <div
              className="prose prose-sm max-w-none text-text-primary"
              dangerouslySetInnerHTML={{ __html: markdownToHtml(value) || '<p></p>' }}
            />
          )}
        </div>
      </div>
      <MakoExpressionModal
        open={Boolean(makoModal)}
        type={makoModal?.type ?? 'expression'}
        yamlDocument={yamlDocument}
        initialExpression={makoModal?.initialExpression}
        onClose={handleMakoClose}
        onSubmit={handleMakoSubmit}
      />
    </>
  );
}
