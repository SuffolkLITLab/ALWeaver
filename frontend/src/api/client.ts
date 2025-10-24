import type { ValidationIssue } from '../types/blocks';

const API_BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8000';

type RawValidationIssue = {
  block_id?: string | null;
  level: ValidationIssue['level'];
  message: string;
};

type ValidateResponse = {
  issues: RawValidationIssue[];
  valid: boolean;
};

type ValidationResult = {
  issues: ValidationIssue[];
  valid: boolean;
};

export const validateYaml = async (yaml: string, signal?: AbortSignal): Promise<ValidationResult> => {
  const response = await fetch(`${API_BASE_URL}/validate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ yaml }),
    signal,
  });

  if (!response.ok) {
    const detail = await response.json().catch(() => ({}));
    throw new Error(detail?.detail ?? 'Validation request failed');
  }

  const payload = (await response.json()) as ValidateResponse;
  const mapped: ValidationResult = {
    valid: payload.valid,
    issues: payload.issues.map((issue) => ({
      blockId: issue.block_id ?? 'global',
      level: issue.level,
      message: issue.message,
    })),
  };
  return mapped;
};
