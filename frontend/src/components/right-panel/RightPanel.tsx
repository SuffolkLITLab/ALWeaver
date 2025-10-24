import { useMemo } from 'react';
import { ClipboardCheck, Play } from 'lucide-react';
import { FlowCanvas } from './FlowCanvas';
import { useBlockStore } from '../../store/useBlockStore';
import { serializeBlocksToYaml } from '../../utils/yamlMapper';

export const RightPanel = () => {
  const blocks = useBlockStore((state) => state.blocks);
  const validationIssues = useBlockStore((state) => state.validationIssues);

  const yamlPreview = useMemo(() => serializeBlocksToYaml(blocks), [blocks]);

  return (
    <aside className="w-[420px] bg-surface border-l border-outline/40 flex flex-col gap-6 px-5 py-6 overflow-y-auto">
      <section>
        <header className="flex items-center justify-between mb-3">
          <div>
            <p className="text-xs uppercase tracking-wide text-slate-400">Flow</p>
            <h3 className="text-lg font-semibold text-slate-100">Interview Map</h3>
          </div>
          <button
            type="button"
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md border border-outline/30 bg-panel text-xs text-slate-200 hover:border-accent"
          >
            <Play size={14} />
            Simulate
          </button>
        </header>
        <FlowCanvas />
      </section>

      <section>
        <header className="flex items-center gap-2 mb-3">
          <ClipboardCheck size={16} className="text-emerald-300" />
          <div>
            <p className="text-xs uppercase tracking-wide text-slate-400">Validation</p>
            <h3 className="text-lg font-semibold text-slate-100">Schema Checks</h3>
          </div>
        </header>

        {validationIssues.length === 0 ? (
          <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100">
            All good! No validation issues detected yet.
          </div>
        ) : (
          <ul className="space-y-2">
            {validationIssues.map((issue) => (
              <li key={`${issue.blockId}-${issue.message}`} className="rounded-md border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-100">
                <strong className="block text-xs uppercase tracking-wide">{issue.level}</strong>
                {issue.message}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <header className="flex items-center justify-between mb-3">
          <div>
            <p className="text-xs uppercase tracking-wide text-slate-400">Source</p>
            <h3 className="text-lg font-semibold text-slate-100">Docassemble YAML</h3>
          </div>
        </header>
        <textarea
          className="w-full h-64 rounded-xl border border-outline/30 bg-panel/70 text-xs text-slate-200 font-mono leading-relaxed p-4"
          value={yamlPreview}
          readOnly
        />
      </section>
    </aside>
  );
};
