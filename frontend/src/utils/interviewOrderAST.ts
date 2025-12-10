/**
 * Interview Order AST Types and Utilities
 * 
 * Defines the canonical AST structure for interview order blocks,
 * independent of rendering framework.
 */

// ============================================================================
// AST Node Types
// ============================================================================

export type InterviewOrderNode =
  | AskNode
  | SectionNode
  | ProgressNode
  | GatherNode
  | IfNode
  | ForNode
  | RunOnceNode
  | StoreSnapshotNode;

export interface AskNode {
  t: 'ASK';
  var: string;
}

export interface SectionNode {
  t: 'SECTION';
  name: string;
}

export interface ProgressNode {
  t: 'PROGRESS';
  value: number; // 0-100
}

export interface GatherNode {
  t: 'GATHER';
  list: string;
}

export interface IfNode {
  t: 'IF';
  cond: string;
  then: InterviewOrderNode[];
  else?: InterviewOrderNode[];
  flatten?: boolean; // If true, combine conditions with 'and'
}

export interface ForNode {
  t: 'FOR';
  item: string;
  iter: string;
  body: InterviewOrderNode[];
}

export interface RunOnceNode {
  t: 'RUN_ONCE';
  name: string;
  flag?: string; // Default: `ran_${name}`
}

export interface StoreSnapshotNode {
  t: 'STORE_SNAPSHOT';
  args: {
    persistent: boolean;
    data: Record<string, unknown>;
  };
}

// ============================================================================
// AST Document
// ============================================================================

export interface InterviewOrderAST {
  id: string; // e.g., 'interview_order_main'
  mandatory: true;
  nodes: InterviewOrderNode[];
}

// ============================================================================
// Badge types for visual indicators
// ============================================================================

export type NodeBadge = 'idempotent' | 'flow' | 'one-time' | 'safe' | 'effectful';

// ============================================================================
// Lint types
// ============================================================================

export interface Lint {
  level: 'info' | 'warn' | 'error';
  index: number;
  message: string;
  fix?: () => void;
}

// ============================================================================
// Helper utilities
// ============================================================================

/**
 * Generate default flag name for run-once nodes
 */
export function getDefaultFlag(name: string): string {
  return `ran_${name}`;
}

/**
 * Determine badge type for a node
 */
export function getNodeBadge(node: InterviewOrderNode): NodeBadge {
  switch (node.t) {
    case 'ASK':
    case 'GATHER':
      return 'idempotent';
    case 'SECTION':
    case 'PROGRESS':
      return 'flow';
    case 'RUN_ONCE':
      return 'one-time';
    case 'IF':
    case 'FOR':
      return 'safe';
    case 'STORE_SNAPSHOT':
      return 'effectful';
    default:
      return 'safe';
  }
}

/**
 * Get display label for a node
 */
export function getNodeLabel(node: InterviewOrderNode): string {
  switch (node.t) {
    case 'ASK':
      return `Ask: ${node.var}`;
    case 'SECTION':
      return `Section: ${node.name}`;
    case 'PROGRESS':
      return `Progress: ${node.value}%`;
    case 'GATHER':
      return `Gather: ${node.list}`;
    case 'IF':
      return `If: ${node.cond}`;
    case 'FOR':
      return `For: ${node.item} in ${node.iter}`;
    case 'RUN_ONCE':
      return `Run once: ${node.name}`;
    case 'STORE_SNAPSHOT':
      return 'Store snapshot';
    default:
      return 'Unknown';
  }
}

/**
 * Get meta line (smaller description) for a node
 */
export function getNodeMeta(node: InterviewOrderNode): string {
  switch (node.t) {
    case 'ASK':
      return 'Variable assignment';
    case 'SECTION':
      return 'nav.set_section()';
    case 'PROGRESS':
      return 'set_progress()';
    case 'GATHER':
      return 'list.gather()';
    case 'IF':
      return 'Conditional flow';
    case 'FOR':
      return 'Loop iteration';
    case 'RUN_ONCE':
      return `Flag: ${node.flag ?? getDefaultFlag(node.name)}`;
    case 'STORE_SNAPSHOT':
      return `persistent: ${node.args.persistent}`;
    default:
      return '';
  }
}

/**
 * Get the raw underlying value for a node to show in visual editors.
 * This is intended for a monospace preview line (e.g. variable name, iterator, condition).
 */
export function getNodeRawValue(node: InterviewOrderNode): string {
  switch (node.t) {
    case 'ASK':
      return node.var;
    case 'SECTION':
      return node.name;
    case 'PROGRESS':
      return String(node.value);
    case 'GATHER':
      return node.list;
    case 'IF':
      return node.cond;
    case 'FOR':
      return `${node.item} in ${node.iter}`;
    case 'RUN_ONCE':
      return node.name;
    case 'STORE_SNAPSHOT':
      return JSON.stringify(node.args.data ?? {}, null, 0);
    default:
      return '';
  }
}

/**
 * Count total steps in AST (recursive)
 */
export function countSteps(nodes: InterviewOrderNode[]): number {
  let count = 0;
  for (const node of nodes) {
    count++;
    if (node.t === 'IF') {
      count += countSteps(node.then);
      if (node.else) {
        count += countSteps(node.else);
      }
    } else if (node.t === 'FOR') {
      count += countSteps(node.body);
    }
  }
  return count;
}

/**
 * Extract sections from AST
 */
export function extractSections(nodes: InterviewOrderNode[]): string[] {
  const sections: string[] = [];
  for (const node of nodes) {
    if (node.t === 'SECTION') {
      sections.push(node.name);
    } else if (node.t === 'IF') {
      sections.push(...extractSections(node.then));
      if (node.else) {
        sections.push(...extractSections(node.else));
      }
    } else if (node.t === 'FOR') {
      sections.push(...extractSections(node.body));
    }
  }
  return sections;
}

/**
 * Extract progress markers from AST
 */
export function extractProgressMarkers(nodes: InterviewOrderNode[]): number[] {
  const markers: number[] = [];
  for (const node of nodes) {
    if (node.t === 'PROGRESS') {
      markers.push(node.value);
    } else if (node.t === 'IF') {
      markers.push(...extractProgressMarkers(node.then));
      if (node.else) {
        markers.push(...extractProgressMarkers(node.else));
      }
    } else if (node.t === 'FOR') {
      markers.push(...extractProgressMarkers(node.body));
    }
  }
  return markers;
}

/**
 * Create a summary string for collapsed view
 */
export function createCollapsedSummary(ast: InterviewOrderAST): string {
  const steps = countSteps(ast.nodes);
  const sections = [...new Set(extractSections(ast.nodes))];
  const progress = extractProgressMarkers(ast.nodes);
  
  let summary = `Interview Order (${steps} step${steps !== 1 ? 's' : ''})`;
  
  if (sections.length > 0) {
    summary += ` • sections: ${sections.length}`;
  }
  
  if (progress.length > 0) {
    summary += ` • progress: ${progress.join(' → ')}`;
  }
  
  return summary;
}

/**
 * Get nesting depth at a given node index
 */
export function getNestingDepth(nodes: InterviewOrderNode[], targetIndex: number): number {
  let depth = 0;
  let currentIndex = 0;

  function traverse(nodeList: InterviewOrderNode[], currentDepth: number): boolean {
    for (const node of nodeList) {
      if (currentIndex === targetIndex) {
        depth = currentDepth;
        return true;
      }
      currentIndex++;

      if (node.t === 'IF') {
        if (traverse(node.then, currentDepth + 1)) return true;
        if (node.else && traverse(node.else, currentDepth + 1)) return true;
      } else if (node.t === 'FOR') {
        if (traverse(node.body, currentDepth + 1)) return true;
      }
    }
    return false;
  }

  traverse(nodes, 0);
  return depth;
}
