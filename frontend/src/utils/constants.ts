import type { BlockType } from '@/api/types';

const KNOWN_LABELS: Record<BlockType, string> = {
  metadata: 'Metadata',
  objects: 'Objects',
  code: 'Code',
  attachment: 'Attachment',
  question: 'Question',
  interview_order: 'Interview Order',
  event: 'Event',
};

export const BLOCK_TYPE_LABELS = KNOWN_LABELS;

export const resolveBlockTypeLabel = (type: BlockType): string => KNOWN_LABELS[type] ?? type;

export const BLOCK_TYPE_ORDER: BlockType[] = [
  'metadata',
  'question',
  'code',
  'objects',
  'attachment',
  'interview_order',
  'event',
];

export const LANGUAGE_LABELS: Record<string, string> = {
  yaml: 'YAML',
  python: 'Python',
  markdown: 'Markdown',
};

export const RIGHT_SIDEBAR_MIN_WIDTH = 320;
export const RIGHT_SIDEBAR_MAX_WIDTH = 480;

export const FIELD_DATATYPE_OPTIONS: Array<{ value: string; label: string }> = [
  { value: 'text', label: 'Text' },
  { value: 'integer', label: 'Integer' },
  { value: 'number', label: 'Number' },
  { value: 'currency', label: 'Currency' },
  { value: 'email', label: 'Email' },
  { value: 'phone', label: 'Phone' },
  { value: 'yesno', label: 'Yes / No' },
  { value: 'date', label: 'Date' },
  { value: 'time', label: 'Time' },
  { value: 'datetime', label: 'Date & Time' },
  { value: 'choice', label: 'Single Choice' },
  { value: 'choices', label: 'Multiple Choice' },
  { value: 'file', label: 'File Upload' },
  { value: 'image', label: 'Image Upload' },
];
