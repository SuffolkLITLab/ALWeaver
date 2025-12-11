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
  Code2,
  Eye,
} from 'lucide-react';
import { validateYamlDocument } from '@/api/client';
import { useEditorStore } from '@/state/editorStore';
import { Badge } from '../common/Badge';
import { Button } from '../common/Button';
import { ToggleButton } from '../common/ToggleButton';
import { StatusToast } from '../common/StatusToast';
import { DocassembleSettingsModal } from '../common/DocassembleSettingsModal';
import { OverflowMenu, type OverflowMenuItem } from '../common/OverflowMenu';
import { useDocassembleStore } from '@/state/docassembleStore';
import { uploadPlaygroundFile, fetchDocassembleUser, PLAYGROUND_FOLDERS, type PlaygroundFolder, PLAYGROUND_FOLDER_EXTENSIONS } from '@/api/docassemble';

const DEFAULT_DOCASSEMBLE_PROJECT = 'default';

const formatDocassembleProject = (project?: string | null): string => {
  if (!project || project === DEFAULT_DOCASSEMBLE_PROJECT) {
    return 'default';
  }
  return project;
};

const ensureFilename = (name: string, folder: PlaygroundFolder): string => {
  const trimmed = name.trim();
  const extensions = PLAYGROUND_FOLDER_EXTENSIONS[folder];
  if (!trimmed) {
    return `untitled${extensions[0]}`;
  }

  const hasExtension = extensions.some((ext) => trimmed.toLowerCase().endsWith(ext));
  return hasExtension ? trimmed : `${trimmed}${extensions[0]}`;
};

export function HeaderBar(): JSX.Element {
  const [isManualValidating, setManualValidating] = useState(false);
  const [isDocassembleModalOpen, setDocassembleModalOpen] = useState(false);
  const docassembleConfig = useDocassembleStore((state) => state.config);
  const selectedDocassembleProject = useDocassembleStore((state) => state.selectedProject);
  const selectedDocassembleFilename = useDocassembleStore((state) => state.selectedFilename);
  const selectedFolder = useDocassembleStore((state) => state.selectedFolder);
  const updateDocassembleConfig = useDocassembleStore((state) => state.updateConfig);
  const setSelectedFolder = useDocassembleStore((state) => state.setSelectedFolder);

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
      const filename = ensureFilename(documentName, selectedFolder);
      const blob = new Blob([yamlDocument], { type: 'text/plain;charset=utf-8' });
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
        selectedFolder,
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
  
  // Truncate long docassemble button labels
  const docassembleButtonLabel = docassembleConfig
    ? selectedDocassembleFilename
      ? `${formatDocassembleProject(selectedDocassembleProject)}/${selectedDocassembleFilename}`
      : 'Connected'
    : 'Connect';

  // Combined status for toast
  const toastMessage = saveMessage || docassembleSaveMessage || '';
  const toastStatus = (saveStatus === 'error' || docassembleSaveStatus === 'error') 
    ? 'error' 
    : (saveStatus === 'success' || docassembleSaveStatus === 'success') 
      ? 'success' 
      : 'info';
  const toastVisible = Boolean(toastMessage);

  const handleDismissToast = useCallback(() => {
    setSaveMessage(undefined);
    setDocassembleSaveMessage(undefined);
  }, []);

  // Build overflow menu items
  const overflowMenuItems: OverflowMenuItem[] = [
    {
      id: 'upload',
      label: 'Upload',
      icon: <FileUp className="h-4 w-4" />,
      onClick: handleUploadClick,
    },
    {
      id: 'preview',
      label: 'Preview',
      icon: <FileText className="h-4 w-4" />,
      onClick: handleOpenValidation,
      disabled: isYamlView,
    },
    {
      id: 'docassemble',
      label: 'Docassemble Settings',
      icon: <ServerCog className="h-4 w-4" />,
      onClick: () => setDocassembleModalOpen(true),
    },
    {
      id: 'docassemble-upload',
      label: 'Upload to Docassemble',
      icon: <CloudUpload className="h-4 w-4" />,
      onClick: handleSaveToDocassemble,
      disabled: !canSaveToDocassemble || docassembleSaveStatus === 'saving',
      variant: 'secondary',
    },
  ];

  return (
    <>
      <header className="flex h-14 flex-shrink-0 items-center justify-between border-b border-border bg-surface px-4">
        <div className="flex items-center gap-3 min-w-0">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-xs text-text-muted">File:</span>
              <select
                className="border-none bg-transparent text-xs text-text-muted outline-none cursor-pointer hover:text-text-primary"
                value={selectedFolder}
                onChange={(e) => setSelectedFolder(e.target.value as PlaygroundFolder)}
              >
                {PLAYGROUND_FOLDERS.map((folder) => (
                  <option key={folder} value={folder}>
                    {folder}
                  </option>
                ))}
              </select>
            </div>
            <p className="text-sm font-medium text-text-primary truncate max-w-[200px]">{documentName}</p>
          </div>
          <Badge tone={validationStatus.tone} className="flex items-center gap-1 flex-shrink-0">
            <StatusIcon className={validation.status === 'loading' ? 'animate-spin h-3 w-3' : 'h-3 w-3'} />
            <span>{validationStatus.label}</span>
          </Badge>
        </div>

        <div className="flex items-center gap-2">
          <ToggleButton
            options={[
              { value: 'visual', label: 'Visual', icon: <Eye className="h-3.5 w-3.5" /> },
              { value: 'yaml', label: 'YAML', icon: <Code2 className="h-3.5 w-3.5" /> },
            ]}
            value={activeView}
            onChange={(v) => setActiveView(v as 'visual' | 'yaml')}
          />
          {/* Buttons visible on larger screens */}
          <div className="hidden sm:flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              leftIcon={<FileUp className="h-3.5 w-3.5" />}
              onClick={handleUploadClick}
            >
              Upload
            </Button>
            <Button
              variant="ghost"
              size="sm"
              leftIcon={<FileText className="h-3.5 w-3.5" />}
              onClick={handleOpenValidation}
              disabled={isYamlView}
            >
              Preview
            </Button>
          </div>
          {/* Docassemble button visible on medium+ screens, goes to menu on smaller */}
          <Button
            variant={docassembleConfig ? 'secondary' : 'ghost'}
            size="sm"
            leftIcon={<ServerCog className="h-3.5 w-3.5" />}
            onClick={() => setDocassembleModalOpen(true)}
            truncate
            className="max-w-[160px] hidden md:inline-flex"
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
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <CloudUpload className="h-3.5 w-3.5" />
              )
            }
            className="hidden lg:inline-flex"
          >
            {docassembleSaveStatus === 'success' ? 'Uploaded' : 'Upload'}
          </Button>
          <Button
            size="sm"
            variant="secondary"
            onClick={handleSaveDocument}
            disabled={isSaving || !yamlDocument.trim()}
            leftIcon={
              isSaving ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Save className="h-3.5 w-3.5" />
              )
            }
          >
            Save
          </Button>
          {/* Overflow menu for smaller screens */}
          <OverflowMenu items={overflowMenuItems} label="More options" />
          <input
            ref={fileInputRef}
            type="file"
            accept={PLAYGROUND_FOLDER_EXTENSIONS[selectedFolder].join(',')}
            className="hidden"
            onChange={handleFileChange}
          />
        </div>
      </header>
      <StatusToast
        message={toastMessage}
        status={toastStatus}
        visible={toastVisible}
        onDismiss={handleDismissToast}
        autoDismissMs={3200}
      />
      <DocassembleSettingsModal
        open={isDocassembleModalOpen}
        onClose={() => setDocassembleModalOpen(false)}
      />
    </>
  );
}
