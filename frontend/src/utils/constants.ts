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
    'question',
    'code',
    'objects',
    'features',
    'auto terms',
    'template',
    'attachment',
    'attachments',
    'table',
    'translations',
    'include',
    'default screen parts',
    'metadata',
    'modules',
    'imports',
    'sections',
    'interview help',
    'def',
    'default validation messages',
    'machine learning storage',
    'initial',
    'event',
    'comment',
    'variable name',
    'data',
    'data from code',
    'reset',
    'on change',
    'image sets',
    'images',
    'order',
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
  { value: 'area', label: 'Text Area' },
  { value: 'ml', label: 'Machine Learning' },
  { value: 'mlarea', label: 'Machine Learning Area' },
  { value: 'integer', label: 'Integer' },
  { value: 'number', label: 'Number' },
  { value: 'range', label: 'Range Slider' },
  { value: 'currency', label: 'Currency' },
  { value: 'email', label: 'Email' },
  { value: 'password', label: 'Password' },
  { value: 'date', label: 'Date' },
  { value: 'time', label: 'Time' },
  { value: 'datetime', label: 'Date & Time' },
  { value: 'yesno', label: 'Yes / No' },
  { value: 'yesnomaybe', label: 'Yes / No / Maybe' },
  { value: 'yesnoradio', label: 'Yes / No (Radio)' },
  { value: 'yesnowide', label: 'Yes / No (Wide)' },
  { value: 'noyes', label: 'No / Yes' },
  { value: 'noyesmaybe', label: 'No / Yes / Maybe' },
  { value: 'noyesradio', label: 'No / Yes (Radio)' },
  { value: 'noyeswide', label: 'No / Yes (Wide)' },
  { value: 'checkboxes', label: 'Checkboxes' },
  { value: 'multiselect', label: 'Multiple Select' },
  { value: 'radio', label: 'Radio Buttons' },
  { value: 'dropdown', label: 'Dropdown' },
  { value: 'combobox', label: 'Combobox' },
  { value: 'datalist', label: 'Datalist' },
  { value: 'object', label: 'Object' },
  { value: 'object_checkboxes', label: 'Object Checkboxes' },
  { value: 'object_multiselect', label: 'Object Multiple Select' },
  { value: 'file', label: 'File Upload' },
  { value: 'files', label: 'Multiple Files Upload' },
  { value: 'camera', label: 'Camera' },
  { value: 'camcorder', label: 'Camcorder' },
  { value: 'microphone', label: 'Microphone' },
  { value: 'environment', label: 'Environment Capture' },
  { value: 'ajax', label: 'AJAX Field' },
  { value: 'hidden', label: 'Hidden Field' },
  { value: 'user', label: 'User' },
];
