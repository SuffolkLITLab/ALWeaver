import { useEffect } from 'react';
import { useFieldArray, useForm } from 'react-hook-form';
import { Plus, Trash2 } from 'lucide-react';
import type { Block } from '../../../types/blocks';
import { useBlockStore } from '../../../store/useBlockStore';
import { updateBlockContent, extractVariablesFromBlocks } from '../../../utils/yamlMapper';

type InterviewOrderFormValues = {
  mandatory: boolean;
  steps: { variable: string }[];
};

type InterviewOrderFormProps = {
  block: Block;
};

const buildCodeFromSteps = (steps: { variable: string }[]) =>
  steps
    .map(({ variable }) => variable.trim())
    .filter(Boolean)
    .join('\n');

export const InterviewOrderForm = ({ block }: InterviewOrderFormProps) => {
  const updateBlock = useBlockStore((state) => state.updateBlock);
  const blocks = useBlockStore((state) => state.blocks);

  const interviewOrder = (block.data?.interview_order as Record<string, unknown>) ?? {};
  const fromCode = typeof interviewOrder.code === 'string'
    ? (interviewOrder.code as string)
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean)
    : [];

  const baseSteps =
    block.orderItems && block.orderItems.length > 0
      ? block.orderItems.map((item) => ({ variable: item.variable }))
      : fromCode.map((variable) => ({ variable }));

  const initialSteps = baseSteps.length ? baseSteps : [{ variable: '' }];

  const {
    control,
    register,
    watch,
    reset,
  } = useForm<InterviewOrderFormValues>({
    defaultValues: {
      mandatory: Boolean(interviewOrder.mandatory),
      steps: initialSteps,
    },
  });

  const { fields, append, remove } = useFieldArray({ control, name: 'steps' });

  useEffect(() => {
    reset({
      mandatory: Boolean(interviewOrder.mandatory),
      steps: initialSteps,
    });
  }, [block.id, reset]);

  useEffect(() => {
    const subscription = watch((values) => {
      const normalizedSteps = (values.steps ?? []).map((step) => ({
        variable: step?.variable ?? '',
      }));

      const code = buildCodeFromSteps(normalizedSteps);

      updateBlock(block.id, (current) =>
        updateBlockContent(current, {
          mandatory: values.mandatory ? true : undefined,
          code,
        }),
      );
    });

    return () => subscription.unsubscribe();
  }, [block.id, updateBlock, watch]);

  const knownVariables = extractVariablesFromBlocks(blocks);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <label className="text-xs uppercase tracking-wide text-slate-400">Mandatory Order</label>
        <input type="checkbox" {...register('mandatory')} className="h-4 w-4 rounded border-outline/40 bg-panel" />
      </div>

      <div className="rounded-xl border border-outline/30 bg-panel/70 p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="text-sm font-semibold text-slate-200">Sequence</h4>
            <p className="text-xs text-slate-400">Drag-and-drop coming soon. For now you can edit the order manually.</p>
          </div>
          <button
            type="button"
            onClick={() => append({ variable: '' })}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md border border-outline/30 bg-panel text-xs font-medium hover:border-accent"
          >
            <Plus size={14} />
            Add Step
          </button>
        </div>

        <div className="space-y-3">
          {fields.map((field, index) => (
            <div key={field.id} className="flex items-center gap-3">
              <span className="w-6 text-xs text-slate-400">{index + 1}</span>
              <input
                {...register(`steps.${index}.variable` as const)}
                list="known-variables"
                placeholder="variable_name"
                className="flex-1 rounded-md border border-outline/30 bg-slate-900 px-3 py-2 text-sm text-slate-100"
              />
              <button
                type="button"
                onClick={() => remove(index)}
                className="p-1 rounded-md text-rose-300 hover:bg-rose-500/10"
                aria-label="Remove step"
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>
      </div>

      <datalist id="known-variables">
        {knownVariables.map((variable) => (
          <option key={variable} value={variable} />
        ))}
      </datalist>
    </div>
  );
};
