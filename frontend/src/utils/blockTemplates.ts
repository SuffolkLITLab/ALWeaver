import type { BlockType } from '@/api/types';

const BLOCK_TEMPLATES: Record<BlockType, string> = {
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
};

export function createBlockTemplate(type: BlockType): string {
  const template = BLOCK_TEMPLATES[type];
  if (template) {
    return template.trim();
  }
  return `code: |\n  # New ${type} block`; // fallback
}
