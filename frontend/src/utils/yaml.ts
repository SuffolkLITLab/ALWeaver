import { parse, stringify } from 'yaml';
import type { BlockLanguage, BlockSummary, BlockType } from '@/api/types';
import type { EditorBlock, QuestionPreview } from '@/state/types';

const KNOWN_BLOCK_TYPES: BlockType[] = [
  'metadata',
  'objects',
  'code',
  'attachment',
  'attachments',
  'question',
  'features',
  'auto terms',
  'template',
  'table',
  'translations',
  'include',
  'default screen parts',
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

const LANGUAGE_MAP: Partial<Record<BlockType, BlockLanguage>> = {
  code: 'python',
  def: 'markdown',
};

const FIELD_RESERVED_KEYS = new Set([
  'field',
  'var',
  'variable',
  'datatype',
  'input type',
  'choices',
  'code',
  'hint',
  'css class',
  'max',
  'min',
  'required',
  'help',
]);

export function splitYamlDocument(yamlDocument: string): string[] {
  if (!yamlDocument) {
    return [];
  }

  const parts: string[] = [];
  let buffer: string[] = [];

  const lines = yamlDocument.replace(/\r\n?/g, '\n').split('\n');

  for (const line of lines) {
    if (line.trim() === '---') {
      if (buffer.length > 0) {
        parts.push(buffer.join('\n'));
        buffer = [];
      } else {
        buffer = [];
      }
      continue;
    }
    buffer.push(line);
  }

  if (buffer.length > 0) {
    parts.push(buffer.join('\n'));
  }

  return parts.filter((part, index) => part.length > 0 || index === parts.length - 1);
}

function guessBlockType(data: unknown): BlockType {
  if (data && typeof data === 'object') {
    const payload = data as Record<string, unknown>;
    for (const candidate of KNOWN_BLOCK_TYPES) {
      if (payload[candidate] !== undefined) {
        return candidate;
      }
    }
    if (payload.question !== undefined) {
      return 'question';
    }
  }

  return 'code';
}

function labelForBlock(type: BlockType, data: Record<string, unknown>): string | undefined {
  const interviewOrder = data['interview_order'];
  if (interviewOrder && typeof interviewOrder === 'object') {
    return 'Interview Order';
  }
  if (type === 'metadata') {
    const meta = (data.metadata ?? {}) as Record<string, unknown>;
    const title = typeof meta.title === 'string' ? meta.title : undefined;
    return title ?? undefined;
  }

  if (type === 'question') {
    const question = data.question;
    if (typeof question === 'string') {
      const firstLine = question.trim().split('\n')[0];
      return firstLine || undefined;
    }
    if (typeof question === 'object' && question !== null) {
      const q = question as Record<string, unknown>;
      const text = typeof q.question === 'string' ? q.question : undefined;
      if (text) {
        return text.trim().split('\n')[0] || undefined;
      }
    }
    return undefined;
  }

  if (type === 'code') {
    const code = data.code;
    if (typeof code === 'string' && code.trim()) {
      return code.trim().split('\n')[0] || undefined;
    }
    if (typeof code === 'object' && code !== null) {
      const c = code as Record<string, unknown>;
      const inner = typeof c.code === 'string' ? c.code : undefined;
      if (inner && inner.trim()) {
        return inner.trim().split('\n')[0] || undefined;
      }
    }
    return undefined;
  }

  if (type === 'attachment') {
    const attachment = (data.attachment ?? {}) as Record<string, unknown>;
    const name = typeof attachment.name === 'string' ? attachment.name : undefined;
    return name ?? undefined;
  }

  if (type === 'event') {
    const eventName = data.event;
    return typeof eventName === 'string' && eventName ? eventName : undefined;
  }

  if (type === 'objects') {
    return undefined;
  }

  return undefined;
}

function extractOrderItems(block: Record<string, unknown>): string[] {
  const interviewOrder = block['interview_order'];
  if (!interviewOrder || typeof interviewOrder !== 'object') {
    return [];
  }

  const payload = interviewOrder as Record<string, unknown>;
  const maybeCode = payload.code;
  if (typeof maybeCode !== 'string') {
    return [];
  }

  return maybeCode
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && !line.startsWith('#'));
}

function parseQuestionPreview(block: Record<string, unknown>): QuestionPreview | undefined {
  const question = typeof block.question === 'string' ? block.question.trim() : undefined;
  const subquestion = typeof block.subquestion === 'string' ? block.subquestion.trim() : undefined;
  const fieldsRaw = Array.isArray(block.fields) ? (block.fields as unknown[]) : [];

  if (!question && !subquestion && fieldsRaw.length === 0) {
    return undefined;
  }

  const fields = fieldsRaw.map((entry, index) => {
    if (typeof entry !== 'object' || entry === null) {
      return {
        id: `field-${index}`,
        label: `Field ${index + 1}`,
        variable: '',
      };
    }
    const record = entry as Record<string, unknown>;

    let label: string | undefined;
    let variable: string | undefined;

    for (const [key, value] of Object.entries(record)) {
      if (FIELD_RESERVED_KEYS.has(key)) {
        continue;
      }
      if (!label) {
        label = key;
        variable = typeof value === 'string' ? value : undefined;
      }
    }

    if (!label) {
      label = typeof record.label === 'string' ? record.label : `Field ${index + 1}`;
    }

    if (!variable) {
      variable =
        typeof record.var === 'string'
          ? record.var
          : typeof record.variable === 'string'
            ? record.variable
            : '';
    }

    let required = true;
    if (typeof record.required === 'boolean') {
      required = record.required;
    } else if (typeof record.required === 'string') {
      required = record.required.toLowerCase() !== 'false';
    }

    return {
      id: `field-${index}`,
      label,
      variable,
      datatype: typeof record.datatype === 'string' ? record.datatype : undefined,
      required,
    };
  });

  return {
    question,
    subquestion,
    fields,
  };
}

function normalizeBlock(block: Record<string, unknown>): Record<string, unknown> {
  return block;
}

function parseBlock(raw: string, position: number): EditorBlock {
  let parsed = {};
  try {
    parsed = (parse(raw) ?? {}) as Record<string, unknown>;
  } catch {
    parsed = {};
  }

  const blockRecord = normalizeBlock(parsed);
  const type = guessBlockType(blockRecord);
  const label = labelForBlock(type, blockRecord);
  const language = LANGUAGE_MAP[type] ?? 'yaml';

  const interviewOrder = blockRecord['interview_order'];
  const hasInterviewOrder = typeof interviewOrder === 'object' && interviewOrder !== null;
  const orderItems = hasInterviewOrder ? extractOrderItems(blockRecord) : undefined;
  let isMandatory = false;
  if (hasInterviewOrder) {
    const mandatoryValue = (interviewOrder as Record<string, unknown>).mandatory;
    if (typeof mandatoryValue === 'string') {
      isMandatory = mandatoryValue.toLowerCase() === 'true';
    } else if (typeof mandatoryValue === 'boolean') {
      isMandatory = mandatoryValue;
    }
  } else if (blockRecord['mandatory'] !== undefined) {
    const mandatoryValue = blockRecord['mandatory'];
    if (typeof mandatoryValue === 'string') {
      isMandatory = mandatoryValue.toLowerCase() === 'true';
    } else if (typeof mandatoryValue === 'boolean') {
      isMandatory = mandatoryValue;
    }
  }

  const metadata = {
    isMandatory,
    isAttachment: type === 'attachment',
    isMetadata: type === 'metadata',
    orderItems,
    questionPreview: type === 'question' ? parseQuestionPreview(blockRecord) : undefined,
    rawData: blockRecord,
    yamlId: typeof blockRecord.id === 'string' ? blockRecord.id : undefined,
  };

  return {
    id: `${type}-${position}`,
    type,
    label,
    language,
    position,
    raw,
    metadata,
  };
}

export function parseBlocksFromYaml(yamlDocument: string): EditorBlock[] {
  const blocks = splitYamlDocument(yamlDocument);
  return blocks.map((raw, index) => parseBlock(raw, index));
}

export function parseBlockFromRaw(raw: string, position: number): EditorBlock {
  return parseBlock(raw, position);
}

export function mergeServerSummaries(blocks: EditorBlock[], summaries: BlockSummary[]): EditorBlock[] {
  const summaryByPosition = new Map<number, BlockSummary>();
  summaries.forEach((summary) => summaryByPosition.set(summary.position, summary));

  return blocks.map((block) => {
    const summary = summaryByPosition.get(block.position);
    if (!summary) {
      return block;
    }

    return {
      ...block,
      id: summary.id,
      type: summary.type,
      label: summary.label ?? block.label,
      language: summary.language,
      metadata: {
        ...block.metadata,
        orderItems: summary.order_items ?? block.metadata.orderItems,
        isMandatory: summary.isMandatory ?? block.metadata.isMandatory,
        isAttachment: summary.isAttachment ?? block.metadata.isAttachment,
        isMetadata: summary.isMetadata ?? block.metadata.isMetadata,
      },
    };
  });
}

export function serializeBlock(block: EditorBlock): string {
  try {
    if (block.metadata?.rawData && Object.keys(block.metadata.rawData).length > 0) {
      return ensureTrailingNewline(stringify(block.metadata.rawData));
    }
    const parsed = parse(block.raw);
    return ensureTrailingNewline(stringify(parsed));
  } catch {
    return block.raw.trim();
  }
}

export function buildYamlDocument(blocks: EditorBlock[]): string {
  return blocks.map((block) => serializeBlock(block)).join('\n\n---\n\n');
}

function ensureTrailingNewline(input: string): string {
  if (!input.endsWith('\n')) {
    return `${input}\n`;
  }
  return input;
}
