import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import type { Block } from '../../../types/blocks';
import { useBlockStore } from '../../../store/useBlockStore';
import { updateBlockContent } from '../../../utils/yamlMapper';

type MetadataFormValues = {
  title: string;
  summary?: string;
  language?: string;
  author?: string;
  'show login'?: boolean;
  tags?: string;
};

const defaultValues: MetadataFormValues = {
  title: '',
  summary: '',
  language: 'en',
  author: '',
  'show login': false,
  tags: '',
};

type MetadataFormProps = {
  block: Block;
};

export const MetadataForm = ({ block }: MetadataFormProps) => {
  const updateBlock = useBlockStore((state) => state.updateBlock);
  const metadata = (block.data?.metadata as Record<string, unknown>) ?? {};

  const {
    register,
    watch,
    formState: { errors },
    reset,
  } = useForm<MetadataFormValues>({
    defaultValues: {
      ...defaultValues,
      ...metadata,
      tags: Array.isArray(metadata.tags) ? (metadata.tags as string[]).join(', ') : (metadata.tags as string | undefined) ?? '',
    },
  });

  useEffect(() => {
    reset({
      ...defaultValues,
      ...(metadata as MetadataFormValues),
      tags: Array.isArray(metadata.tags) ? (metadata.tags as string[]).join(', ') : (metadata.tags as string | undefined) ?? '',
    });
  }, [block.id, reset]);

  useEffect(() => {
    const subscription = watch((value, { name }) => {
      if (!name) return;
      const tags = value.tags
        ?.split(',')
        .map((tag) => tag.trim())
        .filter(Boolean);

      updateBlock(block.id, (current) =>
        updateBlockContent(current, {
          title: value.title,
          summary: value.summary,
          language: value.language,
          author: value.author,
          'show login': value['show login'],
          tags: tags?.length ? tags : undefined,
        }),
      );
    });

    return () => subscription.unsubscribe();
  }, [block.id, watch, updateBlock]);

  return (
    <form className="space-y-4">
      <div>
        <label className="text-xs tracking-wide text-slate-400">Title</label>
        <input
          {...register('title', { required: 'Title is required' })}
          className="mt-1 w-full rounded-lg border border-outline/30 bg-panel px-3 py-2 text-sm text-slate-100 focus:border-accent focus:outline-none"
          placeholder="Playground Intake"
        />
        {errors.title && <p className="mt-1 text-xs text-rose-300">{errors.title.message}</p>}
      </div>

      <div>
        <label className="text-xs tracking-wide text-slate-400">Summary</label>
        <textarea
          {...register('summary')}
          rows={3}
          className="mt-1 w-full rounded-lg border border-outline/30 bg-panel px-3 py-2 text-sm text-slate-100 focus:border-accent focus:outline-none"
          placeholder="Collect basic data for the Playground housing matter."
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs tracking-wide text-slate-400">Primary Language</label>
          <input
            {...register('language')}
            className="mt-1 w-full rounded-lg border border-outline/30 bg-panel px-3 py-2 text-sm text-slate-100 focus:border-accent focus:outline-none"
          />
        </div>
        <div>
          <label className="text-xs tracking-wide text-slate-400">Author</label>
          <input
            {...register('author')}
            className="mt-1 w-full rounded-lg border border-outline/30 bg-panel px-3 py-2 text-sm text-slate-100 focus:border-accent focus:outline-none"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 items-center">
        <label className="text-xs tracking-wide text-slate-400">Require Login</label>
        <input type="checkbox" {...register('show login')} className="h-4 w-4 rounded border-outline/40 bg-panel" />
      </div>

      <div>
        <label className="text-xs tracking-wide text-slate-400">Tags</label>
        <input
          {...register('tags')}
          className="mt-1 w-full rounded-lg border border-outline/30 bg-panel px-3 py-2 text-sm text-slate-100 focus:border-accent focus:outline-none"
          placeholder="housing, docassemble"
        />
        <p className="mt-1 text-xs text-slate-400">Separate tags with commas</p>
      </div>
    </form>
  );
};
