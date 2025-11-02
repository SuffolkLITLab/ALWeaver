export interface DocassembleConfig {
  serverUrl: string;
  apiKey: string;
  userId?: number;
  userName?: string;
  userEmail?: string;
  project?: string;
  filename?: string;
}

const COOKIE_NAME = 'docassembleConfig';
const COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 30; // 30 days

const isBrowser = typeof document !== 'undefined';

const encodeValue = (value: string): string => {
  return encodeURIComponent(value);
};

const decodeValue = (value: string): string => {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
};

const sanitizeConfig = (config: DocassembleConfig): DocassembleConfig => {
  const trimmedUrl = config.serverUrl.trim().replace(/\s+/g, '');
  return {
    serverUrl: trimmedUrl.replace(/\/+$/, ''),
    apiKey: config.apiKey.trim(),
    userId: config.userId,
    userName: config.userName,
    userEmail: config.userEmail,
    project: config.project,
    filename: config.filename,
  };
};

export function loadDocassembleConfig(): DocassembleConfig | null {
  if (!isBrowser) {
    return null;
  }

  const cookies = document.cookie.split(';').map((entry) => entry.trim());
  const configCookie = cookies.find((cookie) => cookie.startsWith(`${COOKIE_NAME}=`));
  if (!configCookie) {
    return null;
  }

  const rawValue = configCookie.slice(COOKIE_NAME.length + 1);
  if (!rawValue) {
    return null;
  }

  try {
    const parsed = JSON.parse(decodeValue(rawValue));
    if (!parsed || typeof parsed !== 'object') {
      return null;
    }
    const serverUrl = typeof parsed.serverUrl === 'string' ? parsed.serverUrl : '';
    const apiKey = typeof parsed.apiKey === 'string' ? parsed.apiKey : '';
    if (!serverUrl || !apiKey) {
      return null;
    }

    const config: DocassembleConfig = {
      serverUrl,
      apiKey,
      userId: typeof parsed.userId === 'number' ? parsed.userId : undefined,
      userName: typeof parsed.userName === 'string' ? parsed.userName : undefined,
      userEmail: typeof parsed.userEmail === 'string' ? parsed.userEmail : undefined,
      project: typeof parsed.project === 'string' ? parsed.project : undefined,
      filename: typeof parsed.filename === 'string' ? parsed.filename : undefined,
    };

    return sanitizeConfig(config);
  } catch {
    return null;
  }
}

export function saveDocassembleConfig(config: DocassembleConfig): void {
  if (!isBrowser) {
    return;
  }

  const payload = encodeValue(JSON.stringify(sanitizeConfig(config)));
  const maxAge = `Max-Age=${COOKIE_MAX_AGE_SECONDS}`;
  const sameSite = 'SameSite=Lax';
  document.cookie = `${COOKIE_NAME}=${payload}; Path=/; ${maxAge}; ${sameSite}`;
}

export function clearDocassembleConfig(): void {
  if (!isBrowser) {
    return;
  }
  document.cookie = `${COOKIE_NAME}=; Path=/; Max-Age=0; SameSite=Lax`;
}
