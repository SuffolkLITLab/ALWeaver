import { useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Pin, PinOff, ChevronLeft, ChevronRight } from 'lucide-react';
import { useEditorStore } from '@/state/editorStore';
import type { SidebarPanel } from '@/state/types';
import { MetadataEditor } from '../right-sidebar/MetadataEditor';
import { MandatoryEditor } from '../right-sidebar/MandatoryEditor';
import { AttachmentEditor } from '../right-sidebar/AttachmentEditor';
import { ValidationSummary } from '../right-sidebar/ValidationSummary';
import { PropertiesPanel } from '../right-sidebar/PropertiesPanel';

const PANEL_TITLES: Record<SidebarPanel, string> = {
  properties: 'Block Properties',
  metadata: 'Metadata Settings',
  mandatory: 'Mandatory Checklist',
  attachment: 'Attachment Details',
  validation: 'Validation & YAML',
};

export function RightSidebar(): JSX.Element {
  const activeView = useEditorStore((state) => state.activeView);
  const sidebar = useEditorStore((state) => state.sidebar);
  const setSidebarState = useEditorStore((state) => state.setSidebarState);
  const selectedBlock = useEditorStore((state) =>
    state.blocks.find((block) => block.id === state.selectedBlockId),
  );

  if (activeView !== 'visual') {
    return null;
  }

  const isOpen = sidebar.isOpen || sidebar.pinned;

  const handleToggle = useCallback(() => {
    setSidebarState({ isOpen: !sidebar.isOpen });
  }, [setSidebarState, sidebar.isOpen]);

  const handleTogglePinned = useCallback(() => {
    setSidebarState({ pinned: !sidebar.pinned, isOpen: true });
  }, [setSidebarState, sidebar.pinned]);

  const activePanel = sidebar.activePanel;
  const panelTitle = PANEL_TITLES[activePanel] ?? 'Details';

  const panelContent = useMemo(() => {
    switch (activePanel) {
      case 'metadata':
        return selectedBlock ? <MetadataEditor block={selectedBlock} /> : null;
      case 'mandatory':
        return selectedBlock ? <MandatoryEditor block={selectedBlock} /> : null;
      case 'attachment':
        return selectedBlock ? <AttachmentEditor block={selectedBlock} /> : null;
      case 'validation':
        return <ValidationSummary />;
      case 'properties':
      default:
        return selectedBlock ? <PropertiesPanel block={selectedBlock} /> : <ValidationSummary />;
    }
  }, [activePanel, selectedBlock]);

  return (
    <aside className="relative flex flex-col border-l border-border bg-surface">
      <button
        type="button"
        onClick={handleToggle}
        className="absolute left-0 top-4 z-20 -translate-x-1/2 rounded-full border border-border bg-surface p-1 text-text-muted shadow-soft hover:text-text-primary"
        aria-label={isOpen ? 'Collapse sidebar' : 'Expand sidebar'}
      >
        {isOpen ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
      </button>

      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            key="sidebar"
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 360, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 260, damping: 26 }}
            className="flex h-full flex-col"
          >
            <header className="flex items-center justify-between border-b border-border px-5 py-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-text-muted">Context</p>
                <h3 className="text-base font-semibold text-text-primary">{panelTitle}</h3>
              </div>
              <button
                type="button"
                onClick={handleTogglePinned}
                className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-border text-text-muted transition-colors hover:bg-muted hover:text-text-primary"
                aria-label={sidebar.pinned ? 'Unpin sidebar' : 'Pin sidebar'}
              >
                {sidebar.pinned ? <Pin className="h-4 w-4" /> : <PinOff className="h-4 w-4" />}
              </button>
            </header>

            <div className="flex-1 overflow-y-auto px-5 py-4 scrollbar-thin">{panelContent}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </aside>
  );
}
