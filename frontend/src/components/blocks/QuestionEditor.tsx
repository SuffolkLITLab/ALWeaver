import { useCallback, useEffect, useMemo, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { stringify } from 'yaml';
import type { EditorBlock } from '@/state/types';
import { useEditorStore } from '@/state/editorStore';
import { FIELD_DATATYPE_OPTIONS } from '@/utils/constants';
import { Button } from '../common/Button';

interface QuestionEditorProps {
  block: EditorBlock;
}

interface FieldState {
  id: string;
  label: string;
  variable: string;
  datatype: string;
  required: boolean;
}

const createFieldId = () => `field-${Math.random().toString(36).slice(2, 10)}`;

export function QuestionEditor({ block }: QuestionEditorProps): JSX.Element {
  const upsertBlockFromRaw = useEditorStore((state) => state.upsertBlockFromRaw);

  const rawQuestionData = useMemo(() => {
    return (block.metadata.rawData ?? {}) as Record<string, unknown>;
  }, [block.metadata.rawData]);

  const [questionText, setQuestionText] = useState('');
  const [subquestionText, setSubquestionText] = useState('');
  const [fields, setFields] = useState<FieldState[]>([]);

  useEffect(() => {
    setQuestionText(typeof rawQuestionData.question === 'string' ? rawQuestionData.question : '');
    setSubquestionText(typeof rawQuestionData.subquestion === 'string' ? rawQuestionData.subquestion : '');

    const parsedFields = Array.isArray(rawQuestionData.fields)
      ? (rawQuestionData.fields as unknown[]).map((entry, index) => {
          if (typeof entry !== 'object' || entry === null) {
            return {
              id: createFieldId(),
              label: `Field ${index + 1}`,
              variable: '',
              datatype: 'text',
              required: false,
            };
          }

          const record = entry as Record<string, unknown>;
          let label = `Field ${index + 1}`;
          let variable = '';

          for (const [key, value] of Object.entries(record)) {
            if (['datatype', 'required', 'help', 'hint', 'css class', 'validation'].includes(key)) {
              continue;
            }
            label = key;
            variable = typeof value === 'string' ? value : '';
            break;
          }

          return {
            id: createFieldId(),
            label,
            variable,
            datatype: typeof record.datatype === 'string' ? record.datatype : 'text',
            required: Boolean(record.required),
          };
        })
      : [];

    setFields(parsedFields);
  }, [rawQuestionData]);

  const persist = useCallback(
    (nextQuestion: string, nextSubquestion: string, nextFields: FieldState[]) => {
      const base = { ...rawQuestionData };

      if (nextQuestion.trim()) {
        base.question = nextQuestion;
      } else {
        delete base.question;
      }

      if (nextSubquestion.trim()) {
        base.subquestion = nextSubquestion;
      } else {
        delete base.subquestion;
      }

      if (nextFields.length > 0) {
        base.fields = nextFields.map((field, index) => {
          const entryLabel = field.label.trim() || `Field ${index + 1}`;
          const entry: Record<string, unknown> = {
            [entryLabel]: field.variable.trim(),
          };
          if (field.datatype.trim()) {
            entry.datatype = field.datatype.trim();
          }
          if (field.required) {
            entry.required = true;
          }
          return entry;
        });
      } else {
        delete base.fields;
      }

      const yaml = stringify(base).trim();
      upsertBlockFromRaw(block.id, yaml);
    },
    [block.id, rawQuestionData, upsertBlockFromRaw],
  );

  const handleQuestionBlur = useCallback(() => {
    persist(questionText, subquestionText, fields);
  }, [fields, persist, questionText, subquestionText]);

  const handleSubquestionBlur = useCallback(() => {
    persist(questionText, subquestionText, fields);
  }, [fields, persist, questionText, subquestionText]);

  const handleFieldBlur = useCallback(() => {
    persist(questionText, subquestionText, fields);
  }, [fields, persist, questionText, subquestionText]);

  const handleFieldChange = (fieldId: string, updates: Partial<FieldState>) => {
    setFields((prev) => prev.map((field) => (field.id === fieldId ? { ...field, ...updates } : field)));
  };

  const handleFieldDatatypeChange = (fieldId: string, datatype: string) => {
    const nextFields = fields.map((field) => (field.id === fieldId ? { ...field, datatype } : field));
    setFields(nextFields);
    persist(questionText, subquestionText, nextFields);
  };

  const handleFieldRequiredChange = (fieldId: string, required: boolean) => {
    const nextFields = fields.map((field) => (field.id === fieldId ? { ...field, required } : field));
    setFields(nextFields);
    persist(questionText, subquestionText, nextFields);
  };

  const handleRemoveField = (fieldId: string) => {
    const nextFields = fields.filter((field) => field.id !== fieldId);
    setFields(nextFields);
    persist(questionText, subquestionText, nextFields);
  };

  const handleAddField = () => {
    const nextFields = [
      ...fields,
      {
        id: createFieldId(),
        label: `Field ${fields.length + 1}`,
        variable: '',
        datatype: 'text',
        required: false,
      },
    ];
    setFields(nextFields);
    persist(questionText, subquestionText, nextFields);
  };

  return (
    <div className="space-y-5">
      <section className="space-y-2">
        <label className="text-xs font-semibold uppercase tracking-[0.18em] text-text-muted" htmlFor={`question-${block.id}`}>
          Question
        </label>
        <textarea
          id={`question-${block.id}`}
          value={questionText}
          onChange={(event) => setQuestionText(event.target.value)}
          onBlur={handleQuestionBlur}
          rows={3}
          className="w-full rounded-xl border border-border bg-surface px-3 py-2 text-base font-medium text-text-primary outline-none focus:border-primary"
          placeholder="Enter the prompt shown to users"
        />
      </section>

      <section className="space-y-2">
        <label className="text-xs font-semibold uppercase tracking-[0.18em] text-text-muted" htmlFor={`subquestion-${block.id}`}>
          Subquestion
        </label>
        <textarea
          id={`subquestion-${block.id}`}
          value={subquestionText}
          onChange={(event) => setSubquestionText(event.target.value)}
          onBlur={handleSubquestionBlur}
          rows={3}
          className="w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm text-text-primary outline-none focus:border-primary"
          placeholder="Add instructions or supporting details"
        />
      </section>

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
            fields.map((field, index) => (
              <div key={field.id} className="rounded-2xl border border-border bg-surface px-4 py-4 shadow-soft">
                <div className="flex items-start justify-between gap-3">
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
                          onChange={(event) => handleFieldChange(field.id, { label: event.target.value })}
                          onBlur={handleFieldBlur}
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
                          onChange={(event) => handleFieldChange(field.id, { variable: event.target.value })}
                          onBlur={handleFieldBlur}
                          className="w-full rounded-lg border border-border bg-background px-3 py-2 font-mono text-sm text-text-primary outline-none focus:border-primary"
                          placeholder="users[0].name.full"
                        />
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemoveField(field.id)}
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
                      onChange={(event) => handleFieldDatatypeChange(field.id, event.target.value)}
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
                      checked={field.required}
                      onChange={(event) => handleFieldRequiredChange(field.id, event.target.checked)}
                      className="h-4 w-4"
                    />
                    Required
                  </label>
                </div>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
