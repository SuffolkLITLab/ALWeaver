import { useEffect } from 'react';
import { useFieldArray, useForm } from 'react-hook-form';
import { Plus, Trash2 } from 'lucide-react';
import type { Block } from '../../../types/blocks';
import { useBlockStore } from '../../../store/useBlockStore';
import { updateBlockContent } from '../../../utils/yamlMapper';

type QuestionField = {
  id: string;
  label: string;
  variable: string;
  datatype?: string;
  hint?: string;
  choices?: string;
};

type QuestionFormValues = {
  question: string;
  subquestion?: string;
  fields: QuestionField[];
  'continue button field'?: string;
};

const reshapeFields = (raw: unknown[]): QuestionField[] => {
  const fields: QuestionField[] = [];

  raw.forEach((item, index) => {
    if (!item || typeof item !== 'object') {
      return;
    }

    const entry = item as Record<string, unknown>;
    const labelEntry = Object.entries(entry).find(([key]) => !['datatype', 'hint', 'choices'].includes(key));
    if (!labelEntry) {
      return;
    }

    const [labelKey, variableValue] = labelEntry;
    const choices = Array.isArray(entry.choices)
      ? (entry.choices as unknown[])
          .filter((choice): choice is string => typeof choice === 'string')
          .join(', ')
      : undefined;

    fields.push({
      id: `${labelKey}-${index}`,
      label: String(labelKey),
      variable: typeof variableValue === 'string' ? variableValue : '',
      datatype: typeof entry.datatype === 'string' ? entry.datatype : undefined,
      hint: typeof entry.hint === 'string' ? entry.hint : undefined,
      choices,
    });
  });

  return fields;
};

const toDocassembleFields = (fields: QuestionField[]) =>
  fields.map(({ label, variable, datatype, hint, choices }) => {
    const base: Record<string, unknown> = { [label]: variable };
    if (datatype) base.datatype = datatype;
    if (hint) base.hint = hint;
    if (choices) {
      base.choices = choices
        .split(',')
        .map((choice) => choice.trim())
        .filter(Boolean);
    }
    return base;
  });

type QuestionFormProps = {
  block: Block;
};

export const QuestionForm = ({ block }: QuestionFormProps) => {
  const updateBlock = useBlockStore((state) => state.updateBlock);
  const questionData = (block.data ?? {}) as Record<string, unknown>;

  const {
    control,
    register,
    watch,
    reset,
  } = useForm<QuestionFormValues>({
    defaultValues: {
      question: (questionData.question as string) ?? '',
      subquestion: (questionData.subquestion as string) ?? '',
      fields: reshapeFields(Array.isArray(questionData.fields) ? (questionData.fields as unknown[]) : []),
      'continue button field': (questionData['continue button field'] as string) ?? undefined,
    },
  });

  const { fields, append, remove } = useFieldArray({ control, name: 'fields' });

  useEffect(() => {
    reset({
      question: (questionData.question as string) ?? '',
      subquestion: (questionData.subquestion as string) ?? '',
      fields: reshapeFields(Array.isArray(questionData.fields) ? (questionData.fields as unknown[]) : []),
      'continue button field': (questionData['continue button field'] as string) ?? undefined,
    });
  }, [block.id, reset]);

  useEffect(() => {
    const subscription = watch((values) => {
      const normalizedFields = (values.fields ?? []).map((field, index) => ({
        id: field?.id ?? `field-${index}`,
        label: field?.label ?? '',
        variable: field?.variable ?? '',
        datatype: field?.datatype,
        hint: field?.hint,
        choices: field?.choices,
      }));

      updateBlock(block.id, (current) =>
        updateBlockContent(current, {
          question: values.question,
          subquestion: values.subquestion,
          fields: toDocassembleFields(normalizedFields),
          'continue button field': values['continue button field'],
        }),
      );
    });

    return () => subscription.unsubscribe();
  }, [block.id, updateBlock, watch]);

  return (
    <div className="space-y-4">
      <div>
        <label className="text-xs uppercase tracking-wide text-slate-400">Question Title</label>
        <input
          {...register('question', { required: true })}
          className="mt-1 w-full rounded-lg border border-outline/30 bg-panel px-3 py-2 text-sm text-slate-100 focus:border-accent focus:outline-none"
          placeholder="What brings you here today?"
        />
      </div>

      <div>
        <label className="text-xs uppercase tracking-wide text-slate-400">Subquestion</label>
        <textarea
          {...register('subquestion')}
          rows={4}
          className="mt-1 w-full rounded-lg border border-outline/30 bg-panel px-3 py-2 text-sm text-slate-100 focus:border-accent focus:outline-none"
          placeholder="Provide any additional context for the user."
        />
      </div>

      <div className="flex items-center justify-between">
        <div>
          <h4 className="text-sm font-semibold text-slate-200">Fields</h4>
          <p className="text-xs text-slate-400">Manage the variables collected on this screen.</p>
        </div>
        <button
          type="button"
          onClick={() =>
            append({
              id: `field-${Date.now()}`,
              label: 'New field',
              variable: 'variable_name',
            })
          }
          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md border border-outline/30 bg-panel text-xs font-medium hover:border-accent"
        >
          <Plus size={14} />
          Add Field
        </button>
      </div>

      <div className="space-y-3">
        {fields.map((field, index) => (
          <div key={field.id} className="rounded-lg border border-outline/20 bg-panel/70 p-3 space-y-3">
            <div className="flex items-center justify-between">
              <h5 className="text-sm font-medium text-slate-200">Field {index + 1}</h5>
              <button
                type="button"
                onClick={() => remove(index)}
                className="p-1 rounded-md text-rose-300 hover:bg-rose-500/10"
                aria-label="Remove field"
              >
                <Trash2 size={14} />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs uppercase tracking-wide text-slate-400">Label</label>
                <input
                  {...register(`fields.${index}.label` as const)}
                  className="mt-1 w-full rounded-md border border-outline/30 bg-panel px-3 py-2 text-sm text-slate-100"
                />
              </div>
              <div>
                <label className="text-xs uppercase tracking-wide text-slate-400">Variable</label>
                <input
                  {...register(`fields.${index}.variable` as const)}
                  className="mt-1 w-full rounded-md border border-outline/30 bg-panel px-3 py-2 text-sm text-slate-100"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs uppercase tracking-wide text-slate-400">Datatype</label>
                <select
                  {...register(`fields.${index}.datatype` as const)}
                  className="mt-1 w-full rounded-md border border-outline/30 bg-panel px-3 py-2 text-sm text-slate-100"
                >
                  <option value="">Detect automatically</option>
                  <option value="yesno">Yes / No</option>
                  <option value="text">Text</option>
                  <option value="number">Number</option>
                  <option value="email">Email</option>
                  <option value="dropdown">Dropdown</option>
                </select>
              </div>
              <div>
                <label className="text-xs uppercase tracking-wide text-slate-400">Hint</label>
                <input
                  {...register(`fields.${index}.hint` as const)}
                  className="mt-1 w-full rounded-md border border-outline/30 bg-panel px-3 py-2 text-sm text-slate-100"
                />
              </div>
            </div>

            <div>
              <label className="text-xs uppercase tracking-wide text-slate-400">Choices</label>
              <input
                {...register(`fields.${index}.choices` as const)}
                className="mt-1 w-full rounded-md border border-outline/30 bg-panel px-3 py-2 text-sm text-slate-100"
                placeholder="option one, option two"
              />
              <p className="mt-1 text-[11px] text-slate-500">Separate choices with commas</p>
            </div>
          </div>
        ))}
      </div>

      <div>
        <label className="text-xs uppercase tracking-wide text-slate-400">Continue Button Variable</label>
        <input
          {...register('continue button field')}
          className="mt-1 w-full rounded-md border border-outline/30 bg-panel px-3 py-2 text-sm text-slate-100"
          placeholder="continue_intro"
        />
      </div>
    </div>
  );
};
