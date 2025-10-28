import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import { Bold, Italic, List, ListOrdered, Quote, Redo2, Undo2, Braces } from 'lucide-react';
import { useEffect, useMemo, useCallback } from 'react';
import { clsx } from 'clsx';
import { markdownToHtml, htmlToMarkdown } from '@/utils/markdown';

export interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  onBlur?: (value: string) => void;
  placeholder?: string;
  className?: string;
}

const BUTTON_BASE = 'inline-flex h-8 w-8 items-center justify-center rounded-md transition-colors';

export function RichTextEditor({ value, onChange, onBlur, placeholder, className }: RichTextEditorProps): JSX.Element {
  const initialContent = useMemo(() => markdownToHtml(value), [value]);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        bulletList: { keepMarks: true, keepAttributes: true },
        orderedList: { keepMarks: true, keepAttributes: true },
      }),
      Placeholder.configure({
        placeholder: placeholder ?? 'Write content…',
      }),
    ],
    content: initialContent || '<p></p>',
    onBlur: ({ editor: instance }) => {
      const next = htmlToMarkdown(instance.getHTML());
      onBlur?.(next);
    },
    editorProps: {
      attributes: {
        class: 'tiptap focus:outline-none text-sm text-text-primary',
      },
    },
  });

  useEffect(() => {
    if (!editor) {
      return;
    }
    const handleUpdate = () => {
      const nextMarkdown = htmlToMarkdown(editor.getHTML());
      onChange(nextMarkdown);
    };
    editor.on('update', handleUpdate);
    return () => {
      editor.off('update', handleUpdate);
    };
  }, [editor, onChange]);

  useEffect(() => {
    if (!editor) {
      return;
    }
    const current = htmlToMarkdown(editor.getHTML());
    if (current !== value) {
      const html = markdownToHtml(value) || '<p></p>';
      editor.commands.setContent(html, false, { preserveWhitespace: true });
    }
  }, [editor, value]);

  if (!editor) {
    return <div className={clsx('rounded-xl border border-border bg-background px-3 py-2', className)} />;
  }

  const handleInsertConditional = useCallback(() => {
    if (!editor) {
      return;
    }
    const defaultCondition = 'user.is_eligible';
    const condition = window.prompt('Enter the Mako condition (without surrounding %):', defaultCondition);
    if (!condition) {
      return;
    }
    const trimmed = condition.trim();
    if (!trimmed) {
      return;
    }
    const { state } = editor;
    const { from, to } = state.selection;
    const hasSelection = from !== to;
    const selectedText = hasSelection ? state.doc.textBetween(from, to, '\n') : '';
    const body = selectedText || 'Your content here';
    const snippet = `% if ${trimmed}:\n${body}\n% endif`;

    if (hasSelection) {
      editor.chain().focus().insertContentAt({ from, to }, snippet).run();
    } else {
      editor.chain().focus().insertContent(`\n${snippet}\n`).run();
    }
  }, [editor]);

  return (
    <div className={clsx('rounded-xl border border-border bg-surface shadow-soft', className)}>
      <div className="flex items-center gap-1 border-b border-border px-2 py-1.5">
        <button
          type="button"
          className={clsx(BUTTON_BASE, editor.isActive('bold') ? 'bg-primary/10 text-primary' : 'text-text-muted hover:bg-muted hover:text-text-primary')}
          onClick={() => editor.chain().focus().toggleBold().run()}
          aria-label="Bold"
        >
          <Bold className="h-4 w-4" />
        </button>
        <button
          type="button"
          className={clsx(BUTTON_BASE, editor.isActive('italic') ? 'bg-primary/10 text-primary' : 'text-text-muted hover:bg-muted hover:text-text-primary')}
          onClick={() => editor.chain().focus().toggleItalic().run()}
          aria-label="Italic"
        >
          <Italic className="h-4 w-4" />
        </button>
        <button
          type="button"
          className={clsx(BUTTON_BASE, editor.isActive('bulletList') ? 'bg-primary/10 text-primary' : 'text-text-muted hover:bg-muted hover:text-text-primary')}
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          aria-label="Bullet list"
        >
          <List className="h-4 w-4" />
        </button>
        <button
          type="button"
          className={clsx(BUTTON_BASE, editor.isActive('orderedList') ? 'bg-primary/10 text-primary' : 'text-text-muted hover:bg-muted hover:text-text-primary')}
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          aria-label="Ordered list"
        >
          <ListOrdered className="h-4 w-4" />
        </button>
        <button
          type="button"
          className={clsx(BUTTON_BASE, editor.isActive('blockquote') ? 'bg-primary/10 text-primary' : 'text-text-muted hover:bg-muted hover:text-text-primary')}
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          aria-label="Quote"
        >
          <Quote className="h-4 w-4" />
        </button>
        <button
          type="button"
          className={clsx(BUTTON_BASE, 'text-text-muted hover:bg-muted hover:text-text-primary')}
          onClick={handleInsertConditional}
          aria-label="Insert Mako conditional"
        >
          <Braces className="h-4 w-4" />
        </button>
        <div className="ml-auto flex items-center gap-1">
          <button
            type="button"
            className={clsx(BUTTON_BASE, 'text-text-muted hover:bg-muted hover:text-text-primary')}
            onClick={() => editor.chain().focus().undo().run()}
            aria-label="Undo"
          >
            <Undo2 className="h-4 w-4" />
          </button>
          <button
            type="button"
            className={clsx(BUTTON_BASE, 'text-text-muted hover:bg-muted hover:text-text-primary')}
            onClick={() => editor.chain().focus().redo().run()}
            aria-label="Redo"
          >
            <Redo2 className="h-4 w-4" />
          </button>
        </div>
      </div>
      <div className="max-h-72 overflow-y-auto px-3 py-2">
        <EditorContent editor={editor} className="tiptap" />
      </div>
    </div>
  );
}
