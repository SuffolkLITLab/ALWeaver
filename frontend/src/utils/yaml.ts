import { parse, stringify } from 'yaml';
import type { BlockLanguage, BlockSummary, BlockType } from '@/api/types';
import type { EditorBlock, QuestionPreview } from '@/state/types';

const BLOCK_SEPARATOR = /^---$/m;

const KNOWN_BLOCK_TYPES: BlockType[] = [
  'metadata',
  'objects',
  'code',
  'attachment',
  'question',
  'interview_order',
  'event',
];

const LANGUAGE_MAP: Record<BlockType, BlockLanguage> = {
  metadata: 'yaml',
  objects: 'yaml',
  code: 'python',
  attachment: 'markdown',
  question: 'yaml',
  interview_order: 'python',
  event: 'yaml',
};

const FIELD_RESERVED_KEYS = new Set([
  'field',
  'var',
  'variable',
  'datatype',
  'input type',
  'choices',
  'hint',
  'css class',
  'max',
  'min',
  'required',
  'help',
]);

export function splitYamlDocument(yamlDocument: string): string[] {
  const trimmed = yamlDocument.trim();
  if (!trimmed) {
    return [];
  }

  const parts: string[] = [];
  let buffer: string[] = [];

  for (const line of trimmed.split('\n')) {
    if (line.trim() === '---') {
      if (buffer.length > 0) {
        parts.push(buffer.join('\n').trim());
      }
      buffer = [];
    } else {
      buffer.push(line);
    }
  }

  if (buffer.length > 0) {
    const finalPart = buffer.join('\n').trim();
    if (finalPart) {
      parts.push(finalPart);
    }
  }

  return parts;
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
  if (type === 'metadata') {
    const meta = (data.metadata ?? {}) as Record<string, unknown>;
    const title = typeof meta.title === 'string' ? meta.title : undefined;
    return title ? `Metadata • ${title}` : 'Metadata';
  }

  if (type === 'question') {
    const question = data.question;
    if (typeof question === 'string') {
      const firstLine = question.trim().split('\n')[0];
      return `Question • ${firstLine}`;
    }
    return 'Question';
  }

  if (type === 'code') {
    const code = data.code;
    if (typeof code === 'string' && code.trim()) {
      return `Code • ${code.trim().split('\n')[0]}`;
    }
    return 'Code';
  }

  if (type === 'attachment') {
    const attachment = (data.attachment ?? {}) as Record<string, unknown>;
    const name = typeof attachment.name === 'string' ? attachment.name : undefined;
    return name ? `Attachment • ${name}` : 'Attachment';
  }

  if (type === 'event') {
    const eventName = data.event;
    return typeof eventName === 'string' && eventName ? `Event • ${eventName}` : 'Event';
  }

  if (type === 'objects') {
    return 'Objects';
  }

  if (type === 'interview_order') {
    return 'Interview Order';
  }

  return type;
}

function extractOrderItems(block: Record<string, unknown>): string[] {
  const interviewOrder = block.interview_order;
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

    return {
      id: `field-${index}`,
      label,
      variable,
      datatype: typeof record.datatype === 'string' ? record.datatype : undefined,
      required:
        typeof record.required === 'boolean'
          ? record.required
          : typeof record.required === 'string'
            ? record.required.toLowerCase() === 'true'
            : undefined,
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

  const orderItems = type === 'interview_order' ? extractOrderItems(blockRecord) : [];
  const isMandatory =
    type === 'interview_order' &&
    !!(
      blockRecord.interview_order &&
      typeof blockRecord.interview_order === 'object' &&
      (blockRecord.interview_order as Record<string, unknown>).mandatory
    );

  const metadata = {
    isMandatory,
    isAttachment: type === 'attachment',
    isMetadata: type === 'metadata',
    orderItems,
    questionPreview: type === 'question' ? parseQuestionPreview(blockRecord) : undefined,
    rawData: blockRecord,
  };

  return {
    id: `${type}-${position}`,
    type,
    label,
    language,
    position,
    raw: raw.trim(),
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
      return stringify(block.metadata.rawData).trim();
    }
    const parsed = parse(block.raw);
    return stringify(parsed).trim();
  } catch {
    return block.raw.trim();
  }
}

export function buildYamlDocument(blocks: EditorBlock[]): string {
  return blocks.map((block) => serializeBlock(block)).join('\n\n---\n\n');
}
