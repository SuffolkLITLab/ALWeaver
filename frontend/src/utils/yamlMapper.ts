import { parse, stringify } from 'yaml';
import type { Block, BlockType, OrderItem } from '../types/blocks';

const BLOCK_DELIMITER = /\n-{3,}\s*\n/g;

const LANGUAGE_MAP: Record<BlockType, Block['language']> = {
  metadata: 'yaml',
  objects: 'yaml',
  question: 'yaml',
  attachment: 'markdown',
  code: 'python',
  interview_order: 'python',
  event: 'yaml',
};

const blockTypeCandidates: BlockType[] = [
  'metadata',
  'objects',
  'interview_order',
  'question',
  'attachment',
  'event',
  'code',
];

type FlowNode = {
  id: string;
  data: { label: string };
  position: { x: number; y: number };
  type?: string;
};

type FlowEdge = {
  id: string;
  source: string;
  target: string;
  animated?: boolean;
  label?: string;
  style?: Record<string, unknown>;
};

const ensureArray = <T>(value: T | T[] | undefined): T[] => {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  return [value];
};

const guessBlockType = (data: Record<string, unknown>): BlockType => {
  for (const candidate of blockTypeCandidates) {
    if (Object.prototype.hasOwnProperty.call(data, candidate)) {
      return candidate;
    }
  }

  if (Object.prototype.hasOwnProperty.call(data, 'question')) {
    return 'question';
  }

  return 'code';
};

const extractLabel = (type: BlockType, data: Record<string, unknown>): string => {
  switch (type) {
    case 'metadata': {
      const meta = data.metadata as Record<string, unknown> | undefined;
      const title = meta?.title as string | undefined;
      return title ? `Metadata • ${title}` : 'Metadata';
    }
    case 'objects':
      return 'Objects';
    case 'code': {
      const preview = (data.code as string | undefined)?.split('\n')[0]?.trim();
      return preview ? `Code • ${preview.slice(0, 24)}` : 'Code';
    }
    case 'attachment': {
      const attachment = data.attachment as Record<string, unknown> | undefined;
      const name = attachment && ('name' in attachment ? String(attachment.name) : undefined);
      return name ? `Attachment • ${name}` : 'Attachment';
    }
    case 'question': {
      const question = data.question as string | undefined;
      return question ? `Question • ${question.split('\n')[0]}` : 'Question';
    }
    case 'interview_order':
      return 'Interview Order';
    case 'event':
      return 'Event';
    default:
      return type;
  }
};

const pruneUndefined = (value: unknown): unknown => {
  if (Array.isArray(value)) {
    const cleanedArray = value
      .map((item) => pruneUndefined(item))
      .filter((item) => item !== undefined && item !== null);
    return cleanedArray;
  }

  if (value && typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>)
      .map(([key, val]) => [key, pruneUndefined(val)] as const)
      .filter(([, val]) => val !== undefined && val !== null && val !== '');

    return entries.reduce<Record<string, unknown>>((acc, [key, val]) => {
      acc[key] = val;
      return acc;
    }, {});
  }

  return value === undefined ? undefined : value;
};

const parseInterviewCode = (raw: string | undefined): OrderItem[] => {
  if (!raw) return [];
  const lines = raw
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && !line.startsWith('#'));

  const orderItems: OrderItem[] = [];
  let index = 0;

  for (const line of lines) {
    if (line.startsWith('if ')) {
      orderItems.push({
        id: `condition-${index}`,
        variable: line,
        description: 'Conditional branch',
        children: [],
      });
      index += 1;
      continue;
    }

    if (line.startsWith('elif ') || line.startsWith('else')) {
      orderItems.push({
        id: `condition-${index}`,
        variable: line,
        description: 'Conditional branch',
      });
      index += 1;
      continue;
    }

    const variableName = line.replace(/\s+/g, '');
    orderItems.push({
      id: `order-${index}`,
      variable: variableName,
    });
    index += 1;
  }

  return orderItems;
};

const toYamlString = (value: unknown, indent = 0): string =>
  stringify(value, {
    lineWidth: 0,
    indent,
  }).trimEnd();

export const parseBlocksFromYaml = (yamlText: string): Block[] => {
  const trimmed = yamlText.trim();
  if (!trimmed) return [];

  const segments = trimmed
    .split(BLOCK_DELIMITER)
    .map((segment) => segment.trim())
    .filter(Boolean);

  return segments.map((segment, index) => {
    const data = (parse(segment) ?? {}) as Record<string, unknown>;
    const type = guessBlockType(data);
    const language = LANGUAGE_MAP[type] ?? 'yaml';
    const label = extractLabel(type, data);

    const block: Block = {
      id: `${type}-${index}`,
      type,
      content: segment,
      language,
      position: index,
      label,
      data,
    };

    if (type === 'interview_order') {
      const interviewData = data.interview_order as Record<string, unknown> | undefined;
      const codeBlock = interviewData?.code as string | undefined;
      block.orderItems = parseInterviewCode(codeBlock);
    }

    return block;
  });
};

export const serializeBlocksToYaml = (blocks: Block[]): string =>
  blocks
    .sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
    .map((block) => block.content.trim())
    .join('\n---\n');

export const updateBlockContent = (block: Block, nextData: Record<string, unknown>): Block => {
  let internal: Record<string, unknown> = {};

  switch (block.type) {
    case 'metadata':
      internal = { metadata: nextData };
      break;
    case 'objects':
      internal = { objects: nextData.objects };
      break;
    case 'question':
      internal = nextData;
      break;
    case 'attachment':
      internal = nextData;
      break;
    case 'interview_order':
      internal = { interview_order: nextData };
      break;
    case 'event':
      internal = nextData;
      break;
    default:
      internal = nextData;
  }

  const cleaned = pruneUndefined(internal) as Record<string, unknown>;
  const content = toYamlString(cleaned, 2);
  const label = extractLabel(block.type, cleaned);

  return {
    ...block,
    content,
    data: cleaned,
    label,
    orderItems:
      block.type === 'interview_order'
        ? parseInterviewCode((cleaned.interview_order as { code?: string } | undefined)?.code)
        : block.orderItems,
  };
};

export const mergeBlocks = (blocks: Block[], nextBlock: Block): Block[] =>
  blocks.map((block) => (block.id === nextBlock.id ? nextBlock : block));

export const addBlock = (blocks: Block[], block: Block): Block[] => {
  const nextPosition = blocks.length;
  return [...blocks, { ...block, position: nextPosition }];
};

export const ensureUniqueId = (blocks: Block[], prefix: string): string => {
  let index = blocks.length;
  let candidate = `${prefix}-${index}`;
  const existing = new Set(blocks.map(({ id }) => id));

  while (existing.has(candidate)) {
    index += 1;
    candidate = `${prefix}-${index}`;
  }

  return candidate;
};

export const buildFlowNodes = (blocks: Block[]): FlowNode[] => {
  const nodes = blocks
    .filter((block) => block.type === 'question' || block.type === 'event')
    .map((block, index) => ({
      id: block.id,
      data: { label: block.label ?? block.type },
      position: { x: 50 + index * 220, y: 80 + (block.type === 'event' ? 160 : 0) },
      type: block.type === 'event' ? 'output' : 'default',
    }));

  return nodes;
};

export const buildFlowEdges = (blocks: Block[]): FlowEdge[] => {
  const questionBlocks = blocks.filter((block) => block.type === 'question');
  const edges: FlowEdge[] = questionBlocks.slice(0, -1).map((block, index) => ({
    id: `${block.id}->${questionBlocks[index + 1].id}`,
    source: block.id,
    target: questionBlocks[index + 1].id,
    animated: true,
  }));

  const interviewBlock = blocks.find((block) => block.type === 'interview_order');
  if (interviewBlock?.orderItems) {
    interviewBlock.orderItems.forEach((item) => {
      const targetBlock = blocks.find((block) => block.label?.includes(item.variable));
      if (!targetBlock) return;
      edges.push({
        id: `${interviewBlock.id}->${targetBlock.id}-${item.variable}`,
        source: interviewBlock.id,
        target: targetBlock.id,
        label: item.variable,
        style: { strokeDasharray: '4 4' },
      });
    });
  }

  return edges;
};

export const deriveFlowElements = (blocks: Block[]) => ({
  nodes: buildFlowNodes(blocks),
  edges: buildFlowEdges(blocks),
});

export const flattenOrderItems = (items: OrderItem[]): string[] =>
  items.flatMap((item) => [item.variable, ...flattenOrderItems(item.children ?? [])]).filter(Boolean);

export const extractVariablesFromBlocks = (blocks: Block[]): string[] => {
  const variables = new Set<string>();

  blocks.forEach((block) => {
    if (block.type === 'question') {
      const data = block.data ?? {};
      const fields = ensureArray((data as Record<string, unknown>).fields);
      fields.forEach((field) => {
        if (field && typeof field === 'object') {
          const entries = Object.entries(field as Record<string, unknown>);
          entries.forEach(([key, value]) => {
            if (key !== 'hint' && key !== 'choices' && typeof value === 'string' && value.includes(':')) {
              variables.add(value.split(':').pop() ?? value);
            }
          });
        }
      });
    }
  });

  return Array.from(variables);
};
