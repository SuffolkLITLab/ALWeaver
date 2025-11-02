import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { Loader2, RefreshCcw, X } from 'lucide-react';
import { Button } from './Button';
import { useDocassembleStore } from '@/state/docassembleStore';
import {
  downloadPlaygroundFile,
  fetchDocassembleUser,
  fetchPlaygroundFiles,
  fetchPlaygroundProjects,
} from '@/api/docassemble';
import { useEditorStore } from '@/state/editorStore';

export interface DocassembleSettingsModalProps {
  open: boolean;
  onClose: () => void;
}

const DEFAULT_PROJECT = 'default';
const RESET_DELAY_MS = 3200;

const normalizeProjectForDisplay = (project?: string): string => {
  if (!project || project === DEFAULT_PROJECT) {
    return 'default';
  }
  return project;
};

export function DocassembleSettingsModal({ open, onClose }: DocassembleSettingsModalProps): JSX.Element | null {
  const config = useDocassembleStore((state) => state.config);
  const setConfig = useDocassembleStore((state) => state.setConfig);
  const updateConfig = useDocassembleStore((state) => state.updateConfig);
  const clearConfig = useDocassembleStore((state) => state.clearConfig);
  const activeProject = useDocassembleStore((state) => state.selectedProject);
  const activeFilename = useDocassembleStore((state) => state.selectedFilename);

  const initializeFromYaml = useEditorStore((state) => state.initializeFromYaml);
  const setDocumentName = useEditorStore((state) => state.setDocumentName);
  const setActiveView = useEditorStore((state) => state.setActiveView);

  const [serverUrl, setServerUrl] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [isEditingConnection, setIsEditingConnection] = useState(false);
  const [showConnectionErrors, setShowConnectionErrors] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);

  const [projects, setProjects] = useState<string[]>([]);
  const [projectsStatus, setProjectsStatus] = useState<'idle' | 'loading' | 'error'>('idle');
  const [projectsError, setProjectsError] = useState<string | null>(null);

  const [files, setFiles] = useState<string[]>([]);
  const [filesError, setFilesError] = useState<string | null>(null);
  const [isLoadingFiles, setIsLoadingFiles] = useState(false);

  const [pendingProject, setPendingProject] = useState<string>(DEFAULT_PROJECT);
  const [pendingFilename, setPendingFilename] = useState<string>('');
  const [isLoadingInterview, setIsLoadingInterview] = useState(false);
  const [loadMessage, setLoadMessage] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const resetTimerRef = useRef<number | undefined>(undefined);

  useEffect(() => {
    if (!open) {
      return;
    }
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open, onClose]);

  useEffect(() => {
    return () => {
      if (resetTimerRef.current !== undefined) {
        window.clearTimeout(resetTimerRef.current);
        resetTimerRef.current = undefined;
      }
    };
  }, []);

  const resetLoadMessages = useCallback(() => {
    if (resetTimerRef.current !== undefined) {
      window.clearTimeout(resetTimerRef.current);
    }
    resetTimerRef.current = window.setTimeout(() => {
      setLoadMessage(null);
      setLoadError(null);
      resetTimerRef.current = undefined;
    }, RESET_DELAY_MS);
  }, []);

  const ensureUserInfo = useCallback(async (): Promise<void> => {
    if (!config || config.userId !== undefined) {
      return;
    }
    try {
      const user = await fetchDocassembleUser(config);
      updateConfig({
        userId: user.id,
        userName: user.first_name,
        userEmail: user.email,
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Unable to fetch Docassemble user information. Verify your API key.';
      setConnectionError(message);
    }
  }, [config, updateConfig]);

  const loadFiles = useCallback(
    async (projectKey: string, desiredFilename?: string) => {
      if (!config) {
        return;
      }

      setIsLoadingFiles(true);
      setFilesError(null);
      try {
        const list = await fetchPlaygroundFiles(config, projectKey);
        setFiles(list);
        const fallbackFilename = list.find((item) => item === desiredFilename) ?? list[0] ?? '';
        setPendingFilename(fallbackFilename ?? '');
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : 'Unable to load interview files from the Docassemble Playground.';
        setFiles([]);
        setFilesError(message);
      } finally {
        setIsLoadingFiles(false);
      }
    },
    [config],
  );

  const loadProjects = useCallback(
    async (options?: { preserveSelection?: boolean }) => {
      if (!config) {
        return;
      }
      setProjectsStatus('loading');
      setProjectsError(null);
      try {
        await ensureUserInfo();
        const list = await fetchPlaygroundProjects(config);
        setProjects(list);
        const preferredProject = options?.preserveSelection
          ? pendingProject
          : config.project && list.includes(config.project)
            ? config.project
            : activeProject && list.includes(activeProject)
              ? activeProject
              : list[0] ?? DEFAULT_PROJECT;
        const normalizedProject = preferredProject || DEFAULT_PROJECT;
        setPendingProject(normalizedProject);
        await loadFiles(normalizedProject, options?.preserveSelection ? pendingFilename : config.filename);
      } catch (error) {
        const message =
          error instanceof Error ? error.message : 'Unable to load Docassemble projects. Check your connection.';
        setProjects([]);
        setProjectsError(message);
        setFiles([]);
        setFilesError(null);
      } finally {
        setProjectsStatus('idle');
      }
    },
    [activeProject, config, ensureUserInfo, loadFiles, pendingFilename, pendingProject],
  );

  useEffect(() => {
    if (!open) {
      return;
    }
    setServerUrl(config?.serverUrl ?? '');
    setApiKey(config?.apiKey ?? '');
    setIsEditingConnection(!config);
    setShowConnectionErrors(false);
    setConnectionError(null);
    setProjects([]);
    setFiles([]);
    setFilesError(null);
    setProjectsError(null);
    setLoadMessage(null);
    setLoadError(null);
    const nextProject = normalizeProjectForDisplay(config?.project ?? activeProject ?? DEFAULT_PROJECT);
    setPendingProject(nextProject);
    setPendingFilename(config?.filename ?? activeFilename ?? '');
    if (!config) {
      return;
    }
    void loadProjects();
  }, [activeFilename, activeProject, config, loadProjects, open]);

  useEffect(() => {
    if (!config || !open || isEditingConnection) {
      return;
    }
    if (projects.length === 0 && projectsStatus === 'idle') {
      void loadProjects();
    }
  }, [config, isEditingConnection, loadProjects, open, projects.length, projectsStatus]);

  const handleConnectionSubmit = async (event: FormEvent) => {
    event.preventDefault();
    const trimmedUrl = serverUrl.trim().replace(/\/+$/, '');
    const trimmedKey = apiKey.trim();
    if (!trimmedUrl || !trimmedKey) {
      setShowConnectionErrors(true);
      return;
    }

    setIsConnecting(true);
    setConnectionError(null);
    try {
      const temporaryConfig = {
        serverUrl: trimmedUrl,
        apiKey: trimmedKey,
      };
      const user = await fetchDocassembleUser(temporaryConfig);
      setConfig({
        ...temporaryConfig,
        userId: user.id,
        userName: user.first_name,
        userEmail: user.email,
        project: DEFAULT_PROJECT,
        filename: undefined,
      });
      setPendingProject(DEFAULT_PROJECT);
      setPendingFilename('');
      setIsEditingConnection(false);
      setShowConnectionErrors(false);
      await loadProjects();
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'Unable to connect to Docassemble. Verify the server URL and API key.';
      setConnectionError(message);
    } finally {
      setIsConnecting(false);
    }
  };

  const handleDisconnect = () => {
    clearConfig();
    setProjects([]);
    setFiles([]);
    setPendingProject(DEFAULT_PROJECT);
    setPendingFilename('');
    setConnectionError(null);
    setIsEditingConnection(true);
  };

  const connectionSummary = useMemo(() => {
    if (!config) {
      return null;
    }
    const userLabel = [
      config.userName,
      config.userEmail ? `(${config.userEmail})` : undefined,
      config.userId !== undefined ? `ID ${config.userId}` : undefined,
    ]
      .filter(Boolean)
      .join(' ');
    return {
      server: config.serverUrl,
      user: userLabel || 'Unknown user',
    };
  }, [config]);

  const handleProjectChange = (projectKey: string) => {
    const normalized = projectKey || DEFAULT_PROJECT;
    setPendingProject(normalized);
    void loadFiles(normalized);
  };

  const handleLoadInterview = async () => {
    if (!config) {
      setLoadError('Connect to Docassemble before loading an interview.');
      setLoadMessage(null);
      resetLoadMessages();
      return;
    }
    if (!pendingFilename) {
      setLoadError('Select an interview file to load.');
      setLoadMessage(null);
      resetLoadMessages();
      return;
    }
    const projectKey = pendingProject || DEFAULT_PROJECT;
    setIsLoadingInterview(true);
    setLoadError(null);
    setLoadMessage(null);
    try {
      const yaml = await downloadPlaygroundFile(config, projectKey, pendingFilename);
      initializeFromYaml(yaml, { documentName: pendingFilename });
      setDocumentName(pendingFilename);
      setActiveView('visual');
      updateConfig({
        project: projectKey,
        filename: pendingFilename,
      });
      setLoadMessage(`Loaded ${pendingFilename} from project ${normalizeProjectForDisplay(projectKey)}.`);
      resetLoadMessages();
      onClose();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Unable to download the interview from Docassemble.';
      setLoadError(message);
      setLoadMessage(null);
      resetLoadMessages();
    } finally {
      setIsLoadingInterview(false);
    }
  };

  const connectionForm = (
    <form className="space-y-4" onSubmit={handleConnectionSubmit}>
      <div>
        <label htmlFor="docassemble-server" className="mb-1 block text-sm font-medium text-text-primary">
          Server URL
        </label>
        <input
          id="docassemble-server"
          type="url"
          value={serverUrl}
          onChange={(event) => setServerUrl(event.target.value)}
          placeholder="https://docassemble.example.com"
          className={`w-full rounded-lg border bg-muted/50 px-3 py-2 text-sm text-text-primary focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30 ${
            showConnectionErrors && !serverUrl.trim() ? 'border-danger focus:ring-danger/30' : 'border-border'
          }`}
          required
        />
      </div>
      <div>
        <label htmlFor="docassemble-api-key" className="mb-1 block text-sm font-medium text-text-primary">
          API Key
        </label>
        <input
          id="docassemble-api-key"
          type="text"
          value={apiKey}
          onChange={(event) => setApiKey(event.target.value)}
          placeholder="Paste your Docassemble API key"
          className={`w-full rounded-lg border bg-muted/50 px-3 py-2 text-sm text-text-primary focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30 ${
            showConnectionErrors && !apiKey.trim() ? 'border-danger focus:ring-danger/30' : 'border-border'
          }`}
          required
        />
      </div>
      {connectionError && <p className="text-sm text-danger">{connectionError}</p>}
      <div className="flex items-center justify-end gap-2">
        {config && (
          <Button
            type="button"
            variant="ghost"
            onClick={() => {
              setIsEditingConnection(false);
              setShowConnectionErrors(false);
              setConnectionError(null);
              setServerUrl(config.serverUrl);
              setApiKey(config.apiKey);
            }}
            disabled={isConnecting}
          >
            Cancel
          </Button>
        )}
        <Button type="submit" variant="primary" disabled={isConnecting}>
          {isConnecting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Connecting…
            </>
          ) : (
            'Save Connection'
          )}
        </Button>
      </div>
    </form>
  );

  const connectionSummarySection = connectionSummary && !isEditingConnection && (
    <div className="space-y-3 rounded-lg border border-border bg-muted/30 p-4">
      <div>
        <p className="text-sm font-medium text-text-primary">Server</p>
        <p className="text-sm text-text-muted">{connectionSummary.server}</p>
      </div>
      <div>
        <p className="text-sm font-medium text-text-primary">Authenticated user</p>
        <p className="text-sm text-text-muted">{connectionSummary.user}</p>
      </div>
      <div className="flex items-center justify-end gap-2">
        <Button
          type="button"
          variant="ghost"
          onClick={() => {
            setIsEditingConnection(true);
            setServerUrl(config?.serverUrl ?? '');
            setApiKey(config?.apiKey ?? '');
            setConnectionError(null);
          }}
        >
          Change connection
        </Button>
        <Button type="button" variant="secondary" onClick={handleDisconnect}>
          Disconnect
        </Button>
      </div>
    </div>
  );

  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 py-6">
      <div className="relative w-full max-w-2xl rounded-xl border border-border bg-surface p-6 shadow-soft">
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-text-primary">Docassemble Playground</h2>
            <p className="text-sm text-text-muted">
              Connect to a Docassemble Playground, select a project, and load interviews directly into the editor.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="inline-flex h-8 w-8 items-center justify-center rounded-full text-text-muted hover:bg-muted hover:text-text-primary focus-visible:ring-2 focus-visible:ring-primary/40"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-6">
          <section className="space-y-4">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-text-muted">Connection</h3>
            {isEditingConnection || !config ? connectionForm : connectionSummarySection}
          </section>

          {config && !isEditingConnection && (
            <section className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold uppercase tracking-wide text-text-muted">Playground files</h3>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => loadProjects({ preserveSelection: true })}
                  disabled={projectsStatus === 'loading'}
                  leftIcon={
                    projectsStatus === 'loading' ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <RefreshCcw className="h-4 w-4" />
                    )
                  }
                >
                  Refresh
                </Button>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-medium text-text-primary" htmlFor="docassemble-project">
                    Project
                  </label>
                  <select
                    id="docassemble-project"
                    value={pendingProject}
                    onChange={(event) => handleProjectChange(event.target.value)}
                    className="w-full rounded-lg border border-border bg-muted/50 px-3 py-2 text-sm text-text-primary focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
                  >
                    {projects.map((project) => (
                      <option key={project} value={project}>
                        {normalizeProjectForDisplay(project)}
                      </option>
                    ))}
                  </select>
                  {projectsError && <p className="mt-2 text-sm text-danger">{projectsError}</p>}
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-text-primary" htmlFor="docassemble-file">
                    Interview file
                  </label>
                  <select
                    id="docassemble-file"
                    value={pendingFilename}
                    onChange={(event) => setPendingFilename(event.target.value)}
                    disabled={isLoadingFiles || files.length === 0}
                    className="w-full rounded-lg border border-border bg-muted/50 px-3 py-2 text-sm text-text-primary focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30 disabled:cursor-not-allowed"
                  >
                    {files.length === 0 && <option value="">No interviews found</option>}
                    {files.map((file) => (
                      <option key={file} value={file}>
                        {file}
                      </option>
                    ))}
                  </select>
                  {filesError && <p className="mt-2 text-sm text-danger">{filesError}</p>}
                </div>
              </div>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="text-sm text-text-muted">
                  {activeProject && activeFilename ? (
                    <span>
                      Currently editing:{' '}
                      <span className="font-medium text-text-primary">
                        {normalizeProjectForDisplay(activeProject)}/{activeFilename}
                      </span>
                    </span>
                  ) : (
                    <span>No interview loaded yet.</span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={handleLoadInterview}
                    disabled={isLoadingInterview || !pendingFilename}
                    leftIcon={
                      isLoadingInterview ? <Loader2 className="h-4 w-4 animate-spin" /> : undefined
                    }
                  >
                    {isLoadingInterview ? 'Loading…' : 'Load interview'}
                  </Button>
                </div>
              </div>
              {loadMessage && <p className="text-sm text-text-primary">{loadMessage}</p>}
              {loadError && <p className="text-sm text-danger">{loadError}</p>}
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
