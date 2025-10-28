
import type { BlockType } from '@/api/types';


function formatBlockKey(type: string): string {
  if (/^[A-Za-z_][A-Za-z0-9_]*$/.test(type)) {
    return type;
  }
  return `'${type.replace(/'/g, "''")}'`;
}

function createListBlock(type: string, placeholder: string): string {
  const key = formatBlockKey(type);
  return `${key}:
  - ${placeholder}
`;
}

function createMapBlock(type: string, entryKey: string, entryValue: string): string {
  const key = formatBlockKey(type);
  return `${key}:
  ${entryKey}: ${entryValue}
`;
}

function createCodeBlock(type: string, comment: string): string {
  const key = formatBlockKey(type);
  return `${key}:
  code: |
    ${comment}
`;
}

const BLOCK_TEMPLATES: Partial<Record<BlockType, string>> = {
  metadata: `metadata:
  title: Untitled Interview
  language: en
`,
  question: `question: |
  New question prompt
subquestion: |
  Additional guidance for the user.
fields:
  - Response: user.response
    datatype: text
`,
  code: `code: |
  # Interview logic goes here
`,
  attachment: `attachment:
  name: New Attachment
  filename: new-attachment.docx
  content: |
    ## Attachment content
`,
  objects: `objects:
  - party: Individual
`,
  interview_order: `interview_order:
  mandatory: false
  code: |
    # goal_variable_one
`,
  event: `event: next_step
`,
  features: createListBlock('features', 'feature_name'),
  'auto terms': createListBlock('auto terms', 'term: definition'),
  template: createMapBlock('template', 'name', 'Example Template'),
  attachments: createListBlock('attachments', '{ name: Example Attachment, filename: example.pdf }'),
  table: `${formatBlockKey('table')}:
  columns:
    - Column 1
  rows:
    - - Value
`,
  translations: `${formatBlockKey('translations')}:
  en: |
    # Translation content
`,
  include: createListBlock('include', 'another_file.yml'),
  'default screen parts': `${formatBlockKey('default screen parts')}:
  header: |
    # Header content
`,
  modules: createListBlock('modules', 'module_name'),
  imports: createListBlock('imports', 'package.module'),
  sections: `${formatBlockKey('sections')}:
  - name: Section 1
    content: |
      # Section content
`,
  'interview help': `${formatBlockKey('interview help')}:
  - topic: Getting Started
    content: |
      # Help content
`,
  def: `def: |
  # Markdown content
`,
  'default validation messages': `${formatBlockKey('default validation messages')}:
  required: Please answer this question.
`,
  'machine learning storage': `${formatBlockKey('machine learning storage')}:
  bucket: default
`,
  initial: createCodeBlock('initial', '# Initialization code'),
  comment: `comment: |
  # Notes about this section
`,
  'variable name': `${formatBlockKey('variable name')}: result_variable
`,
  data: `${formatBlockKey('data')}:
  key: value
`,
  'data from code': createCodeBlock('data from code', '# Python code returning data'),
  reset: `${formatBlockKey('reset')}:
  - variable_name
`,
  'on change': `${formatBlockKey('on change')}:
  variable: |
    # Triggered when variable changes
`,
  'image sets': `${formatBlockKey('image sets')}:
  set name:
    - image1.png
`,
  images: `${formatBlockKey('images')}:
  - filename: example.png
`,
  order: `${formatBlockKey('order')}:
  - step_one
`,
};

function buildFallbackTemplate(type: BlockType): string {
  const key = formatBlockKey(type);
  return `${key}:
  # Configure ${type} here
`;
}

export function createBlockTemplate(type: BlockType): string {
  const template = BLOCK_TEMPLATES[type];
  if (template) {
    return template.trim();
  }
  return buildFallbackTemplate(type).trim();
}
