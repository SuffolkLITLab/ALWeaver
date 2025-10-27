import { useEffect } from 'react';
import { parseYamlDocument, validateYamlDocument } from '@/api/client';
import { useEditorStore } from '@/state/editorStore';
import { useDebouncedValue } from './useDebouncedValue';

const SYNC_DEBOUNCE_MS = 600;

export function useEditorSync(): void {
  const yamlDocument = useEditorStore((state) => state.yamlDocument);
  const setServerSummaries = useEditorStore((state) => state.setServerSummaries);
  const setValidationState = useEditorStore((state) => state.setValidationState);

  const debouncedYaml = useDebouncedValue(yamlDocument, SYNC_DEBOUNCE_MS);

  useEffect(() => {
    if (!debouncedYaml.trim()) {
      setServerSummaries([]);
      setValidationState({
        status: 'idle',
        issues: [],
        errorMessage: undefined,
      });
      return;
    }

    let isCancelled = false;

    const run = async () => {
      setValidationState({ status: 'loading', errorMessage: undefined });

      try {
        const [parseResult, validationResult] = await Promise.all([
          parseYamlDocument(debouncedYaml),
          validateYamlDocument(debouncedYaml),
        ]);

        if (isCancelled) {
          return;
        }

        setServerSummaries(parseResult.blocks);
        setValidationState({
          status: validationResult.valid ? 'valid' : 'invalid',
          issues: validationResult.issues,
          errorMessage: undefined,
          lastUpdatedAt: Date.now(),
        });
      } catch (error) {
        if (isCancelled) {
          return;
        }
        const message = error instanceof Error ? error.message : 'Unable to synchronize with the API';
        setValidationState({
          status: 'error',
          issues: [],
          errorMessage: message,
          lastUpdatedAt: Date.now(),
        });
      }
    };

    void run();

    return () => {
      isCancelled = true;
    };
  }, [debouncedYaml, setServerSummaries, setValidationState]);
}
