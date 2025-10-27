import { HeaderBar } from './HeaderBar';
import { OutlineSidebar } from './OutlineSidebar';
import { EditorCanvas } from './EditorCanvas';
import { RightSidebar } from './RightSidebar';

export function AppShell(): JSX.Element {
  return (
    <div className="flex h-full w-full overflow-hidden bg-background">
      <OutlineSidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <HeaderBar />
        <div className="flex min-h-0 flex-1 overflow-hidden">
          <EditorCanvas />
          <RightSidebar />
        </div>
      </div>
    </div>
  );
}
