import { useCallback, useEffect, useMemo, useState } from 'react';
import Editor from '@monaco-editor/react';
import type { EditorBlock } from '@/state/types';
import { useEditorStore } from '@/state/editorStore';

interface BlockCodeEditorProps {
  block: EditorBlock;
}

const LANGUAGE_MAP: Record<string, string> = {
  yaml: 'yaml',
  python: 'python',
  markdown: 'markdown',
};

export function BlockCodeEditor({ block }: BlockCodeEditorProps): JSX.Element {
  const [value, setValue] = useState(block.raw);
  const upsertBlockFromRaw = useEditorStore((state) => state.upsertBlockFromRaw);

  useEffect(() => {
    setValue(block.raw);
  }, [block.raw]);

  const handleBlur = useCallback(() => {
    upsertBlockFromRaw(block.id, value);
  }, [block.id, upsertBlockFromRaw, value]);

  const language = useMemo(() => LANGUAGE_MAP[block.language] ?? 'yaml', [block.language]);

  return (
    <div className="rounded-xl border border-border bg-[#0f172a]">
      <Editor
        value={value}
        height="320px"
        defaultLanguage={language}
        theme="vs-dark"
        onChange={(nextValue) => setValue(nextValue ?? '')}
        onBlur={handleBlur}
        options={{
          minimap: { enabled: false },
          scrollBeyondLastLine: false,
          fontSize: 13,
          fontFamily: 'JetBrains Mono, Menlo, monospace',
          lineNumbers: 'on',
          renderWhitespace: 'none',
          wordWrap: 'on',
        }}
      />
    </div>
  );
}
