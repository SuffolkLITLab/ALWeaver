import { useCallback, useMemo, useRef, useState } from 'react';
import type { ChangeEvent } from 'react';
import { Loader2, ShieldCheck, ShieldAlert, CircleAlert, FileText, FileUp } from 'lucide-react';
import { validateYamlDocument } from '@/api/client';
import { useEditorStore } from '@/state/editorStore';
import { Badge } from '../common/Badge';
import { Button } from '../common/Button';

export function HeaderBar(): JSX.Element {
  const [isManualValidating, setManualValidating] = useState(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const yamlDocument = useEditorStore((state) => state.yamlDocument);
  const validation = useEditorStore((state) => state.validation);
  const activeView = useEditorStore((state) => state.activeView);
  const documentName = useEditorStore((state) => state.documentName);
  const initializeFromYaml = useEditorStore((state) => state.initializeFromYaml);
  const setValidationState = useEditorStore((state) => state.setValidationState);
  const setSidebarState = useEditorStore((state) => state.setSidebarState);
  const setActiveView = useEditorStore((state) => state.setActiveView);

  const validationStatus = useMemo(() => {
    switch (validation.status) {
      case 'valid':
        return { tone: 'success' as const, label: 'Validation passed', icon: ShieldCheck };
      case 'invalid':
        return {
          tone: 'danger' as const,
          label: `${validation.issues.length} issue${validation.issues.length === 1 ? '' : 's'}`,
          icon: ShieldAlert,
        };
      case 'error':
        return { tone: 'danger' as const, label: 'Validation failed', icon: CircleAlert };
      case 'loading':
        return { tone: 'info' as const, label: 'Validating…', icon: Loader2 };
      default:
        return { tone: 'neutral' as const, label: 'Awaiting changes', icon: ShieldCheck };
    }
  }, [validation]);

  const isBusy = validation.status === 'loading' || isManualValidating;

  const handleRunValidation = useCallback(async () => {
    if (!yamlDocument.trim()) {
      return;
    }
    setManualValidating(true);
    setValidationState({ status: 'loading', errorMessage: undefined });

    try {
      const response = await validateYamlDocument(yamlDocument);
      setValidationState({
        status: response.valid ? 'valid' : 'invalid',
        issues: response.issues,
        errorMessage: undefined,
        lastUpdatedAt: Date.now(),
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Validation failed unexpectedly';
      setValidationState({
        status: 'error',
        issues: [],
        errorMessage: message,
        lastUpdatedAt: Date.now(),
      });
    } finally {
      setManualValidating(false);
    }
  }, [setValidationState, yamlDocument]);

  const handleOpenValidation = useCallback(() => {
    if (activeView !== 'visual') {
      setActiveView('visual');
    }
    setSidebarState({ isOpen: true, activePanel: 'validation' });
  }, [activeView, setActiveView, setSidebarState]);

  const handleToggleView = useCallback(() => {
    setActiveView(activeView === 'visual' ? 'yaml' : 'visual');
  }, [activeView, setActiveView]);

  const handleUploadClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleFileChange = useCallback(
    async (event: ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) {
        return;
      }
      try {
        const text = await file.text();
        initializeFromYaml(text, { documentName: file.name });
        setActiveView('visual');
      } finally {
        event.target.value = '';
      }
    },
    [initializeFromYaml, setActiveView],
  );

  const StatusIcon = validationStatus.icon;
  const isYamlView = activeView === 'yaml';

  return (
    <header className="flex h-16 flex-shrink-0 items-center justify-between border-b border-border bg-surface px-6">
      <div className="flex items-center gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-text-muted">Active Interview</p>
          <p className="text-lg font-semibold text-text-primary">{documentName}</p>
        </div>
        <Badge tone={validationStatus.tone} className="flex items-center gap-1">
          <StatusIcon className={validation.status === 'loading' ? 'animate-spin h-3.5 w-3.5' : 'h-3.5 w-3.5'} />
          <span>{validationStatus.label}</span>
        </Badge>
      </div>

      <div className="flex items-center gap-3">
        <Button variant="secondary" size="sm" onClick={handleToggleView}>
          {isYamlView ? 'Visual Editor' : 'YAML Editor'}
        </Button>
        <Button
          variant="ghost"
          size="sm"
          leftIcon={<FileUp className="h-4 w-4" />}
          onClick={handleUploadClick}
        >
          Upload YAML
        </Button>
        <Button
          variant="ghost"
          size="sm"
          leftIcon={<FileText className="h-4 w-4" />}
          onClick={handleOpenValidation}
          disabled={isYamlView}
        >
          YAML Preview
        </Button>
        <Button
          size="sm"
          variant="primary"
          onClick={handleRunValidation}
          disabled={isBusy || !yamlDocument.trim()}
          leftIcon={
            isBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />
          }
        >
          Run Validation
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".yaml,.yml"
          className="hidden"
          onChange={handleFileChange}
        />
      </div>
    </header>
  );
}
