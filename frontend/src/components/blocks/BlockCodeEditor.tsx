import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Editor from '@monaco-editor/react';
import type { EditorBlock } from '@/state/types';
import { useEditorStore } from '@/state/editorStore';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';

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
  const activeView = useEditorStore((state) => state.activeView);
  const lastPersistedRef = useRef(block.raw);
  const latestValueRef = useRef(block.raw);
  const prevActiveViewRef = useRef(activeView);

  const persistValue = useCallback(
    (nextValue: string) => {
      if (nextValue === lastPersistedRef.current) {
        return;
      }
      lastPersistedRef.current = nextValue;
      upsertBlockFromRaw(block.id, nextValue);
    },
    [block.id, upsertBlockFromRaw],
  );

  useEffect(() => {
    setValue(block.raw);
    lastPersistedRef.current = block.raw;
    latestValueRef.current = block.raw;
  }, [block.raw]);

  const debouncedValue = useDebouncedValue(value, 300);

  useEffect(() => {
    persistValue(debouncedValue);
  }, [debouncedValue, persistValue]);

  const handleBlur = useCallback(() => {
    persistValue(latestValueRef.current);
  }, [persistValue]);

  useEffect(
    () => () => {
      persistValue(latestValueRef.current);
    },
    [persistValue],
  );

  useEffect(() => {
    if (prevActiveViewRef.current !== activeView && activeView !== 'visual') {
      persistValue(latestValueRef.current);
    }
    prevActiveViewRef.current = activeView;
  }, [activeView, persistValue]);

  const language = useMemo(() => LANGUAGE_MAP[block.language] ?? 'yaml', [block.language]);

  return (
    <div className="rounded-xl border border-border bg-[#0f172a]">
      <Editor
        value={value}
        height="320px"
        defaultLanguage={language}
        theme="vs-dark"
        onChange={(nextValue) => {
          const next = nextValue ?? '';
          latestValueRef.current = next;
          setValue(next);
        }}
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
