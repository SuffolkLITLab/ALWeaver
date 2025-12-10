import { useState, useEffect, useRef, useCallback } from 'react';
import { clsx } from 'clsx';
import { Search, ArrowUp, ArrowDown, Loader2 } from 'lucide-react';
import type { InterviewOrderNode } from '@/utils/interviewOrderAST';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onInsert: (node: InterviewOrderNode) => void;
  suggestions?: CommandSuggestion[];
  availableVariables?: string[];
  loadingVariables?: boolean;
}

export interface CommandSuggestion {
  type: 'variable' | 'section' | 'list' | 'snippet';
  label: string;
  value: string;
  description?: string;
}

/**
 * Parse freeform command text into nodes
 */
function parseCommand(text: string): InterviewOrderNode | null {
  const trimmed = text.trim().toLowerCase();
  const originalText = text.trim();
  
  // ask <var>
  if (trimmed.startsWith('ask ')) {
    const varName = originalText.substring(4).trim();
    if (varName) {
      return { t: 'ASK', var: varName };
    }
  }
  if (trimmed === 'ask') {
    return { t: 'ASK', var: 'response' }; // Default variable name
  }
  
  // section <name>
  if (trimmed.startsWith('section ')) {
    const sectionName = originalText.substring(8).trim();
    if (sectionName) {
      return { t: 'SECTION', name: sectionName };
    }
  }
  if (trimmed === 'section') {
    return { t: 'SECTION', name: 'Section' }; // Default name
  }
  
  // progress <0-100>
  if (trimmed.startsWith('progress ')) {
    const valueStr = originalText.substring(9).trim();
    const value = parseInt(valueStr, 10);
    if (!isNaN(value)) {
      return { t: 'PROGRESS', value: Math.max(0, Math.min(100, value)) };
    }
  }
  if (trimmed === 'progress') {
    return { t: 'PROGRESS', value: 50 }; // Default: 50%
  }
  
  // gather <list>
  if (trimmed.startsWith('gather ')) {
    const listName = originalText.substring(7).trim();
    if (listName) {
      return { t: 'GATHER', list: listName };
    }
  }
  if (trimmed === 'gather') {
    return { t: 'GATHER', list: 'items' }; // Default list name
  }
  
  // if <expression>
  if (trimmed.startsWith('if ')) {
    const condition = originalText.substring(3).trim();
    if (condition) {
      return { t: 'IF', cond: condition, then: [] };
    }
  }
  if (trimmed === 'if') {
    return { t: 'IF', cond: 'condition', then: [] }; // Default condition
  }
  
  // for <item> in <iter>
  if (trimmed.startsWith('for ')) {
    const match = originalText.match(/^for\s+(\w+)\s+in\s+(.+)$/i);
    if (match) {
      return { t: 'FOR', item: match[1], iter: match[2].trim(), body: [] };
    }
  }
  if (trimmed === 'for') {
    return { t: 'FOR', item: 'item', iter: 'items', body: [] }; // Default loop
  }
  
  // runonce <name>
  if (trimmed.startsWith('runonce ') || trimmed.startsWith('run once ')) {
    const name = trimmed.startsWith('runonce ') 
      ? originalText.substring(8).trim() 
      : originalText.substring(9).trim();
    if (name) {
      return { t: 'RUN_ONCE', name };
    }
  }
  if (trimmed === 'runonce' || trimmed === 'run once') {
    return { t: 'RUN_ONCE', name: 'step' }; // Default name
  }
  
  // snapshot
  if (trimmed === 'snapshot') {
    return { t: 'STORE_SNAPSHOT', args: { persistent: true, data: {} } };
  }
  
  return null;
}

/**
 * Generate default suggestions based on grammar
 */
function getDefaultSuggestions(): CommandSuggestion[] {
  return [
    { type: 'snippet', label: 'Ask variable', value: 'ask ', description: 'Type: ask <variable>' },
    { type: 'snippet', label: 'Section', value: 'section ', description: 'Type: section <name>' },
    { type: 'snippet', label: 'Progress', value: 'progress ', description: 'Type: progress <0-100>' },
    { type: 'snippet', label: 'Gather list', value: 'gather ', description: 'Type: gather <list>' },
    { type: 'snippet', label: 'If condition', value: 'if ', description: 'Type: if <condition>' },
    { type: 'snippet', label: 'For loop', value: 'for item in ', description: 'Type: for <item> in <iter>' },
    { type: 'snippet', label: 'Run once', value: 'runonce ', description: 'Type: runonce <name>' },
    { type: 'snippet', label: 'Store snapshot', value: 'snapshot', description: 'Type: snapshot' },
  ];
}

export function CommandPalette({ isOpen, onClose, onInsert, suggestions = [], availableVariables = [], loadingVariables = false }: CommandPaletteProps): JSX.Element | null {
  const [input, setInput] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [justOpened, setJustOpened] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  
  // Combine default suggestions with custom ones
  const allSuggestions = [...getDefaultSuggestions(), ...suggestions];
  
  // Check if user is typing an "ask" command (with or without space/query)
  const inputLower = input.trim().toLowerCase();
  const isTypingAsk = inputLower === 'ask' || inputLower.startsWith('ask ');
  const askQuery = inputLower.startsWith('ask ') ? input.trim().substring(4).toLowerCase() : '';
  
  // Filter variables if typing "ask", otherwise filter suggestions normally
  const variableSuggestions = isTypingAsk
    ? availableVariables
        .filter(v => !askQuery || v.toLowerCase().includes(askQuery))
        .map(v => ({
          type: 'variable' as const,
          label: v,
          value: `ask ${v}`,
          description: 'Available variable',
        }))
    : [];
  
  const filtered = isTypingAsk
    ? variableSuggestions
    : input.trim().length === 0
    ? allSuggestions
    : allSuggestions.filter(s => 
        s.label.toLowerCase().includes(input.toLowerCase()) ||
        s.value.toLowerCase().includes(input.toLowerCase()) ||
        (s.description?.toLowerCase().includes(input.toLowerCase()) ?? false)
      );
  
  // If input looks like a complete command, add a "Use this" option
  // But don't show it when we have variable suggestions (user likely wants to pick a variable)
  const canParseDirectly = input.trim().length > 0 && parseCommand(input) !== null;
  const showDirectOption = canParseDirectly && filtered.length > 0 && !isTypingAsk;
  
  // Reset selection when filtered list changes
  useEffect(() => {
    setSelectedIndex(0);
  }, [filtered.length, showDirectOption]);
  
  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setJustOpened(true);
      inputRef.current?.focus();
      setInput('');
      setSelectedIndex(0);
    } else {
      setJustOpened(false);
    }
  }, [isOpen]);

  // Clear the "just opened" flag after first render
  useEffect(() => {
    if (justOpened) {
      // Clear after this render cycle completes
      const timer = setTimeout(() => {
        setJustOpened(false);
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [justOpened]);
  
  // Handle keyboard navigation
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      const maxIndex = (showDirectOption ? 1 : 0) + filtered.length - 1;
      setSelectedIndex(i => Math.min(maxIndex, i + 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(i => Math.max(0, i - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      
      // If direct option is selected (index 0 when showDirectOption is true)
      if (showDirectOption && selectedIndex === 0) {
        const node = parseCommand(input);
        if (node) {
          onInsert(node);
          onClose();
        }
        return;
      }
      
      // Calculate the actual index in the filtered list
      const listIndex = showDirectOption ? selectedIndex - 1 : selectedIndex;
      const selectedSuggestion = filtered[listIndex];
      
      if (selectedSuggestion) {
        // For variable suggestions, insert directly
        if (selectedSuggestion.type === 'variable') {
          const node = parseCommand(selectedSuggestion.value);
          if (node) {
            onInsert(node);
            onClose();
          }
        } else {
          // For snippets, fill the input and let user continue typing
          setInput(selectedSuggestion.value);
          inputRef.current?.focus();
        }
        return;
      }
      
      // Fallback: try to parse the current input directly
      const node = parseCommand(input);
      if (node) {
        onInsert(node);
        onClose();
      }
    }
  }, [input, filtered, selectedIndex, showDirectOption, onInsert, onClose]);
  
  
  if (!isOpen) return null;
  
  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 z-40"
        onClick={onClose}
      />
      
      {/* Palette */}
      <div className="fixed top-1/4 left-1/2 -translate-x-1/2 w-full max-w-2xl bg-surface border border-border rounded-xl shadow-2xl z-50">
        {/* Search input */}
        <div className="p-4 border-b border-border">
          <div className="flex items-center gap-3">
            <Search className="h-4 w-4 text-text-muted flex-shrink-0" />
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type a command: ask, section, progress, gather, if, for..."
              className="flex-1 bg-transparent text-text-primary placeholder-text-muted outline-none text-sm"
            />
          </div>
        </div>
        
        {/* Suggestions/Options list */}
        <div className="max-h-96 overflow-y-auto">
          {filtered.length === 0 && !showDirectOption ? (
            <div className="p-8 text-center text-text-muted text-sm">
              {isTypingAsk ? (
                <>
                  <p>No variables found.</p>
                  <p className="mt-2 text-xs">
                    Variables are extracted from your interview's question fields.
                    Type a variable name directly or add fields to your interview.
                  </p>
                </>
              ) : (
                <>
                  <p>No matching commands.</p>
                  <p className="mt-2 text-xs">Try: ask, section, progress, gather, if, for, runonce, or snapshot</p>
                </>
              )}
            </div>
          ) : (
            <div className="p-2">
              {/* Direct command option (if input looks valid) */}
              {showDirectOption && (
                <button
                  type="button"
                  onClick={() => {
                    if (justOpened) {
                      return;
                    }
                    const node = parseCommand(input);
                    if (node) {
                      onInsert(node);
                      onClose();
                    }
                  }}
                  className={clsx(
                    'w-full flex items-center justify-between gap-3 p-3 rounded-lg text-left transition-colors mb-2',
                    selectedIndex === 0
                      ? 'bg-primary/20 border border-primary'
                      : 'hover:bg-muted/50 bg-muted/30 border border-muted'
                  )}
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-text-primary truncate">
                      ✓ Use: {input.trim()}
                    </p>
                    <p className="text-xs text-text-muted mt-0.5">
                      Press Enter or click to insert
                    </p>
                  </div>
                </button>
              )}
              
              {/* Suggestion options */}
              {filtered.map((suggestion, index) => {
                const actualIndex = showDirectOption ? index + 1 : index;
                return (
                  <button
                    key={`${suggestion.type}-${suggestion.label}-${index}`}
                    type="button"
                    onClick={() => {
                      if (justOpened) {
                        return;
                      }
                      // For variable suggestions, insert directly; for others, fill input
                      if (suggestion.type === 'variable') {
                        const node = parseCommand(suggestion.value);
                        if (node) {
                          onInsert(node);
                          onClose();
                        }
                      } else {
                        // Fill in the input field with the suggestion, let user type/edit, then press Enter
                        setInput(suggestion.value);
                        inputRef.current?.focus();
                        // Select any text after the space so user can type the value
                        setTimeout(() => {
                          if (inputRef.current) {
                            inputRef.current.setSelectionRange(suggestion.value.length, suggestion.value.length);
                          }
                        }, 0);
                      }
                    }}
                    className={clsx(
                      'w-full flex items-center justify-between gap-3 p-3 rounded-lg text-left transition-colors',
                      actualIndex === selectedIndex
                        ? 'bg-primary/20 border border-primary'
                        : 'hover:bg-muted/50'
                    )}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-text-primary truncate">
                        {suggestion.label}
                      </p>
                      {suggestion.description && (
                        <p className="text-xs text-text-muted mt-0.5">
                          {suggestion.description}
                        </p>
                      )}
                    </div>
                    <code className="text-xs text-text-muted bg-muted px-2 py-1 rounded">
                      {suggestion.value}
                    </code>
                  </button>
                );
              })}
            </div>
          )}
        </div>
        
        {/* Footer hint */}
        <div className="px-3 py-2 border-t border-border bg-muted rounded-b-xl">
          <div className="flex items-center justify-between text-xs text-text-muted flex-wrap gap-2">
            <div className="flex items-center gap-3 flex-wrap">
              <span className="flex items-center gap-1">
                <ArrowUp className="h-3 w-3" />
                <ArrowDown className="h-3 w-3" />
                Navigate
              </span>
              <span>
                <kbd className="px-1.5 py-0.5 rounded bg-surface border border-border text-text-muted">Enter</kbd> Insert
              </span>
              <span>
                <kbd className="px-1.5 py-0.5 rounded bg-surface border border-border text-text-muted">Esc</kbd> Close
              </span>
            </div>
            {canParseDirectly && (
              <span className="text-success text-xs">✓ Command recognized</span>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
