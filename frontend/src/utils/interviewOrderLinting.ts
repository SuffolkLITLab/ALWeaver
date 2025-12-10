/**
 * Interview Order Linting and Validation
 * 
 * Provides idempotency checks and guardrails for interview order blocks
 */

import type { InterviewOrderAST, InterviewOrderNode, Lint } from './interviewOrderAST';
import { getNestingDepth, extractProgressMarkers, extractSections } from './interviewOrderAST';

// Configurable list of effectful function names
const EFFECTFUL_FUNCTIONS = [
  'send_email',
  'send_sms',
  'log_action',
  'create_record',
  'update_database',
  'delete_file',
  'process_payment',
  'submit_form',
];

/**
 * Check if a function call is effectful (has side effects)
 */
function isEffectful(code: string): boolean {
  return EFFECTFUL_FUNCTIONS.some(func => code.includes(func));
}

/**
 * Check if a node contains effectful operations
 */
function nodeIsEffectful(node: InterviewOrderNode): boolean {
  switch (node.t) {
    case 'ASK':
      return isEffectful(node.var);
    case 'RUN_ONCE':
      return isEffectful(node.name);
    case 'STORE_SNAPSHOT':
      return true; // Always effectful
    case 'IF':
      return node.then.some(nodeIsEffectful) || (node.else?.some(nodeIsEffectful) ?? false);
    case 'FOR':
      return node.body.some(nodeIsEffectful);
    default:
      return false;
  }
}

/**
 * Lint progress markers for sanity
 */
function lintProgress(nodes: InterviewOrderNode[]): Lint[] {
  const lints: Lint[] = [];
  const markers = extractProgressMarkers(nodes);
  
  // Check for regressions
  for (let i = 1; i < markers.length; i++) {
    if (markers[i] < markers[i - 1]) {
      lints.push({
        level: 'warn',
        index: -1, // Would need to track actual node index
        message: `Progress regression detected: ${markers[i - 1]}% → ${markers[i]}%`,
      });
    }
  }
  
  // Check for too many markers
  if (markers.length > 10) {
    lints.push({
      level: 'warn',
      index: -1,
      message: `Too many progress markers (${markers.length}). Consider reducing for clarity.`,
    });
  }
  
  // Check for values outside bounds
  for (const marker of markers) {
    if (marker < 0 || marker > 100) {
      lints.push({
        level: 'error',
        index: -1,
        message: `Progress value ${marker}% is outside valid range [0, 100]`,
      });
    }
  }
  
  return lints;
}

/**
 * Lint for redundant sections
 */
function lintSections(nodes: InterviewOrderNode[]): Lint[] {
  const lints: Lint[] = [];
  let lastSection: string | null = null;
  
  function checkNode(node: InterviewOrderNode, index: number) {
    if (node.t === 'SECTION') {
      if (node.name === lastSection) {
        lints.push({
          level: 'warn',
          index,
          message: `Redundant section: "${node.name}" was already set`,
        });
      }
      lastSection = node.name;
    }
  }
  
  nodes.forEach(checkNode);
  return lints;
}

/**
 * Lint nesting depth
 */
function lintNesting(ast: InterviewOrderAST): Lint[] {
  const lints: Lint[] = [];
  
  function traverse(nodeList: InterviewOrderNode[], depth: number, index: number): number {
    let currentIndex = index;
    for (const node of nodeList) {
      if (depth > 1) {
        lints.push({
          level: 'warn',
          index: currentIndex,
          message: `Deep nesting (level ${depth + 1}). Consider flattening conditions.`,
        });
      }
      
      currentIndex++;
      
      if (node.t === 'IF') {
        currentIndex = traverse(node.then, depth + 1, currentIndex);
        if (node.else) {
          currentIndex = traverse(node.else, depth + 1, currentIndex);
        }
      } else if (node.t === 'FOR') {
        currentIndex = traverse(node.body, depth + 1, currentIndex);
      }
    }
    return currentIndex;
  }
  
  traverse(ast.nodes, 0, 0);
  return lints;
}

/**
 * Lint for effectful operations that should be run-once
 */
function lintEffectful(nodes: InterviewOrderNode[]): Lint[] {
  const lints: Lint[] = [];
  
  function checkNodes(nodeList: InterviewOrderNode[], index: number): number {
    let currentIndex = index;
    for (const node of nodeList) {
      if (node.t === 'ASK' && isEffectful(node.var) && !node.var.includes('ran_')) {
        lints.push({
          level: 'warn',
          index: currentIndex,
          message: `Potentially effectful operation "${node.var}". Consider using RUN_ONCE.`,
          fix: () => {
            // Convert to RUN_ONCE (would need callback to modify AST)
          },
        });
      }
      
      currentIndex++;
      
      if (node.t === 'IF') {
        currentIndex = checkNodes(node.then, currentIndex);
        if (node.else) {
          currentIndex = checkNodes(node.else, currentIndex);
        }
      } else if (node.t === 'FOR') {
        currentIndex = checkNodes(node.body, currentIndex);
      }
    }
    return currentIndex;
  }
  
  checkNodes(nodes, 0);
  return lints;
}

/**
 * Lint for empty IF/FOR bodies
 */
function lintEmptyBlocks(nodes: InterviewOrderNode[]): Lint[] {
  const lints: Lint[] = [];
  
  function checkNodes(nodeList: InterviewOrderNode[], index: number): number {
    let currentIndex = index;
    for (const node of nodeList) {
      if (node.t === 'IF' && node.then.length === 0) {
        lints.push({
          level: 'info',
          index: currentIndex,
          message: 'Empty IF block. Consider adding content or removing.',
        });
      }
      
      if (node.t === 'FOR' && node.body.length === 0) {
        lints.push({
          level: 'info',
          index: currentIndex,
          message: 'Empty FOR loop. Consider adding content or removing.',
        });
      }
      
      currentIndex++;
      
      if (node.t === 'IF') {
        currentIndex = checkNodes(node.then, currentIndex);
        if (node.else) {
          currentIndex = checkNodes(node.else, currentIndex);
        }
      } else if (node.t === 'FOR') {
        currentIndex = checkNodes(node.body, currentIndex);
      }
    }
    return currentIndex;
  }
  
  checkNodes(nodes, 0);
  return lints;
}

/**
 * Lint for RUN_ONCE without explicit flag
 */
function lintRunOnceFlags(nodes: InterviewOrderNode[]): Lint[] {
  const lints: Lint[] = [];
  
  function checkNodes(nodeList: InterviewOrderNode[], index: number): number {
    let currentIndex = index;
    for (const node of nodeList) {
      if (node.t === 'RUN_ONCE' && !node.flag) {
        lints.push({
          level: 'info',
          index: currentIndex,
          message: `Using default flag "ran_${node.name}". Explicitly set if needed.`,
        });
      }
      
      currentIndex++;
      
      if (node.t === 'IF') {
        currentIndex = checkNodes(node.then, currentIndex);
        if (node.else) {
          currentIndex = checkNodes(node.else, currentIndex);
        }
      } else if (node.t === 'FOR') {
        currentIndex = checkNodes(node.body, currentIndex);
      }
    }
    return currentIndex;
  }
  
  checkNodes(nodes, 0);
  return lints;
}

/**
 * Main linting function
 */
export function lintInterviewOrder(ast: InterviewOrderAST): Lint[] {
  const allLints: Lint[] = [];
  
  // Run all lint checks
  allLints.push(...lintProgress(ast.nodes));
  allLints.push(...lintSections(ast.nodes));
  allLints.push(...lintNesting(ast));
  allLints.push(...lintEffectful(ast.nodes));
  allLints.push(...lintEmptyBlocks(ast.nodes));
  allLints.push(...lintRunOnceFlags(ast.nodes));
  
  return allLints;
}

/**
 * Get lint badge color
 */
export function getLintBadgeColor(level: 'info' | 'warn' | 'error'): string {
  switch (level) {
    case 'info':
      return 'blue';
    case 'warn':
      return 'amber';
    case 'error':
      return 'red';
    default:
      return 'gray';
  }
}
