import { useCallback, useMemo, useState } from 'react';
import { AlertTriangle, CheckCircle2, Clipboard, ClipboardCheck, Loader2 } from 'lucide-react';
import { useEditorStore } from '@/state/editorStore';

const ISSUE_TONE: Record<string, { label: string; color: string }> = {
  error: { label: 'Error', color: 'text-danger' },
  warning: { label: 'Warning', color: 'text-warning' },
  info: { label: 'Info', color: 'text-accent' },
};

export function ValidationSummary(): JSX.Element {
  const validation = useEditorStore((state) => state.validation);
  const yamlDocument = useEditorStore((state) => state.yamlDocument);
  const [copied, setCopied] = useState(false);

  const handleCopyYaml = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(yamlDocument);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopied(false);
    }
  }, [yamlDocument]);

  const issues = validation.issues;
  const summaryLabel = useMemo(() => {
    if (validation.status === 'loading') {
      return 'Validating YAML…';
    }
    if (validation.status === 'error') {
      return validation.errorMessage ?? 'Validation failed';
    }
    if (issues.length === 0) {
      return 'No validation issues detected.';
    }
    return `${issues.length} validation issue${issues.length === 1 ? '' : 's'} found.`;
  }, [issues.length, validation]);

  return (
    <div className="flex h-full flex-col gap-4">
      <div className="flex items-start gap-3 rounded-lg border border-border bg-muted px-3 py-3">
        <div className="mt-0.5">
          {validation.status === 'loading' ? (
            <Loader2 className="h-4 w-4 animate-spin text-accent" />
          ) : issues.length === 0 && validation.status === 'valid' ? (
            <CheckCircle2 className="h-4 w-4 text-success" />
          ) : (
            <AlertTriangle className="h-4 w-4 text-warning" />
          )}
        </div>
        <div>
          <p className="text-sm font-medium text-text-primary">Validation status</p>
          <p className="text-xs text-text-muted">{summaryLabel}</p>
          {validation.lastUpdatedAt && (
            <p className="mt-1 text-xs text-text-muted">
              Updated {new Date(validation.lastUpdatedAt).toLocaleTimeString()}
            </p>
          )}
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-medium text-text-muted">Issues</h4>
          <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-text-muted">{issues.length}</span>
        </div>
        <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
          {issues.length === 0 ? (
            <p className="text-xs text-text-muted">No issues to display.</p>
          ) : (
            issues.map((issue, index) => {
              const tone = ISSUE_TONE[issue.level] ?? ISSUE_TONE.error;
              return (
                <div key={`${issue.message}-${index}`} className="rounded-lg border border-border px-3 py-2">
                  <p className={`text-xs font-semibold ${tone.color}`}>{tone.label}</p>
                  <p className="text-sm text-text-primary">{issue.message}</p>
                  {issue.block_id && (
                    <p className="text-xs text-text-muted">Block: {issue.block_id}</p>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-medium text-text-muted">YAML preview</h4>
          <button
            type="button"
            onClick={handleCopyYaml}
            className="inline-flex h-7 w-7 items-center justify-center rounded text-text-muted transition-colors hover:bg-muted hover:text-text-primary"
            aria-label="Copy YAML"
          >
            {copied ? <ClipboardCheck className="h-3.5 w-3.5" /> : <Clipboard className="h-3.5 w-3.5" />}
          </button>
        </div>
        <pre className="max-h-64 overflow-auto rounded-lg border border-border bg-background px-3 py-2 text-xs">
          {yamlDocument}
        </pre>
      </div>
    </div>
  );
}
