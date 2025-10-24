import { useMemo } from 'react';
import Editor from '@monaco-editor/react';
import type { Block } from '../../types/blocks';
import { useBlockStore } from '../../store/useBlockStore';
import { updateBlockContent } from '../../utils/yamlMapper';

type CodeEditorProps = {
  block: Block;
  height?: string | number;
};

const deriveCodeValue = (block: Block) => {
  if (block.type === 'code') {
    const code = block.data?.code;
    return typeof code === 'string' ? code : block.content;
  }

  if (block.type === 'interview_order') {
    const data = block.data?.interview_order as Record<string, unknown> | undefined;
    const code = data?.code;
    return typeof code === 'string' ? code : block.content;
  }

  return block.content;
};

export const CodeEditor = ({ block, height = '100%' }: CodeEditorProps) => {
  const updateBlock = useBlockStore((state) => state.updateBlock);
  const value = useMemo(() => deriveCodeValue(block), [block]);

  return (
    <div className="rounded-xl overflow-hidden border border-outline/40 bg-panel/70">
      <Editor
        height={height}
        value={value}
        defaultLanguage={block.language}
        theme="vs-dark"
        options={{
          minimap: { enabled: false },
          fontFamily: 'JetBrains Mono, ui-monospace, SFMono-Regular',
          fontSize: 13,
          scrollBeyondLastLine: false,
          smoothScrolling: true,
          automaticLayout: true,
        }}
        onChange={(nextValue) => {
          const code = nextValue ?? '';
          updateBlock(block.id, (current) => {
            if (current.type === 'interview_order') {
              const prev = (current.data?.interview_order ?? {}) as Record<string, unknown>;
              return updateBlockContent(current, {
                ...prev,
                code,
              });
            }

            return updateBlockContent(current, { code });
          });
        }}
      />
    </div>
  );
};
