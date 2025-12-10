/**
 * Interview Order Code Generation
 * 
 * Converts AST to Python code blocks for Docassemble
 */

import type { InterviewOrderAST, InterviewOrderNode } from './interviewOrderAST';
import { getDefaultFlag } from './interviewOrderAST';

/**
 * Format a Python value for code generation
 * Handles strings, numbers, booleans, and special cases like showifdef()
 */
function formatPyValue(value: unknown): string {
  if (typeof value === 'string') {
    // Don't double-quote raw expressions like showifdef("users[0].address.zip")
    if (value.startsWith('showifdef(') || value.startsWith('defined(')) {
      return value;
    }
    // Escape quotes and wrap in quotes
    return `"${value.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
  }
  if (typeof value === 'number') {
    return String(value);
  }
  if (typeof value === 'boolean') {
    return value ? 'True' : 'False';
  }
  if (value === null || value === undefined) {
    return 'None';
  }
  if (Array.isArray(value)) {
    return `[${value.map(formatPyValue).join(', ')}]`;
  }
  if (typeof value === 'object') {
    const entries = Object.entries(value).map(
      ([k, v]) => `"${k}": ${formatPyValue(v)}`
    );
    return `{${entries.join(', ')}}`;
  }
  return 'None';
}

/**
 * Emit a line with proper indentation
 */
function emit(line: string, indent: number): string {
  return ' '.repeat(indent) + line;
}

/**
 * Walk through nodes and generate Python code
 */
function walk(nodes: InterviewOrderNode[], indent: number): string[] {
  const lines: string[] = [];

  for (const node of nodes) {
    switch (node.t) {
      case 'ASK':
        lines.push(emit(node.var, indent));
        break;

      case 'SECTION':
        lines.push(emit(`nav.set_section("${node.name}")`, indent));
        break;

      case 'PROGRESS':
        lines.push(emit(`set_progress(${Math.round(node.value)})`, indent));
        break;

      case 'GATHER':
        lines.push(emit(`${node.list}.gather()`, indent));
        break;

      case 'IF':
        lines.push(emit(`if ${node.cond}:`, indent));
        if (node.then.length > 0) {
          lines.push(...walk(node.then, indent + 2));
        } else {
          lines.push(emit('pass', indent + 2));
        }
        if (node.else && node.else.length > 0) {
          lines.push(emit('else:', indent));
          lines.push(...walk(node.else, indent + 2));
        }
        break;

      case 'FOR':
        lines.push(emit(`for ${node.item} in ${node.iter}:`, indent));
        if (node.body.length > 0) {
          lines.push(...walk(node.body, indent + 2));
        } else {
          lines.push(emit('pass', indent + 2));
        }
        break;

      case 'RUN_ONCE': {
        const flag = node.flag ?? getDefaultFlag(node.name);
        lines.push(emit(`if not defined("${flag}") or not ${flag}:`, indent));
        lines.push(emit(node.name, indent + 2));
        lines.push(emit(`${flag} = True`, indent + 2));
        break;
      }

      case 'STORE_SNAPSHOT': {
        lines.push(emit('store_variables_snapshot(', indent));
        lines.push(emit(`persistent=${node.args.persistent ? 'True' : 'False'},`, indent + 2));
        
        const dataEntries = Object.entries(node.args.data);
        if (dataEntries.length > 0) {
          lines.push(emit('data={', indent + 2));
          for (const [key, value] of dataEntries) {
            lines.push(emit(`"${key}": ${formatPyValue(value)},`, indent + 4));
          }
          lines.push(emit('},', indent + 2));
        } else {
          lines.push(emit('data={},', indent + 2));
        }
        
        lines.push(emit(')', indent));
        break;
      }

      default:
        // Unknown node type, skip
        break;
    }
  }

  return lines;
}

/**
 * Compile an InterviewOrderAST to Python code
 */
export function compileInterviewOrder(ast: InterviewOrderAST): string {
  const lines: string[] = [];

  // Header comment
  lines.push('#################### Interview order #####################');
  
  // Metadata
  lines.push(`id: ${ast.id}`);
  lines.push('mandatory: True');
  lines.push('code: |');

  // Body (starting at indent 2)
  const bodyLines = walk(ast.nodes, 2);
  
  // If empty body, add a pass statement
  if (bodyLines.length === 0) {
    lines.push('  pass');
  } else {
    lines.push(...bodyLines);
  }

  return lines.join('\n');
}

/**
 * Parse Python code back into AST nodes (best effort)
 * This is used when reading existing interview order blocks
 */
export function parseInterviewOrderCode(code: string): InterviewOrderNode[] {
  const nodes: InterviewOrderNode[] = [];
  const lines = code.split('\n').map(line => line.trimEnd());
  
  // Detect the base indentation by finding the first non-empty, non-comment line
  let baseIndent = 0;
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const match = line.match(/^(\s*)/);
      baseIndent = match ? match[1].length : 0;
      break;
    }
  }
  
  console.log('[parseInterviewOrderCode] Detected base indent:', baseIndent);
  console.log('[parseInterviewOrderCode] First few lines:', lines.slice(0, 5));
  
  let i = 0;
  
  function getIndent(line: string): number {
    const match = line.match(/^(\s*)/);
    return match ? match[1].length : 0;
  }
  
  function parseBlock(targetIndent: number): InterviewOrderNode[] {
    const blockNodes: InterviewOrderNode[] = [];
    
    while (i < lines.length) {
      const line = lines[i];
      const indent = getIndent(line);
      const trimmed = line.trim();
      
      // Skip empty lines and comments
      if (!trimmed || trimmed.startsWith('#')) {
        i++;
        continue;
      }
      
      // If we've dedented below target, exit this block
      if (indent < targetIndent) {
        break;
      }
      
      // Only process lines at our target indent level
      if (indent > targetIndent) {
        i++;
        continue;
      }
      
      // Parse different node types
      if (trimmed.startsWith('nav.set_section(')) {
        const match = trimmed.match(/nav\.set_section\(["'](.+?)["']\)/);
        if (match) {
          blockNodes.push({ t: 'SECTION', name: match[1] });
        }
        i++;
      } else if (trimmed.startsWith('set_progress(')) {
        const match = trimmed.match(/set_progress\((\d+(?:\.\d+)?)\)/);
        if (match) {
          blockNodes.push({ t: 'PROGRESS', value: parseFloat(match[1]) });
        }
        i++;
      } else if (trimmed.includes('.gather()')) {
        const match = trimmed.match(/^(\w+(?:\.\w+)*)\.gather\(\)/);
        if (match) {
          blockNodes.push({ t: 'GATHER', list: match[1] });
        }
        i++;
      } else if (trimmed.startsWith('if ')) {
        const condMatch = trimmed.match(/^if (.+):$/);
        if (condMatch) {
          const cond = condMatch[1];
          i++;
          
          // Check if this is a RUN_ONCE pattern
          if (cond.includes('not defined(') && cond.includes('or not ')) {
            // Parse run-once block
            const flagMatch = cond.match(/not defined\(["'](.+?)["']\) or not (\w+)/);
            if (flagMatch) {
              const flag = flagMatch[2];
              const bodyStart = i;
              
              // Find the function name and skip to flag assignment
              let funcName = '';
              while (i < lines.length && getIndent(lines[i]) > indent) {
                const bodyLine = lines[i].trim();
                if (!bodyLine.includes('= True') && !bodyLine.startsWith('#')) {
                  funcName = bodyLine;
                }
                i++;
              }
              
              if (funcName) {
                blockNodes.push({ t: 'RUN_ONCE', name: funcName, flag });
              }
            }
          } else {
            // Regular IF statement
            const thenNodes = parseBlock(indent + 2);
            let elseNodes: InterviewOrderNode[] | undefined;
            
            // Check for else clause
            if (i < lines.length && lines[i].trim() === 'else:') {
              i++;
              elseNodes = parseBlock(indent + 2);
            }
            
            blockNodes.push({ t: 'IF', cond, then: thenNodes, else: elseNodes });
          }
        } else {
          i++;
        }
      } else if (trimmed.startsWith('for ')) {
        const forMatch = trimmed.match(/^for (\w+) in (.+):$/);
        if (forMatch) {
          const [, item, iter] = forMatch;
          i++;
          const body = parseBlock(indent + 2);
          blockNodes.push({ t: 'FOR', item, iter, body });
        } else {
          i++;
        }
      } else if (trimmed.startsWith('store_variables_snapshot(')) {
        // Parse store snapshot (simplified - just detect it)
        blockNodes.push({
          t: 'STORE_SNAPSHOT',
          args: { persistent: true, data: {} }
        });
        // Skip until closing paren
        while (i < lines.length && !lines[i].trim().endsWith(')')) {
          i++;
        }
        i++;
      } else {
        // Assume it's an ASK (variable reference)
        blockNodes.push({ t: 'ASK', var: trimmed });
        i++;
      }
    }
    
    return blockNodes;
  }
  
  return parseBlock(baseIndent);
}

/**
 * Extract InterviewOrderAST from a full YAML block string
 */
export function extractInterviewOrderAST(blockRaw: string): InterviewOrderAST | null {
  try {
    // Extract the id
    const idMatch = blockRaw.match(/^id:\s*(.+)$/m);
    const id = idMatch ? idMatch[1].trim() : 'interview_order_main';
    
    // Extract the code section - handle both "code: |" and "code:" formats
    // Look for code: followed by | or newline, then capture everything until we hit a non-indented line or end
    const codeMatch = blockRaw.match(/^code:\s*\|?\s*\n((?:[ \t]+.+\n?)*)/m);
    if (!codeMatch) {
      // Try a more lenient pattern
      const altMatch = blockRaw.match(/code:\s*\|?\s*\n([\s\S]*?)(?=\n\S|$)/);
      if (!altMatch) {
        console.warn('[extractInterviewOrderAST] No code match found');
        console.log('[extractInterviewOrderAST] blockRaw:', blockRaw);
        return null;
      }
      const code = altMatch[1];
      console.log('[extractInterviewOrderAST] Using alt match, code:', code);
      const nodes = parseInterviewOrderCode(code);
      console.log('[extractInterviewOrderAST] Parsed nodes:', nodes);
      return {
        id,
        mandatory: true,
        nodes
      };
    }
    
    const code = codeMatch[1];
    console.log('[extractInterviewOrderAST] Using primary match, code:', code);
    const nodes = parseInterviewOrderCode(code);
    console.log('[extractInterviewOrderAST] Parsed nodes:', nodes);
    
    return {
      id,
      mandatory: true,
      nodes
    };
  } catch (error) {
    console.error('Failed to parse interview order:', error);
    return null;
  }
}

/**
 * Check if a code block matches interview order patterns
 */
export function isInterviewOrderBlock(blockRaw: string, blockId: string, label?: string | null): boolean {
  // Check id patterns
  if (blockId.includes('interview_order') || blockId.includes('main_order')) {
    return true;
  }
  
  // Check for special YAML comment pattern (before code: | line)
  // This is the primary detection method
  if (/#+\s*interview\s+order\s*#+/i.test(blockRaw)) {
    return true;
  }
  
  // Check label pattern - look for "interview order" or "main order" with # markers
  if (label) {
    if (/#+\s*(interview\s+order|main\s+order)\s*#+/i.test(label)) {
      return true;
    }
    // Also check for label that contains "Interview Order" (from backend)
    if (/interview\s+order/i.test(label)) {
      return true;
    }
  }
  
  return false;
}
