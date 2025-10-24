import { MonitorCog, PanelsTopLeft, Save } from 'lucide-react';
import { BlockSidebar } from './components/sidebar/BlockSidebar';

import { RightPanel } from './components/right-panel/RightPanel';
import { useBlockStore } from './store/useBlockStore';
import { useAutoValidation } from './hooks/useAutoValidation';

const ModeToggle = () => {
  const mode = useBlockStore((state) => state.mode);
  const setMode = useBlockStore((state) => state.setMode);

  return (
    <div className="inline-flex items-center gap-1 rounded-full border border-outline/40 bg-panel p-1">
      <button
        type="button"
        onClick={() => setMode('visual')}
        className={`px-4 py-1.5 text-xs font-semibold rounded-full transition ${
          mode === 'visual' ? 'bg-accent text-accent-foreground' : 'text-slate-300'
        }`}
      >
        Visual
      </button>
      <button
        type="button"
        onClick={() => setMode('code')}
        className={`px-4 py-1.5 text-xs font-semibold rounded-full transition ${
          mode === 'code' ? 'bg-accent text-accent-foreground' : 'text-slate-300'
        }`}
      >
        Code
      </button>
    </div>
  );
};

function App() {
  const isDirty = useBlockStore((state) => state.isDirty);
  const exportYaml = useBlockStore((state) => state.exportYaml);
  const { isValidating, error } = useAutoValidation();

  const handleSave = () => {
    const yaml = exportYaml();
    const blob = new Blob([yaml], { type: 'text/yaml' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'interview.yml';
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-canvas text-slate-100 flex flex-col">
      <header className="h-16 flex items-center justify-between border-b border-outline/40 px-6 bg-surface/90 backdrop-blur">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-accent text-accent-foreground grid place-items-center font-bold text-sm">
            DA
          </div>
          <div>
            <h1 className="text-lg font-semibold tracking-tight">Docassemble Visual Builder</h1>
            <p className="text-xs text-slate-400">Craft interviews visually — synced to YAML.</p>
          </div>
          {isDirty && (
            <span className="ml-4 text-[11px] uppercase tracking-wide text-amber-300">
              Unsaved changes
            </span>
          )}
        </div>

        <div className="flex items-center gap-3">
          <ModeToggle />
          <div className="text-xs text-slate-400 min-w-[120px]">
            {isValidating ? 'Validating…' : error ? <span className="text-rose-300">Validation failed</span> : 'Validation clean'}
          </div>
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-lg border border-outline/40 bg-panel px-4 py-2 text-sm text-slate-200 hover:border-accent"
            onClick={handleSave}
          >
            <Save size={16} />
            Save YAML
          </button>
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-accent-foreground shadow-panel"
            onClick={() => window.alert('Docassemble sandbox preview will launch in Phase 4.')}
          >
            <MonitorCog size={16} />
            Run Preview
          </button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        <div className="flex-1 overflow-y-auto">
          <BlockSidebar />
        </div>
        <RightPanel />
      </div>

      <footer className="h-12 flex items-center justify-between border-t border-outline/30 px-6 bg-surface/80 text-xs text-slate-400">
        <div className="flex items-center gap-2">
          <PanelsTopLeft size={14} />
          Phase 1 • Core YAML Editor
        </div>
        <p>Docassemble integration sandbox coming in Phase 4.</p>
      </footer>
    </div>
  );
}

export default App;
