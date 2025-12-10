import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Editor from '@monaco-editor/react';
import { Sparkles } from 'lucide-react';
import type { EditorBlock } from '@/state/types';
import { useEditorStore } from '@/state/editorStore';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { isInterviewOrderBlock } from '@/utils/interviewOrderCodegen';

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
  
  // Check if this could be converted to interview order
  const canConvertToInterviewOrder = block.type === 'code' && block.language === 'python' && !isInterviewOrderBlock(block.raw, block.id, block.label);

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
  
  // Convert to interview order
  const handleConvertToInterviewOrder = useCallback(() => {
    // The comment should be a YAML comment that appears BEFORE the code: | line
    // Not inside the Python code
    
    const lines = value.split('\n');
    let idLineIndex = -1;
    
    // Find where the id: line is (should be first non-comment line)
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].trim().startsWith('id:')) {
        idLineIndex = i;
        break;
      }
    }
    
    if (idLineIndex === -1) {
      // No id line found, add comment at the beginning
      const comment = '#################### Interview order #####################';
      const newValue = comment + '\n' + value;
      setValue(newValue);
      persistValue(newValue);
      return;
    }
    
    // Insert the YAML comment before the id: line
    const comment = '#################### Interview order #####################';
    lines.splice(idLineIndex, 0, comment);
    
    const newValue = lines.join('\n');
    setValue(newValue);
    persistValue(newValue);
  }, [value, persistValue]);

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
    <div className="space-y-3">
      {canConvertToInterviewOrder && (
        <button
          type="button"
          onClick={handleConvertToInterviewOrder}
          className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg border border-primary/40 bg-primary/10 text-primary hover:bg-primary/20 transition-colors text-sm font-medium"
        >
          <Sparkles className="h-4 w-4" />
          Convert to Interview Order Block
        </button>
      )}
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
    </div>
  );
}
