import type { EditorBlock } from '@/state/types';

export function getInterviewOrderPayload(block: EditorBlock): Record<string, unknown> | undefined {
  const rawData = block.metadata.rawData as { interview_order?: unknown } | undefined;
  const payload = rawData?.interview_order;
  if (typeof payload === 'object' && payload !== null) {
    return payload as Record<string, unknown>;
  }
  return undefined;
}

export function isInterviewOrderBlock(block: EditorBlock): boolean {
  return Boolean(getInterviewOrderPayload(block));
}
