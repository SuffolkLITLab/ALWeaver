import { useEditorStore } from '@/state/editorStore';
import { HeaderBar } from './HeaderBar';
import { OutlineSidebar } from './OutlineSidebar';
import { EditorCanvas } from './EditorCanvas';
import { RightSidebar } from './RightSidebar';
import { YamlEditorView } from './YamlEditorView';

export function AppShell(): JSX.Element {
  const activeView = useEditorStore((state) => state.activeView);
  const showVisual = activeView === 'visual';

  return (
    <div className="flex h-full w-full overflow-hidden bg-background">
      {showVisual && <OutlineSidebar />}
      <div className="flex flex-1 flex-col overflow-hidden">
        <HeaderBar />
        <div className="flex min-h-0 flex-1 overflow-hidden">
          {showVisual ? (
            <>
              <EditorCanvas />
              <RightSidebar />
            </>
          ) : (
            <YamlEditorView />
          )}
        </div>
      </div>
    </div>
  );
}
