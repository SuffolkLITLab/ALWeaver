import { useEffect, useRef, useState } from 'react';
import { useBlockStore } from '../store/useBlockStore';
import { serializeBlocksToYaml } from '../utils/yamlMapper';
import { validateYaml } from '../api/client';

const VALIDATION_DELAY_MS = 600;

export const useAutoValidation = () => {
  const blocks = useBlockStore((state) => state.blocks);
  const setValidationIssues = useBlockStore((state) => state.setValidationIssues);
  const [isValidating, setIsValidating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortController = useRef<AbortController | null>(null);

  useEffect(() => {
    const yaml = serializeBlocksToYaml(blocks);
    if (!yaml.trim()) {
      setValidationIssues([]);
      return;
    }

    setIsValidating(true);
    setError(null);

    const timer = window.setTimeout(async () => {
      abortController.current?.abort();
      const controller = new AbortController();
      abortController.current = controller;

      try {
        const response = await validateYaml(yaml, controller.signal);
        setValidationIssues(response.issues);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Validation failed');
      } finally {
        setIsValidating(false);
      }
    }, VALIDATION_DELAY_MS);

    return () => {
      window.clearTimeout(timer);
      abortController.current?.abort();
    };
  }, [blocks, setValidationIssues]);

  return { isValidating, error };
};
