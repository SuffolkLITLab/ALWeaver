import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ChangeEvent, FocusEvent } from 'react';
import { stringify } from 'yaml';
import type { EditorBlock } from '@/state/types';
import { useEditorStore } from '@/state/editorStore';

interface MandatoryEditorProps {
  block: EditorBlock;
}

export function MandatoryEditor({ block }: MandatoryEditorProps): JSX.Element {
  const upsertBlockFromRaw = useEditorStore((state) => state.upsertBlockFromRaw);

  const interviewOrder = useMemo(() => {
    return (block.metadata.rawData?.interview_order ?? {}) as Record<string, unknown>;
  }, [block.metadata.rawData]);

  const [orderText, setOrderText] = useState('');
  const [mandatory, setMandatory] = useState(false);

  useEffect(() => {
    if (typeof interviewOrder.code === 'string') {
      setOrderText(interviewOrder.code.trim());
    } else {
      setOrderText(block.metadata.orderItems.join('\n'));
    }
    setMandatory(Boolean(interviewOrder.mandatory));
  }, [block.metadata.orderItems, interviewOrder]);

  const commitChanges = useCallback(
    (partial: Partial<Record<'code' | 'mandatory', unknown>>) => {
      const base = (block.metadata.rawData ?? {}) as Record<string, unknown>;
      const current = (base.interview_order ?? {}) as Record<string, unknown>;
      const nextInterviewOrder = {
        ...current,
        ...partial,
      };

      const nextRawData = {
        ...base,
        interview_order: nextInterviewOrder,
      };

      const yaml = stringify(nextRawData).trim();
      upsertBlockFromRaw(block.id, yaml);
    },
    [block.id, block.metadata.rawData, upsertBlockFromRaw],
  );

  const handleMandatoryChange = (event: ChangeEvent<HTMLInputElement>) => {
    const isChecked = event.target.checked;
    setMandatory(isChecked);
    commitChanges({ mandatory: isChecked });
  };

  const handleOrderTextChange = (event: ChangeEvent<HTMLTextAreaElement>) => {
    setOrderText(event.target.value);
  };

  const handleOrderBlur = (event: FocusEvent<HTMLTextAreaElement>) => {
    commitChanges({ code: event.target.value });
  };

  return (
    <div className="space-y-4">
      <label className="flex items-start gap-3 rounded-xl border border-border bg-muted px-3 py-3">
        <input type="checkbox" checked={mandatory} onChange={handleMandatoryChange} className="mt-1 h-4 w-4" />
        <div>
          <p className="text-sm font-medium text-text-primary">Mandatory interview order</p>
          <p className="text-xs text-text-muted">Ensure this sequence runs before other screens.</p>
        </div>
      </label>

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
