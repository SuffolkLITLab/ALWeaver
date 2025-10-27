import type { ParseResponse, ValidateResponse } from './types';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000';

const JSON_HEADERS: HeadersInit = {
  'Content-Type': 'application/json',
};

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, init);
  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || `Request to ${path} failed with status ${response.status}`);
  }
  return (await response.json()) as T;
}

export async function fetchHealth(): Promise<{ status: string }> {
  return request<{ status: string }>('/health');
}

export async function parseYamlDocument(yaml: string): Promise<ParseResponse> {
  return request<ParseResponse>('/parse', {
    method: 'POST',
    headers: JSON_HEADERS,
    body: JSON.stringify({ yaml }),
  });
}

export async function validateYamlDocument(yaml: string): Promise<ValidateResponse> {
  return request<ValidateResponse>('/validate', {
    method: 'POST',
    headers: JSON_HEADERS,
    body: JSON.stringify({ yaml }),
  });
}
