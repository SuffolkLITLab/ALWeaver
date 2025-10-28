import { useEffect, useState } from 'react';
import Editor from '@monaco-editor/react';
import { useEditorStore } from '@/state/editorStore';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';

const DEBOUNCE_MS = 500;

export function YamlEditorView(): JSX.Element {
  const yamlDocument = useEditorStore((state) => state.yamlDocument);
  const setYamlDocument = useEditorStore((state) => state.setYamlDocument);

  const [value, setValue] = useState<string>(yamlDocument);
  const debouncedValue = useDebouncedValue(value, DEBOUNCE_MS);

  useEffect(() => {
    setValue(yamlDocument);
  }, [yamlDocument]);

  useEffect(() => {
    if (debouncedValue !== yamlDocument) {
      setYamlDocument(debouncedValue);
    }
  }, [debouncedValue, setYamlDocument, yamlDocument]);

  return (
    <div className="flex flex-1 flex-col bg-[#0f172a]">
      <Editor
        value={value}
        onChange={(nextValue) => setValue(nextValue ?? '')}
        language="yaml"
        theme="vs-dark"
        height="100%"
        options={{
          minimap: { enabled: false },
          scrollBeyondLastLine: false,
          padding: { top: 16, bottom: 16 },
          fontSize: 14,
          fontFamily: 'JetBrains Mono, Menlo, monospace',
          wordWrap: 'on',
          automaticLayout: true,
        }}
      />
    </div>
  );
}
