import Editor from '@monaco-editor/react';

export const YamlEditor = ({ value, height = '100%' }: { value: string; height?: string | number }) => {
  return (
    <div className="h-full rounded-xl overflow-hidden border border-outline/40 bg-panel/70">
      <Editor
        height={height}
        value={value}
        defaultLanguage="yaml"
        theme="vs-dark"
        options={{
          minimap: { enabled: false },
          fontFamily: 'JetBrains Mono, ui-monospace, SFMono-Regular',
          fontSize: 12,
          scrollBeyondLastLine: false,
          smoothScrolling: true,
          automaticLayout: true,
          readOnly: true,
        }}
      />
    </div>
  );
};