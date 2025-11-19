import React, { useCallback, useMemo } from 'react';
import { useFileStore } from '../../stores/useFileStore';
import { useAutoSave } from '../../hooks/useAutoSave';
import { TabBar } from './TabBar';
import { MonacoEditor } from './MonacoEditor';
import { StatusBar } from './StatusBar';

/**
 * Componente principale dell'area di modifica.
 * Gestisce lo stato del file attivo e l'integrazione con l'auto-salvataggio.
 */
export function EditorArea({ className = '' }) {
  const store = useFileStore();
  const activeFile = useMemo(() => store.getActiveFile(), [store.activeFileId, store.files]);
  const updateFileContent = store.updateFileContent;
  const { isSaving } = useAutoSave();

  // Callback per l'aggiornamento del contenuto dell'editor
  const handleEditorChange = useCallback((value) => {
    if (activeFile) {
      updateFileContent(activeFile.id, value);
    }
  }, [activeFile, updateFileContent]);

  return (
    <div className={`flex flex-col h-full w-full bg-editor-bg ${className}`}>
      {/* 1. Tab Bar */}
      <TabBar />

      {/* 2. Monaco Editor */}
      <div className="flex-grow overflow-hidden">
        <MonacoEditor
          file={activeFile}
          onContentChange={handleEditorChange}
        />
      </div>

      {/* 3. Status Bar */}
      <StatusBar isSaving={isSaving} />
    </div>
  );
}