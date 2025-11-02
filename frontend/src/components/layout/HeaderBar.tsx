import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ChangeEvent } from 'react';
import {
  Loader2,
  ShieldCheck,
  ShieldAlert,
  CircleAlert,
  FileText,
  FileUp,
  Save,
  ServerCog,
  CloudUpload,
} from 'lucide-react';
import { validateYamlDocument } from '@/api/client';
import { useEditorStore } from '@/state/editorStore';
import { Badge } from '../common/Badge';
import { Button } from '../common/Button';
import { DocassembleSettingsModal } from '../common/DocassembleSettingsModal';
import { useDocassembleStore } from '@/state/docassembleStore';
import { uploadPlaygroundFile, fetchDocassembleUser } from '@/api/docassemble';

const DEFAULT_DOCASSEMBLE_PROJECT = 'default';

const formatDocassembleProject = (project?: string | null): string => {
  if (!project || project === DEFAULT_DOCASSEMBLE_PROJECT) {
    return 'default';
  }
  return project;
};

function ensureYamlFilename(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) {
    return 'untitled.yml';
  }

  const hasExtension = /\.ya?ml$/i.test(trimmed);
  return hasExtension ? trimmed : `${trimmed}.yml`;
}

export function HeaderBar(): JSX.Element {
  const [isManualValidating, setManualValidating] = useState(false);
  const [isDocassembleModalOpen, setDocassembleModalOpen] = useState(false);
  const docassembleConfig = useDocassembleStore((state) => state.config);
  const selectedDocassembleProject = useDocassembleStore((state) => state.selectedProject);
  const selectedDocassembleFilename = useDocassembleStore((state) => state.selectedFilename);
  const updateDocassembleConfig = useDocassembleStore((state) => state.updateConfig);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const yamlDocument = useEditorStore((state) => state.yamlDocument);
  const validation = useEditorStore((state) => state.validation);
  const activeView = useEditorStore((state) => state.activeView);
  const documentName = useEditorStore((state) => state.documentName);
  const setDocumentName = useEditorStore((state) => state.setDocumentName);
  const initializeFromYaml = useEditorStore((state) => state.initializeFromYaml);
  const setValidationState = useEditorStore((state) => state.setValidationState);
  const setSidebarState = useEditorStore((state) => state.setSidebarState);
  const setActiveView = useEditorStore((state) => state.setActiveView);

  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle');
  const [saveMessage, setSaveMessage] = useState<string | undefined>();
  const saveResetTimeout = useRef<number | undefined>(undefined);
  const [docassembleSaveStatus, setDocassembleSaveStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle');
  const [docassembleSaveMessage, setDocassembleSaveMessage] = useState<string | undefined>();
  const docassembleSaveTimeout = useRef<number | undefined>(undefined);
  const fetchedUserInfoRef = useRef(false);

  useEffect(() => {
    return () => {
      if (saveResetTimeout.current !== undefined) {
        window.clearTimeout(saveResetTimeout.current);
      }
      if (docassembleSaveTimeout.current !== undefined) {
        window.clearTimeout(docassembleSaveTimeout.current);
      }
    };
  }, []);

  useEffect(() => {
    fetchedUserInfoRef.current = false;
  }, [docassembleConfig?.serverUrl, docassembleConfig?.apiKey]);

  useEffect(() => {
    if (!docassembleConfig || docassembleConfig.userId !== undefined || fetchedUserInfoRef.current) {
      return;
    }

    fetchedUserInfoRef.current = true;
    let cancelled = false;

    fetchDocassembleUser(docassembleConfig)
      .then((user) => {
        if (cancelled) {
          return;
        }
        updateDocassembleConfig({
          userId: user.id,
          userName: user.first_name,
          userEmail: user.email,
        });
      })
      .catch(() => {
        // Best-effort background fetch; surface errors in the settings modal instead.
      });

    return () => {
      cancelled = true;
    };
  }, [docassembleConfig, updateDocassembleConfig]);

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

  const handleSaveDocument = useCallback(() => {
    if (saveResetTimeout.current !== undefined) {
      window.clearTimeout(saveResetTimeout.current);
      saveResetTimeout.current = undefined;
    }

    setSaveStatus('saving');
    setSaveMessage(undefined);

    try {
      const filename = ensureYamlFilename(documentName);
      const blob = new Blob([yamlDocument], { type: 'text/yaml;charset=utf-8' });
      const downloadUrl = URL.createObjectURL(blob);

      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(downloadUrl);

      setDocumentName(filename);
      setSaveStatus('success');
      setSaveMessage(`Downloaded as ${filename}`);

      saveResetTimeout.current = window.setTimeout(() => {
        setSaveStatus('idle');
        setSaveMessage(undefined);
        saveResetTimeout.current = undefined;
      }, 3200);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to save YAML';
      setSaveStatus('error');
      setSaveMessage(message);
    }
  }, [documentName, setDocumentName, yamlDocument]);

  const canSaveToDocassemble =
    Boolean(docassembleConfig) &&
    Boolean(selectedDocassembleProject) &&
    Boolean(selectedDocassembleFilename) &&
    Boolean(yamlDocument.trim());

  const handleSaveToDocassemble = useCallback(async () => {
    if (!docassembleConfig || !selectedDocassembleProject || !selectedDocassembleFilename) {
      setDocassembleSaveStatus('error');
      setDocassembleSaveMessage('Select a Docassemble project and interview before saving.');
      return;
    }

    if (docassembleSaveTimeout.current !== undefined) {
      window.clearTimeout(docassembleSaveTimeout.current);
      docassembleSaveTimeout.current = undefined;
    }

    setDocassembleSaveStatus('saving');
    setDocassembleSaveMessage(undefined);

    try {
      const result = await uploadPlaygroundFile(
        docassembleConfig,
        selectedDocassembleProject,
        selectedDocassembleFilename,
        yamlDocument,
      );
      const projectLabel = formatDocassembleProject(selectedDocassembleProject);
      const taskNote = result.taskId ? ` (restart task ${result.taskId})` : '';
      setDocassembleSaveStatus('success');
      setDocassembleSaveMessage(`Uploaded ${selectedDocassembleFilename} to ${projectLabel}${taskNote}.`);
      docassembleSaveTimeout.current = window.setTimeout(() => {
        setDocassembleSaveStatus('idle');
        setDocassembleSaveMessage(undefined);
        docassembleSaveTimeout.current = undefined;
      }, 3200);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Unable to upload the interview to Docassemble.';
      setDocassembleSaveStatus('error');
      setDocassembleSaveMessage(message);
    }
  }, [docassembleConfig, selectedDocassembleFilename, selectedDocassembleProject, yamlDocument]);

  const StatusIcon = validationStatus.icon;
  const isYamlView = activeView === 'yaml';
  const isSaving = saveStatus === 'saving';
  const docassembleButtonLabel = docassembleConfig
    ? selectedDocassembleFilename
      ? `${formatDocassembleProject(selectedDocassembleProject)} / ${selectedDocassembleFilename}`
      : 'Docassemble Connected'
    : 'Connect Docassemble';

  return (
    <>
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

        <div className="flex flex-col items-end gap-1">
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
              variant={docassembleConfig ? 'secondary' : 'ghost'}
              size="sm"
              leftIcon={<ServerCog className="h-4 w-4" />}
              onClick={() => setDocassembleModalOpen(true)}
            >
              {docassembleButtonLabel}
            </Button>
            <Button
              size="sm"
              variant="secondary"
              onClick={handleSaveToDocassemble}
              disabled={!canSaveToDocassemble || docassembleSaveStatus === 'saving'}
              leftIcon={
                docassembleSaveStatus === 'saving' ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <CloudUpload className="h-4 w-4" />
                )
              }
            >
              {docassembleSaveStatus === 'success' ? 'Saved to Docassemble' : 'Save to Docassemble'}
            </Button>
            <Button
              size="sm"
              variant="secondary"
              onClick={handleSaveDocument}
              disabled={isSaving || !yamlDocument.trim()}
              leftIcon={
                isSaving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )
              }
            >
              {saveStatus === 'success' ? 'Saved' : 'Save YAML'}
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
          {saveMessage && (
            <p className={`text-xs ${saveStatus === 'error' ? 'text-danger' : 'text-text-muted'}`}>{saveMessage}</p>
          )}
          {docassembleSaveMessage && (
            <p
              className={`text-xs ${
                docassembleSaveStatus === 'error' ? 'text-danger' : 'text-text-muted'
              }`}
            >
              {docassembleSaveMessage}
            </p>
          )}
        </div>
      </header>
      <DocassembleSettingsModal
        open={isDocassembleModalOpen}
        onClose={() => setDocassembleModalOpen(false)}
      />
    </>
  );
}
