import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { ChevronDown, ChevronRight, Plus, Trash2, AlertCircle, GripVertical, ChevronUp } from 'lucide-react';
import { clsx } from 'clsx';
import type { EditorBlock } from '@/state/types';
import type { InterviewOrderAST, InterviewOrderNode, Lint } from '@/utils/interviewOrderAST';
import {
  getNodeLabel,
  getNodeMeta,
  getNodeRawValue,
  getNodeBadge,
  createCollapsedSummary,
} from '@/utils/interviewOrderAST';
import {
  compileInterviewOrder,
  extractInterviewOrderAST,
} from '@/utils/interviewOrderCodegen';
import { lintInterviewOrder, getLintBadgeColor } from '@/utils/interviewOrderLinting';
import { useEditorStore } from '@/state/editorStore';
import { useDocassembleStore } from '@/state/docassembleStore';
import { fetchPlaygroundVariables } from '@/api/docassemble';
import { fetchVariables } from '@/api/client';
import { CommandPalette } from './CommandPalette';

interface InterviewOrderEditorProps {
  block: EditorBlock;
}

export function InterviewOrderEditor({ block }: InterviewOrderEditorProps): JSX.Element {
  const [expanded, setExpanded] = useState(false);
  const [ast, setAst] = useState<InterviewOrderAST | null>(null);
  const [selectedNodeIndex, setSelectedNodeIndex] = useState<number | null>(null);
  const [caretIndex, setCaretIndex] = useState(0);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const [lints, setLints] = useState<Lint[]>([]);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editValue, setEditValue] = useState('');
  const [availableVariables, setAvailableVariables] = useState<string[]>([]);
  const [loadingVariables, setLoadingVariables] = useState(false);

  const upsertBlockFromRaw = useEditorStore((state) => state.upsertBlockFromRaw);
  const yamlDocument = useEditorStore((state) => state.yamlDocument);
  const docassembleConfig = useDocassembleStore((state) => state.config);
  const selectedProject = useDocassembleStore((state) => state.selectedProject);
  const selectedFilename = useDocassembleStore((state) => state.selectedFilename);
  
  // Use a ref to track dragIndex reliably across the entire drag lifecycle
  const dragIndexRef = useRef<number | null>(null);
  const editInputRef = useRef<HTMLInputElement>(null);

  // Fetch available variables when palette opens
  useEffect(() => {
    if (!commandPaletteOpen) return;
    
    const fetchAllVariables = async () => {
      setLoadingVariables(true);
      const variableNames = new Set<string>();
      
      // Always try to fetch local variables from the YAML document
      if (yamlDocument) {
        try {
          const localResponse = await fetchVariables(yamlDocument);
          localResponse.variables.forEach(v => variableNames.add(v.name));
        } catch (error) {
          console.warn('[InterviewOrderEditor] Failed to fetch local variables:', error);
        }
      }
      
      // If connected to Docassemble, also fetch remote variables
      if (docassembleConfig && selectedProject !== undefined && selectedFilename) {
        try {
          const remoteVariables = await fetchPlaygroundVariables(docassembleConfig, selectedProject, selectedFilename);
          remoteVariables.forEach(v => variableNames.add(v.name));
        } catch (error) {
          console.warn('[InterviewOrderEditor] Failed to fetch Docassemble variables:', error);
        }
      }
      
      // Sort and update state
      setAvailableVariables(Array.from(variableNames).sort());
      setLoadingVariables(false);
    };
    
    fetchAllVariables();
  }, [commandPaletteOpen, yamlDocument, docassembleConfig, selectedProject, selectedFilename]);

  // Initialize AST from block
  useEffect(() => {
    const parsed = extractInterviewOrderAST(block.raw);
    if (parsed) {
      setAst(parsed);
      setLints(lintInterviewOrder(parsed));
    }
  }, [block.raw]);

  // Auto-save when AST changes (debounced via local state updates)
  useEffect(() => {
    if (!ast) return;
    const compiled = compileInterviewOrder(ast);
    upsertBlockFromRaw(block.id, compiled);
    setLints(lintInterviewOrder(ast));
  }, [ast, block.id, upsertBlockFromRaw]);

  // Handle expand/collapse
  const handleToggleExpand = useCallback(() => {
    setExpanded((prev) => !prev);
  }, []);

  // Handle escape key to collapse
  useEffect(() => {
    if (!expanded) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !commandPaletteOpen) {
        setExpanded(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [expanded, commandPaletteOpen]);

  // Focus edit input when editing starts
  useEffect(() => {
    if (editingIndex !== null) {
      editInputRef.current?.focus();
      editInputRef.current?.select();
    }
  }, [editingIndex]);

  // Save changes back to block
  const saveChanges = useCallback(() => {
    if (!ast) return;
    const compiled = compileInterviewOrder(ast);
    upsertBlockFromRaw(block.id, compiled);
    setLints(lintInterviewOrder(ast));
  }, [ast, block.id, upsertBlockFromRaw]);

  // Start editing a node
  const startEditing = useCallback((index: number, node: InterviewOrderNode) => {
    setEditingIndex(index);
    // Get the current value to edit
    if (node.t === 'ASK') {
      setEditValue(node.var);
    } else if (node.t === 'SECTION') {
      setEditValue(node.name);
    } else if (node.t === 'PROGRESS') {
      setEditValue(String(node.value));
    } else if (node.t === 'GATHER') {
      setEditValue(node.list);
    } else if (node.t === 'IF') {
      setEditValue(node.cond);
    } else if (node.t === 'FOR') {
      setEditValue(`${node.item} in ${node.iter}`);
    } else if (node.t === 'RUN_ONCE') {
      setEditValue(node.name);
    } else {
      setEditValue('');
    }
  }, []);

  // Save edited node
  const saveEdit = useCallback(() => {
    if (!ast || editingIndex === null) return;
    const node = ast.nodes[editingIndex];
    if (!node) return;

    const updatedNode = { ...node };
    
    // Update the node based on type
    if (updatedNode.t === 'ASK' && editValue.trim()) {
      (updatedNode as any).var = editValue.trim();
    } else if (updatedNode.t === 'SECTION' && editValue.trim()) {
      (updatedNode as any).name = editValue.trim();
    } else if (updatedNode.t === 'PROGRESS') {
      const val = parseInt(editValue, 10);
      if (!isNaN(val)) {
        (updatedNode as any).value = Math.max(0, Math.min(100, val));
      }
    } else if (updatedNode.t === 'GATHER' && editValue.trim()) {
      (updatedNode as any).list = editValue.trim();
    } else if (updatedNode.t === 'IF' && editValue.trim()) {
      (updatedNode as any).cond = editValue.trim();
    } else if (updatedNode.t === 'FOR' && editValue.trim()) {
      const match = editValue.match(/^(\w+)\s+in\s+(.+)$/);
      if (match) {
        (updatedNode as any).item = match[1];
        (updatedNode as any).iter = match[2].trim();
      }
    } else if (updatedNode.t === 'RUN_ONCE' && editValue.trim()) {
      (updatedNode as any).name = editValue.trim();
    }
    
    const newNodes = [...ast.nodes];
    newNodes[editingIndex] = updatedNode;
    setAst({ ...ast, nodes: newNodes });
    setEditingIndex(null);
    setEditValue('');
  }, [ast, editingIndex, editValue]);

  // Cancel editing
  const cancelEdit = useCallback(() => {
    setEditingIndex(null);
    setEditValue('');
  }, []);

  // Handle edit input keydown
  const handleEditKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      saveEdit();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      cancelEdit();
    }
  }, [saveEdit, cancelEdit]);

  // Handle node deletion
  const handleDeleteNode = useCallback((index: number) => {
    if (!ast) return;
    const newNodes = [...ast.nodes];
    newNodes.splice(index, 1);
    setAst({ ...ast, nodes: newNodes });
    setSelectedNodeIndex(null);
  }, [ast]);

  // Move a node up or down
  const moveNode = useCallback((index: number, direction: 'up' | 'down') => {
    if (!ast) return;
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= ast.nodes.length) return;
    
    const newNodes = [...ast.nodes];
    const [movedNode] = newNodes.splice(index, 1);
    newNodes.splice(targetIndex, 0, movedNode);
    setAst({ ...ast, nodes: newNodes });
    setSelectedNodeIndex(targetIndex);
  }, [ast]);

  // Handle node insertion
  const handleInsertNode = useCallback((node: InterviewOrderNode) => {
    if (!ast) return;
    const newNodes = [...ast.nodes];
    newNodes.splice(caretIndex, 0, node);
    setAst({ ...ast, nodes: newNodes });
    setCaretIndex(caretIndex + 1);
  }, [ast, caretIndex]);

  // Handle drag and drop reordering
  const handleDragStart = useCallback((e: React.DragEvent, index: number) => {
    console.log('[DragStart]', index);
    e.dataTransfer.effectAllowed = 'move';
    try {
      e.dataTransfer.setData('text/plain', String(index));
    } catch (err) {
      console.error('setData failed', err);
    }
    dragIndexRef.current = index;
    setDragIndex(index);
  }, []);

  const handleDragEnd = useCallback((e: React.DragEvent) => {
    console.log('[DragEnd]');
    dragIndexRef.current = null;
    setDragIndex(null);
    setHoverIndex(null);
  }, []);

  const handleChipDragOver = useCallback((e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setHoverIndex(index);
  }, []);

  const handleChipDrop = useCallback((e: React.DragEvent, targetIndex: number) => {
    const sourceIndex = dragIndexRef.current;
    console.log('[Drop]', 'dragIndexRef.current:', sourceIndex, 'targetIndex:', targetIndex);
    e.preventDefault();
    e.stopPropagation();
    
    if (!ast || sourceIndex === null || sourceIndex === targetIndex) {
      console.log('[Drop] early exit: no ast or same index');
      dragIndexRef.current = null;
      setDragIndex(null);
      setHoverIndex(null);
      return;
    }

    // Remove dragged node and insert before target
    const newNodes = [...ast.nodes];
    const [moved] = newNodes.splice(sourceIndex, 1);
    
    // Adjust target index if we removed from before it
    const adjustedTarget = sourceIndex < targetIndex ? targetIndex - 1 : targetIndex;
    console.log('[Drop] moved from', sourceIndex, 'to adjusted target', adjustedTarget);
    newNodes.splice(adjustedTarget, 0, moved);
    
    setAst({ ...ast, nodes: newNodes });
    dragIndexRef.current = null;
    setDragIndex(null);
    setHoverIndex(null);
    setSelectedNodeIndex(null);
  }, [ast]);

  // Render a single chip
  const renderChip = useCallback((node: InterviewOrderNode, index: number) => {
    const badge = getNodeBadge(node);
    const isSelected = selectedNodeIndex === index;
    const nodeLints = lints.filter(l => l.index === index);
    const hasLints = nodeLints.length > 0;
    const highestLintLevel = hasLints 
      ? nodeLints.reduce((highest, l) => l.level === 'error' ? 'error' : highest === 'error' ? 'error' : l.level === 'warn' ? 'warn' : highest, 'info' as 'info' | 'warn' | 'error')
      : null;

    const badgeColors: Record<typeof badge, string> = {
      idempotent: 'bg-green-500/20 text-green-400',
      flow: 'bg-blue-500/20 text-blue-400',
      'one-time': 'bg-amber-500/20 text-amber-400',
      safe: 'bg-gray-500/20 text-gray-400',
      effectful: 'bg-red-500/20 text-red-400',
    };

    return (
      <div
        key={index}
        draggable
        onDragStart={(e) => handleDragStart(e, index)}
        onDragEnd={handleDragEnd}
        onDragOver={(e) => {
          handleChipDragOver(e, index);
        }}
        onDrop={(e) => {
          console.log('[onDrop fired on chip container]', index);
          handleChipDrop(e, index);
        }}
        onDragLeave={(e) => {
          // Only clear hover if we're leaving the chip entirely (not moving to a child)
          if (e.currentTarget === e.target) {
            console.log('[onDragLeave]', index);
            setHoverIndex(null);
          }
        }}
        className={clsx(
          'group relative flex items-center justify-between gap-3 rounded-xl border p-2 transition-all cursor-grab',
          isSelected
            ? 'border-primary bg-surface shadow-lg'
            : 'border-border bg-muted hover:border-primary/60 hover:bg-primary/5',
          dragIndex === index && 'opacity-50 cursor-grabbing',
          hoverIndex === index && dragIndex !== null && 'ring-2 ring-primary/50 bg-primary/5',
        )}
        onClick={() => setSelectedNodeIndex(index)}
        role="button"
        tabIndex={0}
      >
        {/* Grab handle: draggable only on this element to avoid accidental drags */}
        <div className="pr-2 flex items-center">
          <div
            className="p-2 rounded hover:bg-muted/50 cursor-grab pointer-events-auto"
            role="button"
            aria-label="Drag to reorder"
            onMouseDown={(ev) => ev.stopPropagation()}
          >
            <GripVertical className="h-5 w-5 text-text-muted" />
          </div>
        </div>
        <div className="flex-1 min-w-0">
          {editingIndex === index ? (
            // Inline edit mode
            <input
              ref={editInputRef}
              autoFocus
              type="text"
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onKeyDown={handleEditKeyDown}
              onBlur={saveEdit}
              onClick={(e) => e.stopPropagation()}
              className="w-full px-2 py-1 text-sm font-mono bg-primary/20 border border-primary rounded text-text-primary outline-none"
              placeholder="Enter value..."
            />
          ) : (
            <div className="flex items-center gap-2 cursor-text" onDoubleClick={() => startEditing(index, node)}>
              <p className="text-base font-semibold text-text-primary truncate pointer-events-none">
                {(() => {
                  const label = getNodeLabel(node);
                  const raw = getNodeRawValue(node);
                  // Compact single-line for simple nodes that have an underlying value
                  if (['ASK', 'GATHER', 'RUN_ONCE', 'SECTION'].includes(node.t)) {
                    const prefix = label.split(':')[0];
                    return (
                      <>
                        {prefix}:
                        <span className="ml-2 font-mono text-sm text-text-primary truncate">{raw}</span>
                      </>
                    );
                  }
                  // Default: show fuller label (already includes key info)
                  return label;
                })()}
              </p>
              {hasLints && highestLintLevel && (
                <span
                  className={clsx(
                    'rounded-full px-2 py-0.5 text-[0.65rem] font-medium pointer-events-none',
                    highestLintLevel === 'error' && 'bg-red-500/20 text-red-400',
                    highestLintLevel === 'warn' && 'bg-amber-500/20 text-amber-400',
                    highestLintLevel === 'info' && 'bg-blue-500/20 text-blue-400',
                  )}
                >
                  <AlertCircle className="inline h-3 w-3 mr-1" />
                  {nodeLints.length}
                </span>
              )}
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          {/* Do not render the idempotent badge (we hide it for a cleaner visual editor) */}
          {badge !== 'idempotent' && (
            <span
              className={clsx(
                'rounded-full px-2 py-0.5 text-[0.65rem] font-medium uppercase tracking-wide pointer-events-auto',
                badgeColors[badge],
              )}
            >
              {badge}
            </span>
          )}
          {/* Move up/down arrows (shown on hover) */}
          <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
            {index > 0 && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  moveNode(index, 'up');
                }}
                className="p-1 rounded hover:bg-muted pointer-events-auto"
                aria-label="Move up"
                title="Move up"
              >
                <ChevronUp className="h-3.5 w-3.5 text-text-muted" />
              </button>
            )}
            {index < (ast?.nodes.length ?? 0) - 1 && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  moveNode(index, 'down');
                }}
                className="p-1 rounded hover:bg-muted pointer-events-auto"
                aria-label="Move down"
                title="Move down"
              >
                <ChevronDown className="h-3.5 w-3.5 text-text-muted" />
              </button>
            )}
          </div>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleDeleteNode(index);
            }}
            className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-muted pointer-events-auto"
            aria-label="Delete node"
          >
            <Trash2 className="h-3.5 w-3.5 text-text-muted" />
          </button>
        </div>
      </div>
    );
  }, [selectedNodeIndex, lints, ast, handleDeleteNode, moveNode, editingIndex, editValue, startEditing, handleEditKeyDown, saveEdit]);

  // Collapsed view
  if (!expanded) {
    const summary = ast ? createCollapsedSummary(ast) : 'Interview Order (loading...)';
    
    return (
      <div
        className="flex items-center justify-between gap-3 rounded-xl border border-border bg-surface p-4 cursor-pointer hover:border-primary/60 transition-colors"
        onClick={handleToggleExpand}
        role="button"
        tabIndex={0}
      >
        <div className="flex items-center gap-3">
          <ChevronRight className="h-5 w-5 text-text-muted" />
          <div>
            <p className="text-sm font-semibold text-text-primary">{summary}</p>
            <p className="text-xs text-text-muted mt-0.5">
              {ast ? 'Click "Insert" to add steps' : 'Click to expand and view code'}
            </p>
          </div>
        </div>
        <span className="text-xs text-text-muted">Click to edit</span>
      </div>
    );
  }

  // If expanded but no AST, show error state
  if (!ast) {
    return (
      <div className="relative rounded-xl border border-red-500/50 bg-surface p-6 shadow-card">
        <div className="flex items-center justify-between mb-6 pb-4 border-b border-border">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleToggleExpand}
              className="p-1 rounded hover:bg-muted transition-colors"
              aria-label="Collapse"
            >
              <ChevronDown className="h-5 w-5 text-text-muted" />
            </button>
            <h3 className="text-lg font-semibold text-text-primary">
              Interview Order (Parse Error)
            </h3>
          </div>
          <button
            type="button"
            onClick={handleToggleExpand}
            className="px-4 py-2 rounded-lg border border-border text-text-primary text-sm font-medium hover:bg-muted transition-colors"
          >
            Close
          </button>
        </div>
        <div className="text-center py-8">
          <AlertCircle className="h-12 w-12 text-red-400 mx-auto mb-4" />
          <p className="text-text-primary mb-2">Failed to parse interview order block</p>
          <p className="text-sm text-text-muted mb-4">The block structure may be invalid or missing required fields.</p>
          <pre className="text-left text-xs bg-muted/30 p-4 rounded-lg overflow-auto max-h-60">
            {block.raw}
          </pre>
        </div>
      </div>
    );
  }

  // Expanded view
  return (
    <div className="relative rounded-xl border border-primary bg-surface p-6 shadow-soft">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 pb-4 border-b border-border">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleToggleExpand}
            className="p-1 rounded hover:bg-muted transition-colors"
            aria-label="Collapse"
          >
            <ChevronDown className="h-5 w-5 text-text-muted" />
          </button>
          <h3 className="text-lg font-semibold text-text-primary">
            {ast ? createCollapsedSummary(ast) : 'Interview Order'}
          </h3>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={saveChanges}
            className="px-4 py-2 rounded-lg bg-primary text-white text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            Save Changes
          </button>
          <button
            type="button"
            onClick={handleToggleExpand}
            className="px-4 py-2 rounded-lg border border-border text-text-primary text-sm font-medium hover:bg-muted transition-colors"
          >
            Done
          </button>
        </div>
      </div>

      {/* Timeline */}
  <div className="space-y-2 mb-4">
        {/* Insert bar at top — subtle center-aligned dotted line with centered label */}
        <button
          type="button"
          onClick={() => {
            setCaretIndex(0);
            setCommandPaletteOpen(true);
          }}
          aria-label="Insert"
          className="w-full py-1 flex items-center justify-center transition-colors group relative"
        >
          {/* line */}
          <div
            className={clsx(
              'absolute left-6 right-6 top-1/2 -translate-y-1/2 pointer-events-none transition-all duration-150',
              caretIndex === 0
                ? 'border-t-2 border-primary'
                : 'border-t border-dotted border-border group-hover:border-primary',
            )}
          />
          {/* centered label */}
          <span
            className={clsx(
              'relative px-2 text-xs rounded bg-surface',
              caretIndex === 0 ? 'text-primary font-semibold' : 'text-text-muted',
            )}
          >
            Insert
          </span>
        </button>

        {ast?.nodes.length === 0 ? (
          <div className="text-center py-8 text-text-muted">
            <p className="text-sm mb-2">No steps in this interview order</p>
            <p className="text-xs">Click "Insert" to add steps</p>
          </div>
        ) : (
          ast?.nodes.map((node, index) => (
            <div key={index}>
              {/* Insertion indicator before hovered chip */}
              {dragIndex !== null && hoverIndex === index && (
                <div className="flex items-center justify-center mb-2">
                  <div className="w-full h-1 rounded bg-primary transition-all" />
                </div>
              )}
              {renderChip(node, index)}

              {/* Insert bar after each chip — subtle center-aligned dotted line (compact) */}
              <button
                type="button"
                onClick={() => {
                  setCaretIndex(index + 1);
                  setCommandPaletteOpen(true);
                }}
                aria-label={`Insert after ${index}`}
                className="w-full py-1 flex items-center justify-center mt-2 transition-colors group relative"
              >
                <div
                  className={clsx(
                    'absolute left-6 right-6 top-1/2 -translate-y-1/2 pointer-events-none transition-all duration-150',
                    caretIndex === index + 1
                      ? 'border-t-2 border-primary'
                      : 'border-t border-dotted border-border group-hover:border-primary',
                  )}
                />
                <span
                  className={clsx(
                    'relative px-2 text-xs rounded bg-surface',
                    caretIndex === index + 1 ? 'text-primary font-semibold' : 'text-text-muted',
                  )}
                >
                  Insert
                </span>
              </button>
            </div>
          ))
        )}
        {/* Final drop zone to append to the end */}
        {dragIndex !== null && (
          <div
            onDragOver={(e) => {
              e.preventDefault();
              e.dataTransfer.dropEffect = 'move';
              setHoverIndex(ast?.nodes.length ?? 0);
            }}
            onDrop={(e) => {
              e.preventDefault();
              console.log('[onDrop fired on end zone]');
              handleChipDrop(e, ast?.nodes.length ?? 0);
            }}
            onDragLeave={() => {
              setHoverIndex(null);
            }}
            className="flex items-center justify-center py-4"
          >
            <div className={clsx(
              'w-full h-1 rounded transition-all',
              hoverIndex === (ast?.nodes.length ?? 0) ? 'bg-primary' : 'bg-primary/20'
            )} />
          </div>
        )}
      </div>

      {/* Lints panel */}
      {lints.length > 0 && (
        <div className="mt-6 pt-4 border-t border-border">
          <h4 className="text-sm font-semibold text-text-primary mb-3">Issues & Suggestions</h4>
          <div className="space-y-2">
            {lints.map((lint, i) => (
              <div
                key={i}
                className={clsx(
                  'flex items-start gap-2 p-3 rounded-lg text-xs',
                  lint.level === 'error' && 'bg-red-500/10 text-red-400',
                  lint.level === 'warn' && 'bg-amber-500/10 text-amber-400',
                  lint.level === 'info' && 'bg-blue-500/10 text-blue-400',
                )}
              >
                <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p>{lint.message}</p>
                  {lint.fix && (
                    <button
                      type="button"
                      onClick={lint.fix}
                      className="mt-1 text-xs underline hover:no-underline"
                    >
                      Apply fix
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Hint */}
      <p className="mt-6 text-xs text-text-muted text-center">
        Click <kbd className="px-2 py-1 rounded bg-muted">Insert</kbd> to add steps
      </p>
      
      {/* Command Palette */}
      <CommandPalette
        isOpen={commandPaletteOpen}
        onClose={() => setCommandPaletteOpen(false)}
        onInsert={handleInsertNode}
        availableVariables={availableVariables}
      />
    </div>
  );
}
