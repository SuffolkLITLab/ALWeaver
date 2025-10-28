
export type KnownBlockType =
  | 'metadata'
  | 'objects'
  | 'code'
  | 'attachment'
  | 'question'
  | 'event'
  | 'features'
  | 'auto terms'
  | 'template'
  | 'attachments'
  | 'table'
  | 'translations'
  | 'include'
  | 'default screen parts'
  | 'modules'
  | 'imports'
  | 'sections'
  | 'interview help'
  | 'def'
  | 'default validation messages'
  | 'machine learning storage'
  | 'initial'
  | 'comment'
  | 'variable name'
  | 'data'
  | 'data from code'
  | 'reset'
  | 'on change'
  | 'image sets'
  | 'images'
  | 'order';

export type BlockType = KnownBlockType | (string & { readonly __blockTypeBrand?: never });

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
