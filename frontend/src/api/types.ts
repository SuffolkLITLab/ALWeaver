export type BlockType =
  | 'metadata'
  | 'objects'
  | 'code'
  | 'attachment'
  | 'question'
  | 'interview_order'
  | 'event'
  | (string & {});

export type BlockLanguage = 'yaml' | 'python' | 'markdown';

export interface BlockSummary {
  id: string;
  type: BlockType;
  label?: string | null;
  language: BlockLanguage;
  position: number;
  order_items?: string[] | null;
  isMandatory?: boolean;
  isAttachment?: boolean;
  isMetadata?: boolean;
}

export interface ParseRequest {
  yaml: string;
}

export interface ParseResponse {
  blocks: BlockSummary[];
}

export interface ValidateRequest {
  yaml: string;
}

export interface ValidationIssue {
  block_id: string | null;
  level: 'info' | 'warning' | 'error';
  message: string;
}

export interface ValidateResponse {
  issues: ValidationIssue[];
  valid: boolean;
}
