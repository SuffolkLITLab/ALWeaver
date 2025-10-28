import { useCallback, useEffect, useMemo, useState, useId } from 'react';
import type { ChangeEvent, FocusEvent } from 'react';
import { stringify } from 'yaml';
import type { EditorBlock } from '@/state/types';
import { useEditorStore } from '@/state/editorStore';

interface MandatoryEditorProps {
  block: EditorBlock;
}

export function MandatoryEditor({ block }: MandatoryEditorProps): JSX.Element {
  const upsertBlockFromRaw = useEditorStore((state) => state.upsertBlockFromRaw);
  const isInterviewOrder = block.metadata.isInterviewOrder;

  const interviewOrder = useMemo(() => {
    if (!isInterviewOrder) {
      return {} as Record<string, unknown>;
    }
    return (block.metadata.rawData?.interview_order ?? {}) as Record<string, unknown>;
  }, [block.metadata.rawData, isInterviewOrder]);

  const [orderText, setOrderText] = useState('');
  const [mandatory, setMandatory] = useState(false);

  useEffect(() => {
    if (!isInterviewOrder) {
      setOrderText('');
      setMandatory(false);
      return;
    }
    if (typeof interviewOrder.code === 'string') {
      setOrderText(interviewOrder.code.trim());
    } else {
      setOrderText(block.metadata.orderItems.join('\n'));
    }
    const rawMandatory = interviewOrder.mandatory;
    let nextMandatory = false;
    if (typeof rawMandatory === 'string') {
      nextMandatory = rawMandatory.toLowerCase() === 'true';
    } else if (typeof rawMandatory === 'boolean') {
      nextMandatory = rawMandatory;
    }
    setMandatory(nextMandatory);
  }, [block.metadata.orderItems, interviewOrder, isInterviewOrder]);

  const commitChanges = useCallback(
    (partial: Partial<Record<'code' | 'mandatory', unknown>>) => {
      if (!isInterviewOrder) {
        return;
      }
      const base = (block.metadata.rawData ?? {}) as Record<string, unknown>;
      const current = (base.interview_order ?? {}) as Record<string, unknown>;
      const nextInterviewOrder = {
        ...current,
        ...partial,
      };
      if (Object.prototype.hasOwnProperty.call(partial, 'mandatory') && partial.mandatory === undefined) {
        delete nextInterviewOrder.mandatory;
      }

      const nextRawData = {
        ...base,
        interview_order: nextInterviewOrder,
      };

      const yaml = stringify(nextRawData).trim();
      upsertBlockFromRaw(block.id, yaml);
    },
    [block.id, block.metadata.rawData, isInterviewOrder, upsertBlockFromRaw],
  );

  const handleMandatoryChange = (event: ChangeEvent<HTMLInputElement>) => {
    const isChecked = event.target.checked;
    setMandatory(isChecked);
    commitChanges({ mandatory: isChecked ? true : undefined });
  };

  const handleOrderTextChange = (event: ChangeEvent<HTMLTextAreaElement>) => {
    setOrderText(event.target.value);
  };

  const handleOrderBlur = (event: FocusEvent<HTMLTextAreaElement>) => {
    commitChanges({ code: event.target.value });
  };

  const checkboxId = useId();

  if (!isInterviewOrder) {
    return (
      <div className="rounded-xl border border-border bg-muted px-3 py-4 text-sm text-text-muted">
        This block does not define an interview order.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-3 rounded-xl border border-border bg-muted px-3 py-3">
        <input
          id={checkboxId}
          type="checkbox"
          checked={mandatory}
          onChange={handleMandatoryChange}
          className="mt-1 h-4 w-4"
        />
        <label htmlFor={checkboxId} className="flex-1 cursor-pointer">
          <p className="text-sm font-medium text-text-primary">Mandatory interview order</p>
          <p className="text-xs text-text-muted">Ensure this sequence runs before other screens.</p>
        </label>
      </div>

      <div className="space-y-2">
        <label className="text-xs font-semibold uppercase tracking-[0.18em] text-text-muted" htmlFor="order-code">
          Goal variables sequence
        </label>
        <textarea
          id="order-code"
          value={orderText}
          onChange={handleOrderTextChange}
          onBlur={handleOrderBlur}
          rows={8}
          className="w-full rounded-lg border border-border bg-surface px-3 py-2 font-mono text-xs text-text-primary outline-none focus:border-primary"
          placeholder="goal_variable_one\ngoal_variable_two"
        />
      </div>

      <p className="text-xs text-text-muted">
        Tip: Use conditional statements with standard Python syntax. Comment lines with <code>#</code> to exclude items
        temporarily.
      </p>
    </div>
  );
}
