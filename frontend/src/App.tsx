import { useEffect, useRef } from 'react';
import { ErrorBoundary } from 'react-error-boundary';
import { AppShell } from '@/components/layout/AppShell';
import { useEditorStore } from '@/state/editorStore';
import { SAMPLE_INTERVIEW } from '@/utils/sampleInterview';
import { useEditorSync } from '@/hooks/useEditorSync';

function AppContent(): JSX.Element {
  useEditorSync();
  return <AppShell />;
}

export default function App(): JSX.Element {
  const initializeFromYaml = useEditorStore((state) => state.initializeFromYaml);
  const initializedRef = useRef(false);

  useEffect(() => {
    if (!initializedRef.current) {
      initializeFromYaml(SAMPLE_INTERVIEW);
      initializedRef.current = true;
    }
  }, [initializeFromYaml]);

  return (
    <ErrorBoundary fallback={<div className="p-6 text-sm text-danger">Something went wrong while rendering.</div>}>
      <AppContent />
    </ErrorBoundary>
  );
}
