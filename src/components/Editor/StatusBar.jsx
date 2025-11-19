import React, { useMemo } from 'react';
import PropTypes from 'prop-types';
import { useFileStore } from '../../stores/useFileStore';
import { useSettingsStore } from '../../stores/useSettingsStore';
import { Save, Check, Loader2 } from 'lucide-react';

/**
 * Componente per la barra di stato dell'editor.
 * Mostra informazioni sul file attivo, lo stato di salvataggio e le impostazioni.
 */
export function StatusBar({ isSaving }) {
  const store = useFileStore();
  const activeFile = useMemo(() => store.getActiveFile(), [store.activeFileId, store.files]);
  const { theme, fontSize, tabSize } = useSettingsStore();

  // Funzione per formattare la dimensione del file (placeholder)
  const formatFileSize = (content) => {
    if (!content) return '0 B';
    const bytes = new TextEncoder().encode(content).length;
    if (bytes < 1024) return `${bytes} B`;
    const kb = bytes / 1024;
    if (kb < 1024) return `${kb.toFixed(2)} KB`;
    const mb = kb / 1024;
    return `${mb.toFixed(2)} MB`;
  };

  const fileInfo = activeFile ? (
    <>
      <span className="mr-4">
        Lingua: <span className="font-semibold">{activeFile.language.toUpperCase()}</span>
      </span>
      <span className="mr-4">
        Dimensione: <span className="font-semibold">{formatFileSize(activeFile.content)}</span>
      </span>
    </>
  ) : (
    <span className="mr-4">Nessun file attivo</span>
  );

  const editorSettings = (
    <>
      <span className="mr-4">
        Tema: <span className="font-semibold">{theme}</span>
      </span>
      <span className="mr-4">
        Font: <span className="font-semibold">{fontSize}px</span>
      </span>
      <span className="mr-4">
        Tab: <span className="font-semibold">{tabSize}</span>
      </span>
    </>
  );

  const saveStatus = isSaving ? (
    <span className="flex items-center text-yellow-400">
      <Loader2 size={16} className="animate-spin mr-1" />
      Salvataggio...
    </span>
  ) : activeFile && !activeFile.isDirty ? (
    <span className="flex items-center text-green-400">
      <Check size={16} className="mr-1" />
      Salvato
    </span>
  ) : activeFile && activeFile.isDirty ? (
    <span className="flex items-center text-red-400">
      <Save size={16} className="mr-1" />
      Non Salvato
    </span >
  ) : null;

  return (
    <div className="flex justify-between items-center h-8 bg-editor-darker text-editor-border text-xs px-4 border-t border-editor-border">
      <div className="flex items-center">
        {fileInfo}
      </div>
      <div className="flex items-center">
        {editorSettings}
        {saveStatus}
      </div>
    </div>
  );
}

StatusBar.propTypes = {
  isSaving: PropTypes.bool.isRequired,
};