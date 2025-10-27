import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Plus, Trash2, GripVertical } from 'lucide-react';
import { stringify } from 'yaml';
import type { EditorBlock } from '@/state/types';
import { useEditorStore } from '@/state/editorStore';
import { FIELD_DATATYPE_OPTIONS } from '@/utils/constants';
import { Button } from '../common/Button';
import { RichTextEditor } from '../common/RichTextEditor';
import {
  DndContext,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface QuestionEditorProps {
  block: EditorBlock;
}

type FieldOptionStrategy = 'none' | 'text' | 'label' | 'code';

interface FieldOptionState {
  id: string;
  label: string;
  value: string;
}

interface FieldState {
  id: string;
  label: string;
  variable: string;
  datatype: string;
  required: boolean;
  optionStrategy: FieldOptionStrategy;
  options: FieldOptionState[];
  code: string;
  extras: Record<string, unknown>;
}

const isChoiceDatatype = (value: string) => value.toLowerCase().includes('choice');

const DEFAULT_OPTION_SEED: Array<{ label: string; value: string }> = [
  { label: 'Option 1', value: 'option_1' },
  { label: 'Option 2', value: 'option_2' },
];

const DEFAULT_CODE_EXPRESSION = '["Option 1", "Option 2"]';

const OPTION_STRATEGY_LABELS: Array<{ value: FieldOptionStrategy; label: string }> = [
  { value: 'text', label: 'Text list' },
  { value: 'label', label: 'Label → Value pairs' },
  { value: 'code', label: 'Python code' },
];

const RESERVED_KEYS = new Set([
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
  'validation',
]);

const createFieldId = () => `field-${Math.random().toString(36).slice(2, 10)}`;
const createOptionId = () => `option-${Math.random().toString(36).slice(2, 10)}`;

const slugify = (input: string, index: number) =>
  input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/(^_+|_+$)/g, '') || `option_${index + 1}`;

const ensureOptionSeed = (): FieldOptionState[] =>
  DEFAULT_OPTION_SEED.map((seed, index) => ({
    id: createOptionId(),
    label: seed.label,
    value: seed.value || slugify(seed.label, index),
  }));

export function QuestionEditor({ block }: QuestionEditorProps): JSX.Element {
  const upsertBlockFromRaw = useEditorStore((state) => state.upsertBlockFromRaw);

  const rawQuestionData = useMemo(() => {
    return ((block.metadata.rawData ?? {}) as Record<string, unknown>) || {};
  }, [block.metadata.rawData]);

  const [questionText, setQuestionText] = useState('');
  const [subquestionText, setSubquestionText] = useState('');
  const [fields, setFields] = useState<FieldState[]>([]);
  const [mandatory, setMandatory] = useState(false);

  const fieldsRef = useRef<FieldState[]>(fields);
  useEffect(() => {
    fieldsRef.current = fields;
  }, [fields]);

  useEffect(() => {
    setQuestionText(typeof rawQuestionData.question === 'string' ? rawQuestionData.question : '');
    setSubquestionText(typeof rawQuestionData.subquestion === 'string' ? rawQuestionData.subquestion : '');

    const parsedFields = Array.isArray(rawQuestionData.fields)
      ? (rawQuestionData.fields as unknown[]).map((entry, index) => parseField(entry, index))
      : [];

    setFields(parsedFields);
    fieldsRef.current = parsedFields;

    const rawMandatory = rawQuestionData.mandatory;
    let nextMandatory = false;
    if (typeof rawMandatory === 'string') {
      nextMandatory = rawMandatory.toLowerCase() === 'true';
    } else if (typeof rawMandatory === 'boolean') {
      nextMandatory = rawMandatory;
    }
    setMandatory(nextMandatory);
  }, [rawQuestionData]);

  const persist = useCallback(
    (
      nextQuestion: string,
      nextSubquestion: string,
      nextFields: FieldState[],
      nextMandatory: boolean,
    ) => {
      const base = { ...(block.metadata.rawData ?? {}) } as Record<string, unknown>;
      delete base.question;
      delete base.subquestion;
      delete base.fields;

      if (nextQuestion.trim()) {
        base.question = nextQuestion;
      }
      if (nextSubquestion.trim()) {
        base.subquestion = nextSubquestion;
      }

      if (nextFields.length > 0) {
        base.fields = nextFields.map((field, index) => buildFieldEntry(field, index));
      }

      if (nextMandatory) {
        base.mandatory = true;
      } else {
        delete base.mandatory;
      }

      const yaml = stringify(base).trim();
      upsertBlockFromRaw(block.id, yaml);
    },
    [block.id, block.metadata.rawData, upsertBlockFromRaw],
  );

  const persistCurrent = useCallback(() => {
    persist(questionText, subquestionText, fieldsRef.current, mandatory);
  }, [persist, questionText, subquestionText, mandatory]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 6 },
    }),
  );

  const handleQuestionBlur = useCallback(
    (value: string) => {
      const next = value ?? '';
      setQuestionText(next);
      persist(next, subquestionText, fieldsRef.current, mandatory);
    },
    [persist, subquestionText, mandatory],
  );

  const handleSubquestionBlur = useCallback(
    (value: string) => {
      const next = value ?? '';
      setSubquestionText(next);
      persist(questionText, next, fieldsRef.current, mandatory);
    },
    [persist, questionText, mandatory],
  );

  const handleFieldChange = (fieldId: string, updates: Partial<FieldState>) => {
    setFields((prev) => {
      const next = prev.map((field) => (field.id === fieldId ? { ...field, ...updates } : field));
      fieldsRef.current = next;
      return next;
    });
  };

  const handleFieldBlur = () => {
    persistCurrent();
  };

  const handleFieldDatatypeChange = (fieldId: string, datatype: string) => {
    setFields((prev) => {
      const next = prev.map((field) => {
        if (field.id !== fieldId) {
          return field;
        }
        const isChoice = isChoiceDatatype(datatype);
        let optionStrategy = field.optionStrategy;
        let options = field.options;
        let code = field.code;

        if (!isChoice) {
          optionStrategy = 'none';
          options = [];
          code = '';
        } else if (optionStrategy === 'none') {
          optionStrategy = 'text';
          options = ensureOptionSeed();
          code = '';
        }

        return {
          ...field,
          datatype,
          optionStrategy,
          options,
          code,
        };
      });
      fieldsRef.current = next;
      persist(questionText, subquestionText, next, mandatory);
      return next;
    });
  };

  const handleToggleRequired = (fieldId: string, required: boolean) => {
    setFields((prev) => {
      const next = prev.map((field) => (field.id === fieldId ? { ...field, required } : field));
      fieldsRef.current = next;
      persist(questionText, subquestionText, next, mandatory);
      return next;
    });
  };

  const handleRemoveField = (fieldId: string) => {
    setFields((prev) => {
      const next = prev.filter((field) => field.id !== fieldId);
      fieldsRef.current = next;
      persist(questionText, subquestionText, next, mandatory);
      return next;
    });
  };

  const handleAddField = () => {
    setFields((prev) => {
      const next: FieldState[] = [
        ...prev,
        {
          id: createFieldId(),
          label: `Field ${prev.length + 1}`,
          variable: '',
          datatype: 'text',
          required: true,
          optionStrategy: 'none',
          options: [],
          code: '',
          extras: {},
        },
      ];
      fieldsRef.current = next;
      persist(questionText, subquestionText, next, mandatory);
      return next;
    });
  };

  const handleReorderFields = (originId: string, targetId: string) => {
    setFields((prev) => {
      const oldIndex = prev.findIndex((field) => field.id === originId);
      const newIndex = prev.findIndex((field) => field.id === targetId);
      if (oldIndex === -1 || newIndex === -1) {
        return prev;
      }
      const next = arrayMove(prev, oldIndex, newIndex);
      fieldsRef.current = next;
      persist(questionText, subquestionText, next, mandatory);
      return next;
    });
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) {
      return;
    }
    handleReorderFields(String(active.id), String(over.id));
  };

  const handleOptionStrategyChange = (fieldId: string, strategy: FieldOptionStrategy) => {
    setFields((prev) => {
      const next = prev.map((field) => {
        if (field.id !== fieldId) {
          return field;
        }
        if (!isChoiceDatatype(field.datatype)) {
          return field;
        }

        if (strategy === 'code') {
          return {
            ...field,
            optionStrategy: 'code',
            code: field.code || DEFAULT_CODE_EXPRESSION,
            options: [],
          };
        }

        const existingOptions = field.options.length > 0 ? field.options : ensureOptionSeed();
        const normalized = existingOptions.map((option, index) => ({
          ...option,
          id: createOptionId(),
          label: option.label || `Option ${index + 1}`,
          value: option.value || slugify(option.label, index),
        }));

        if (strategy === 'label') {
          return {
            ...field,
            optionStrategy: 'label',
            options: normalized.map((option, index) => ({
              ...option,
              value: option.value || slugify(option.label, index),
            })),
            code: '',
          };
        }

        // text
        return {
          ...field,
          optionStrategy: 'text',
          options: normalized.map((option) => ({
            ...option,
            value: option.value || option.label,
          })),
          code: '',
        };
      });
      fieldsRef.current = next;
      persist(questionText, subquestionText, next, mandatory);
      return next;
    });
  };

  const handleOptionLabelChange = (fieldId: string, optionId: string, label: string) => {
    setFields((prev) => {
      const next = prev.map((field) => {
        if (field.id !== fieldId) {
          return field;
        }
        return {
          ...field,
          options: field.options.map((option) =>
            option.id === optionId ? { ...option, label } : option,
          ),
        };
      });
      fieldsRef.current = next;
      return next;
    });
  };

  const handleOptionValueChange = (fieldId: string, optionId: string, value: string) => {
    setFields((prev) => {
      const next = prev.map((field) => {
        if (field.id !== fieldId) {
          return field;
        }
        return {
          ...field,
          options: field.options.map((option) =>
            option.id === optionId ? { ...option, value } : option,
          ),
        };
      });
      fieldsRef.current = next;
      return next;
    });
  };

  const handleOptionBlur = () => {
    persistCurrent();
  };

  const handleAddOption = (fieldId: string) => {
    setFields((prev) => {
      const next = prev.map((field) => {
        if (field.id !== fieldId) {
          return field;
        }
        const nextOptions = [
          ...field.options,
          {
            id: createOptionId(),
            label: `Option ${field.options.length + 1}`,
            value: slugify(`Option ${field.options.length + 1}`, field.options.length),
          },
        ];
        return {
          ...field,
          options: nextOptions,
          optionStrategy: field.optionStrategy === 'none' ? 'text' : field.optionStrategy,
        };
      });
      fieldsRef.current = next;
      persist(questionText, subquestionText, next, mandatory);
      return next;
    });
  };

  const handleRemoveOption = (fieldId: string, optionId: string) => {
    setFields((prev) => {
      const next = prev.map((field) => {
        if (field.id !== fieldId) {
          return field;
        }
        return {
          ...field,
          options: field.options.filter((option) => option.id !== optionId),
        };
      });
      fieldsRef.current = next;
      persist(questionText, subquestionText, next, mandatory);
      return next;
    });
  };

  const handleCodeChange = (fieldId: string, code: string) => {
    setFields((prev) => {
      const next = prev.map((field) => (field.id === fieldId ? { ...field, code } : field));
      fieldsRef.current = next;
      return next;
    });
  };

  const handleCodeBlur = () => {
    persistCurrent();
  };

  const handleToggleMandatory = (value: boolean) => {
    setMandatory(value);
    persist(questionText, subquestionText, fieldsRef.current, value);
  };

  return (
    <div className="space-y-5">
      <section className="space-y-2">
        <label className="text-xs font-semibold uppercase tracking-[0.18em] text-text-muted">
          Question
        </label>
        <RichTextEditor
          value={questionText}
          onChange={setQuestionText}
          onBlur={handleQuestionBlur}
          placeholder="Enter the prompt shown to users"
          className="min-h-[180px]"
        />
      </section>

      <section className="space-y-2">
        <label className="text-xs font-semibold uppercase tracking-[0.18em] text-text-muted">
          Subquestion
        </label>
        <RichTextEditor
          value={subquestionText}
          onChange={setSubquestionText}
          onBlur={handleSubquestionBlur}
          placeholder="Add instructions or supporting details"
          className="min-h-[160px]"
        />
      </section>

      <div className="flex items-center justify-end">
        <Button
          type="button"
          variant={mandatory ? 'primary' : 'ghost'}
          size="sm"
          onClick={() => handleToggleMandatory(!mandatory)}
          aria-pressed={mandatory}
        >
          {mandatory ? 'Mandatory: On' : 'Mandatory: Off'}
        </Button>
      </div>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-text-primary">Fields</h3>
          <Button type="button" variant="secondary" size="sm" onClick={handleAddField} leftIcon={<Plus className="h-4 w-4" />}>
            Add field
          </Button>
        </div>

        <div className="space-y-3">
          {fields.length === 0 ? (
            <p className="text-sm text-text-muted">No fields yet. Add inputs to collect data from the user.</p>
          ) : (
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <SortableContext items={fields.map((field) => field.id)} strategy={verticalListSortingStrategy}>
                {fields.map((field, index) => (
                  <SortableField key={field.id} id={field.id}>
                    {(drag) => (
                      <FieldCard
                        index={index}
                        field={field}
                        dragHandle={drag}
                        onFieldChange={handleFieldChange}
                        onFieldBlur={handleFieldBlur}
                        onRemove={handleRemoveField}
                        onDatatypeChange={handleFieldDatatypeChange}
                        onToggleRequired={handleToggleRequired}
                        onStrategyChange={handleOptionStrategyChange}
                        onAddOption={handleAddOption}
                        onRemoveOption={handleRemoveOption}
                        onOptionLabelChange={handleOptionLabelChange}
                        onOptionValueChange={handleOptionValueChange}
                        onOptionBlur={handleOptionBlur}
                        onCodeChange={handleCodeChange}
                        onCodeBlur={handleCodeBlur}
                      />
                    )}
                  </SortableField>
                ))}
              </SortableContext>
            </DndContext>
          )}
        </div>
      </section>
    </div>
  );
}

interface DragHandleBindings {
  attributes: Record<string, unknown>;
  listeners: Record<string, unknown> | undefined;
  setActivatorNodeRef: (element: HTMLElement | null) => void;
  isDragging: boolean;
}

interface SortableFieldProps {
  id: string;
  children: (drag: DragHandleBindings) => ReactNode;
}

function SortableField({ id, children }: SortableFieldProps): JSX.Element {
  const { setNodeRef, attributes, listeners, setActivatorNodeRef, transform, transition, isDragging } = useSortable({ id });
  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.92 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} className="touch-manipulation">
      {children({ attributes, listeners, setActivatorNodeRef, isDragging })}
    </div>
  );
}

interface FieldCardProps {
  index: number;
  field: FieldState;
  dragHandle: DragHandleBindings;
  onFieldChange: (fieldId: string, updates: Partial<FieldState>) => void;
  onFieldBlur: () => void;
  onRemove: (fieldId: string) => void;
  onDatatypeChange: (fieldId: string, datatype: string) => void;
  onToggleRequired: (fieldId: string, required: boolean) => void;
  onStrategyChange: (fieldId: string, strategy: FieldOptionStrategy) => void;
  onAddOption: (fieldId: string) => void;
  onRemoveOption: (fieldId: string, optionId: string) => void;
  onOptionLabelChange: (fieldId: string, optionId: string, label: string) => void;
  onOptionValueChange: (fieldId: string, optionId: string, value: string) => void;
  onOptionBlur: () => void;
  onCodeChange: (fieldId: string, code: string) => void;
  onCodeBlur: () => void;
}

function FieldCard({
  index,
  field,
  dragHandle,
  onFieldChange,
  onFieldBlur,
  onRemove,
  onDatatypeChange,
  onToggleRequired,
  onStrategyChange,
  onAddOption,
  onRemoveOption,
  onOptionLabelChange,
  onOptionValueChange,
  onOptionBlur,
  onCodeChange,
  onCodeBlur,
}: FieldCardProps): JSX.Element {
  const { attributes, listeners, setActivatorNodeRef, isDragging } = dragHandle;
  return (
    <div className="rounded-2xl border border-border bg-surface px-4 py-4 shadow-soft">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <button
            type="button"
            ref={(node) => setActivatorNodeRef(node)}
            className={`mt-6 hidden h-8 w-8 items-center justify-center rounded-full border border-border bg-muted text-text-muted transition-colors hover:bg-primary/10 hover:text-primary focus:outline-none focus:ring-2 focus:ring-primary md:flex ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
            aria-label="Reorder field"
            {...(attributes as Record<string, unknown>)}
            {...((listeners ?? {}) as Record<string, unknown>)}
          >
            <GripVertical className="h-4 w-4" />
          </button>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-text-muted">
              Field {index + 1}
            </p>
            <div className="mt-2 grid gap-3 md:grid-cols-2">
              <div className="space-y-1">
                <label className="text-xs font-medium text-text-muted" htmlFor={`${field.id}-label`}>
                  Label
                </label>
                <input
                  id={`${field.id}-label`}
                  value={field.label}
                  onChange={(event) => onFieldChange(field.id, { label: event.target.value })}
                  onBlur={onFieldBlur}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-text-primary outline-none focus:border-primary"
                  placeholder="e.g. Full name"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-text-muted" htmlFor={`${field.id}-variable`}>
                  Variable
                </label>
                <input
                  id={`${field.id}-variable`}
                  value={field.variable}
                  onChange={(event) => onFieldChange(field.id, { variable: event.target.value })}
                  onBlur={onFieldBlur}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 font-mono text-sm text-text-primary outline-none focus:border-primary"
                  placeholder="users[0].name.full"
                />
              </div>
            </div>
          </div>
        </div>
        <button
          type="button"
          onClick={() => onRemove(field.id)}
          className="inline-flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full text-text-muted transition-colors hover:bg-muted hover:text-danger"
          aria-label="Remove field"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>

      <div className="mt-3 grid gap-3 md:grid-cols-[minmax(0,1fr)_auto]">
        <div className="space-y-1">
          <label className="text-xs font-medium text-text-muted" htmlFor={`${field.id}-datatype`}>
            Datatype
          </label>
          <select
            id={`${field.id}-datatype`}
            value={field.datatype}
            onChange={(event) => onDatatypeChange(field.id, event.target.value)}
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-text-primary outline-none focus:border-primary"
          >
            {FIELD_DATATYPE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <label className="mt-6 flex items-center gap-2 text-xs font-medium text-text-muted">
          <input
            type="checkbox"
            checked={field.required !== false}
            onChange={(event) => onToggleRequired(field.id, event.target.checked)}
            className="h-4 w-4"
          />
          Required
        </label>
      </div>

      {isChoiceDatatype(field.datatype) && (
        <ChoiceEditor
          field={field}
          onStrategyChange={onStrategyChange}
          onAddOption={onAddOption}
          onRemoveOption={onRemoveOption}
          onOptionLabelChange={onOptionLabelChange}
          onOptionValueChange={onOptionValueChange}
          onOptionBlur={onOptionBlur}
          onCodeChange={onCodeChange}
          onCodeBlur={onCodeBlur}
        />
      )}
    </div>
  );
}

interface ChoiceEditorProps {
  field: FieldState;
  onStrategyChange: (fieldId: string, strategy: FieldOptionStrategy) => void;
  onAddOption: (fieldId: string) => void;
  onRemoveOption: (fieldId: string, optionId: string) => void;
  onOptionLabelChange: (fieldId: string, optionId: string, label: string) => void;
  onOptionValueChange: (fieldId: string, optionId: string, value: string) => void;
  onOptionBlur: () => void;
  onCodeChange: (fieldId: string, code: string) => void;
  onCodeBlur: () => void;
}

function ChoiceEditor({
  field,
  onStrategyChange,
  onAddOption,
  onRemoveOption,
  onOptionLabelChange,
  onOptionValueChange,
  onOptionBlur,
  onCodeChange,
  onCodeBlur,
}: ChoiceEditorProps): JSX.Element {
  return (
    <div className="mt-4 rounded-xl border border-dashed border-border bg-background/60 p-4">
      <div className="flex flex-wrap items-center gap-3">
        <h4 className="text-xs font-semibold uppercase tracking-[0.18em] text-text-muted">Options</h4>
        <select
          value={field.optionStrategy === 'none' ? 'text' : field.optionStrategy}
          onChange={(event) => onStrategyChange(field.id, event.target.value as FieldOptionStrategy)}
          className="h-9 rounded-lg border border-border bg-surface px-3 py-2 text-xs font-medium uppercase tracking-widest text-text-muted"
        >
          {OPTION_STRATEGY_LABELS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        {(field.optionStrategy === 'text' || field.optionStrategy === 'label' || field.optionStrategy === 'none') && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => onAddOption(field.id)}
            leftIcon={<Plus className="h-3.5 w-3.5" />}
          >
            Add option
          </Button>
        )}
      </div>

      {field.optionStrategy === 'code' ? (
        <div className="mt-3 space-y-1">
          <label className="text-xs font-medium text-text-muted" htmlFor={`${field.id}-code`}>
            Python expression
          </label>
          <textarea
            id={`${field.id}-code`}
            value={field.code}
            onChange={(event) => onCodeChange(field.id, event.target.value)}
            onBlur={onCodeBlur}
            rows={4}
            className="w-full rounded-lg border border-border bg-surface px-3 py-2 font-mono text-xs text-text-primary outline-none focus:border-primary"
            placeholder={DEFAULT_CODE_EXPRESSION}
          />
        </div>
      ) : (
        <div className="mt-3 space-y-2">
          {field.options.length === 0 ? (
            <p className="text-xs text-text-muted">No options yet. Add a response choice.</p>
          ) : (
            field.options.map((option, optionIndex) => (
              <div
                key={option.id}
                className={
                  field.optionStrategy === 'label'
                    ? 'grid gap-2 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]'
                    : 'flex items-center gap-2'
                }
              >
                <input
                  value={option.label}
                  onChange={(event) => onOptionLabelChange(field.id, option.id, event.target.value)}
                  onBlur={onOptionBlur}
                  className="flex-1 rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text-primary outline-none focus:border-primary"
                  placeholder={`Option ${optionIndex + 1}`}
                />
                {field.optionStrategy === 'label' && (
                  <input
                    value={option.value}
                    onChange={(event) => onOptionValueChange(field.id, option.id, event.target.value)}
                    onBlur={onOptionBlur}
                    className="rounded-lg border border-border bg-surface px-3 py-2 text-sm font-mono text-text-primary outline-none focus:border-primary"
                    placeholder={`value_${optionIndex + 1}`}
                  />
                )}
                <button
                  type="button"
                  onClick={() => onRemoveOption(field.id, option.id)}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-full text-text-muted hover:bg-muted hover:text-danger"
                  aria-label="Remove option"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

function parseField(entry: unknown, index: number): FieldState {
  if (typeof entry !== 'object' || entry === null) {
    return {
      id: createFieldId(),
      label: `Field ${index + 1}`,
      variable: '',
      datatype: 'text',
      required: true,
      optionStrategy: 'none',
      options: [],
      code: '',
      extras: {},
    };
  }

  const record = entry as Record<string, unknown>;
  const extras: Record<string, unknown> = { ...record };

  let label = `Field ${index + 1}`;
  let variable = '';
  let labelKey: string | undefined;

  for (const [key, value] of Object.entries(record)) {
    if (RESERVED_KEYS.has(key)) {
      continue;
    }
    label = key;
    labelKey = key;
    variable = typeof value === 'string' ? value : '';
    break;
  }

  if (labelKey) {
    delete extras[labelKey];
  }

  const datatype = typeof record.datatype === 'string' ? record.datatype : 'text';
  delete extras.datatype;

  let required = true;
  if (Object.prototype.hasOwnProperty.call(record, 'required')) {
    const rawRequired = record.required;
    if (typeof rawRequired === 'string') {
      required = rawRequired.toLowerCase() !== 'false';
    } else {
      required = rawRequired !== false;
    }
  }
  delete extras.required;

  let optionStrategy: FieldOptionStrategy = 'none';
  let options: FieldOptionState[] = [];
  let code = '';

  if (typeof record.code === 'string' && record.code.trim()) {
    optionStrategy = 'code';
    code = record.code;
  }
  delete extras.code;

  if (optionStrategy !== 'code' && Array.isArray(record.choices)) {
    const rawChoices = record.choices as unknown[];

    const textOptions: FieldOptionState[] = [];
    const labelOptions: FieldOptionState[] = [];

    rawChoices.forEach((item, choiceIndex) => {
      if (typeof item === 'string') {
        textOptions.push({
          id: createOptionId(),
          label: item,
          value: item,
        });
        return;
      }
      if (item && typeof item === 'object') {
        const obj = item as Record<string, unknown>;
        if ('label' in obj || 'value' in obj) {
          const labelValue = typeof obj.label === 'string' ? obj.label : `Option ${choiceIndex + 1}`;
          const optionValue = typeof obj.value === 'string' ? obj.value : slugify(labelValue, choiceIndex);
          labelOptions.push({
            id: createOptionId(),
            label: labelValue,
            value: optionValue,
          });
        } else {
          const [mapLabel, mapValue] = Object.entries(obj)[0] ?? [`Option ${choiceIndex + 1}`, `option_${choiceIndex + 1}`];
          labelOptions.push({
            id: createOptionId(),
            label: mapLabel,
            value: typeof mapValue === 'string' ? mapValue : slugify(mapLabel, choiceIndex),
          });
        }
      }
    });

    if (labelOptions.length > 0) {
      optionStrategy = 'label';
      options = labelOptions;
    } else if (textOptions.length > 0) {
      optionStrategy = 'text';
      options = textOptions;
    }
  }
  delete extras.choices;

  const isChoice = isChoiceDatatype(datatype);
  if (!isChoice) {
    optionStrategy = 'none';
    options = [];
    code = '';
  }

  if (isChoice && optionStrategy === 'none') {
    optionStrategy = 'text';
    options = ensureOptionSeed();
  }

  return {
    id: createFieldId(),
    label,
    variable,
    datatype,
    required,
    optionStrategy,
    options,
    code: optionStrategy === 'code' ? code : '',
    extras,
  };
}

function buildFieldEntry(field: FieldState, index: number): Record<string, unknown> {
  const entryLabel = field.label.trim() || `Field ${index + 1}`;
  const entryVariable = field.variable.trim();
  const entry: Record<string, unknown> = { ...field.extras };

  entry[entryLabel] = entryVariable;

  if (field.datatype) {
    entry.datatype = field.datatype;
  }

  if (field.required === false) {
    entry.required = false;
  }

  if (field.optionStrategy === 'code') {
    const codeValue = field.code.trim();
    if (codeValue) {
      entry.code = codeValue;
    }
  } else if (field.optionStrategy === 'text') {
    const choices = field.options
      .map((option) => option.label.trim())
      .filter((label) => label.length > 0);
    if (choices.length > 0) {
      entry.choices = choices;
    }
  } else if (field.optionStrategy === 'label') {
    const choices = field.options
      .filter((option) => option.label.trim().length > 0)
      .map((option, optionIndex) => {
        const payload: Record<string, string> = {};
        payload[option.label.trim()] = option.value.trim() || slugify(option.label, optionIndex);
        return payload;
      });
    if (choices.length > 0) {
      entry.choices = choices;
    }
  }

  return entry;
}
