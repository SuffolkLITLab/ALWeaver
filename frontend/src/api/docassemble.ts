import type { DocassembleConfig } from '@/utils/docassembleConfig';
import type { VariableInfo } from './types';

type RequestParams = Record<string, string | number | undefined>;

const DEFAULT_PROJECT_KEY = 'default';

const ensureBaseUrl = (serverUrl: string): string => {
  return serverUrl.replace(/\/+$/, '');
};

const buildUrl = (config: DocassembleConfig, path: string, params?: RequestParams): string => {
  const base = ensureBaseUrl(config.serverUrl);
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  const url = new URL(normalizedPath, `${base}/`);

  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value === undefined || value === null || value === '') {
        return;
      }
      url.searchParams.set(key, String(value));
    });
  }

  return url.toString();
};

const mergeHeaders = (config: DocassembleConfig, headers?: HeadersInit): Headers => {
  const merged = new Headers(headers ?? undefined);
  if (!merged.has('X-API-Key')) {
    merged.set('X-API-Key', config.apiKey);
  }
  return merged;
};

const assertOk = async (response: Response, path: string): Promise<void> => {
  if (response.ok) {
    return;
  }
  const text = await response.text().catch(() => '');
  const message = text || `Docassemble request to ${path} failed with status ${response.status}`;
  throw new Error(message);
};

async function requestJson<T>(
  config: DocassembleConfig,
  path: string,
  params?: RequestParams,
  init?: RequestInit,
): Promise<T> {
  const url = buildUrl(config, path, params);
  const response = await fetch(url, {
    ...init,
    headers: mergeHeaders(config, init?.headers),
  });
  await assertOk(response, path);
  return (await response.json()) as T;
}

async function requestText(
  config: DocassembleConfig,
  path: string,
  params?: RequestParams,
  init?: RequestInit,
): Promise<string> {
  const url = buildUrl(config, path, params);
  const response = await fetch(url, {
    ...init,
    headers: mergeHeaders(config, init?.headers),
  });
  await assertOk(response, path);
  return response.text();
}

const normalizeProject = (project?: string): string => {
  if (!project || project === DEFAULT_PROJECT_KEY) {
    return DEFAULT_PROJECT_KEY;
  }
  return project;
};

export interface DocassembleUserInfo {
  id: number;
  email?: string;
  first_name?: string;
  last_name?: string;
  privileges?: string[];
}

export async function fetchDocassembleUser(config: DocassembleConfig): Promise<DocassembleUserInfo> {
  return requestJson<DocassembleUserInfo>(config, '/api/user');
}

export async function fetchPlaygroundProjects(config: DocassembleConfig): Promise<string[]> {
  const projects = await requestJson<string[]>(config, '/api/playground/project');
  const unique = new Set<string>([DEFAULT_PROJECT_KEY, ...(Array.isArray(projects) ? projects : [])]);
  return Array.from(unique).sort((a, b) => a.localeCompare(b));
}

export async function fetchPlaygroundFiles(config: DocassembleConfig, project?: string): Promise<string[]> {
  const normalizedProject = normalizeProject(project);
  const files = await requestJson<string[]>(config, '/api/playground', {
    folder: 'questions',
    project: normalizedProject,
  });
  if (!Array.isArray(files)) {
    return [];
  }
  return files
    .filter((name) => typeof name === 'string')
    .filter((name) => /\.ya?ml$/i.test(name))
    .sort((a, b) => a.localeCompare(b));
}

const SOURCE_FILE_EXTENSIONS = ['.xlsx', '.xls', '.xliff', '.xlf', '.yaml', '.yml'];

export async function fetchPlaygroundSourceFiles(config: DocassembleConfig, project?: string): Promise<string[]> {
  const normalizedProject = normalizeProject(project);
  const files = await requestJson<string[]>(config, '/api/playground', {
    folder: 'sources',
    project: normalizedProject,
  });
  if (!Array.isArray(files)) {
    return [];
  }
  return files
    .filter((name) => typeof name === 'string')
    .filter((name) => {
      const lower = name.toLowerCase();
      return SOURCE_FILE_EXTENSIONS.some((extension) => lower.endsWith(extension));
    })
    .sort((a, b) => a.localeCompare(b));
}

export async function downloadPlaygroundFile(
  config: DocassembleConfig,
  project: string,
  filename: string,
): Promise<string> {
  const normalizedProject = normalizeProject(project);
  return requestText(config, '/api/playground', {
    folder: 'questions',
    project: normalizedProject,
    filename,
  });
}

export interface UploadPlaygroundResult {
  taskId?: string;
}

export async function uploadPlaygroundFile(
  config: DocassembleConfig,
  project: string,
  filename: string,
  contents: string,
): Promise<UploadPlaygroundResult> {
  const normalizedProject = normalizeProject(project);
  const formData = new FormData();
  formData.append('folder', 'questions');
  formData.append('project', normalizedProject);
  formData.append('restart', '0');
  formData.append('file', new Blob([contents], { type: 'text/yaml' }), filename);

  const url = buildUrl(config, '/api/playground');
  const response = await fetch(url, {
    method: 'POST',
    body: formData,
    headers: mergeHeaders(config),
  });
  await assertOk(response, '/api/playground');

  if (response.status === 200) {
    try {
      const payload = (await response.json()) as { task_id?: unknown };
      if (payload && typeof payload.task_id === 'string' && payload.task_id.trim()) {
        return { taskId: payload.task_id };
      }
    } catch {
      // ignore JSON parse errors for 200 with empty body
    }
  }

  return {};
}

interface InterviewDataResponse {
  names?: {
    var_list?: unknown;
    undefined_names?: unknown;
  };
}

const extractVariableEntry = (entry: unknown, fallbackType: string): VariableInfo | null => {
  if (!entry) {
    return null;
  }

  if (typeof entry === 'string') {
    return { name: entry, type: fallbackType };
  }

  if (Array.isArray(entry)) {
    const [rawName, rawType] = entry;
    if (typeof rawName !== 'string') {
      return null;
    }
    const typeLabel = typeof rawType === 'string' ? rawType : fallbackType;
    return { name: rawName, type: typeLabel };
  }

  if (typeof entry === 'object') {
    const record = entry as Record<string, unknown>;
    const candidate =
      record.name ??
      record.variable ??
      record.var ??
      record.path ??
      (typeof record['0'] === 'string' ? (record['0'] as string) : undefined);

    if (typeof candidate !== 'string') {
      return null;
    }

    const rawType =
      record.type ??
      record.datatype ??
      record.kind ??
      record.data_type ??
      record.status ??
      record['1'];
    const typeLabel = typeof rawType === 'string' ? rawType : fallbackType;
    return { name: candidate, type: typeLabel };
  }

  return null;
};

export const buildPlaygroundInterviewIdentifier = (
  userId: number,
  project: string | undefined,
  filename: string,
): string => {
  const normalizedProject = normalizeProject(project);
  const projectSuffix = normalizedProject === DEFAULT_PROJECT_KEY ? '' : normalizedProject;
  const base = `docassemble.playground${userId}`;
  return projectSuffix ? `${base}${projectSuffix}:${filename}` : `${base}:${filename}`;
};

export async function fetchPlaygroundVariables(
  config: DocassembleConfig,
  project: string | undefined,
  filename: string,
): Promise<VariableInfo[]> {
  if (config.userId === undefined) {
    throw new Error('Docassemble user ID is not available. Reconnect to Docassemble to continue.');
  }

  const interviewId = buildPlaygroundInterviewIdentifier(config.userId, project, filename);
  const response = await requestJson<InterviewDataResponse>(config, '/api/interview_data', {
    i: interviewId,
  });

  const variables: VariableInfo[] = [];
  const seen = new Set<string>();

  const addVariable = (entry: unknown, fallbackType: string) => {
    const parsed = extractVariableEntry(entry, fallbackType);
    if (!parsed || !parsed.name.trim()) {
      return;
    }
    const trimmedName = parsed.name.trim();
    if (seen.has(trimmedName)) {
      return;
    }
    seen.add(trimmedName);
    variables.push({
      name: trimmedName,
      type: parsed.type || fallbackType,
    });
  };

  const varList = response.names?.var_list;
  if (Array.isArray(varList)) {
    varList.forEach((entry) => addVariable(entry, 'defined'));
  }

  const undefinedList = response.names?.undefined_names;
  if (Array.isArray(undefinedList)) {
    undefinedList.forEach((entry) => addVariable(entry, 'undefined'));
  }

  variables.sort((a, b) => a.name.localeCompare(b.name));
  return variables;
}
