export type BlockType =
  | 'metadata'
  | 'objects'
  | 'code'
  | 'attachment'
  | 'question'
  | 'interview_order'
  | 'event';

export type Language = 'yaml' | 'python' | 'markdown';

export type OrderItem = {
  id: string;
  variable: string;
  description?: string;
  condition?: string;
  children?: OrderItem[];
};

export type Block = {
  id: string;
  type: BlockType;
  content: string;
  language: Language;
  schema?: string;
  position?: number;
  orderItems?: OrderItem[];
  label?: string;
  data?: Record<string, unknown>;
};

export type BlockMode = 'visual' | 'code';

export type ValidationIssue = {
  blockId: string;
  level: 'info' | 'warning' | 'error';
  message: string;
};
