import React, { useMemo } from "react";
import PropTypes from "prop-types";
import { Upload, Download, Settings, Code } from "lucide-react";
import { useFileStore } from "../../stores/useFileStore";

/**
 * Componente Header per la barra superiore dell'applicazione.
 * Contiene il titolo, il nome del progetto e i pulsanti di azione.
 */
export function Header({ onImport, onExport, onOpenSettings }) {
  const store = useFileStore();
  const activeFile = useMemo(
    () => store.getActiveFile(),
    [store.activeFileId, store.files]
  );
  const projectName = "CodeForge AI"; // Nome fisso per l'MVP

  return (
    <header className="h-10 bg-editor-darker border-b border-editor-border flex items-center justify-between px-4 text-white">
      {/* Logo e Titolo */}
      <div className="flex items-center">
        <Code size={20} className="mr-2 text-blue-400" />
        <h1 className="text-lg font-bold mr-4">{projectName}</h1>
        {activeFile && (
          <span className="text-sm text-editor-border">
            / {activeFile.path}
          </span>
        )}
      </div>

      {/* Pulsanti di Azione */}
      <div className="flex items-center space-x-3">
        {/* <button
          onClick={onNewFile}
          className="p-1 rounded hover:bg-editor-highlight transition-colors duration-150"
          title="Nuovo File (Ctrl+N)"
        >
          <FilePlus size={18} />
        </button> */}
        <button
          onClick={onImport}
          className="p-1 rounded hover:bg-editor-highlight transition-colors duration-150"
          title="Importa Progetto da ZIP"
        >
          <Upload size={18} />
        </button>
        <button
          onClick={onExport}
          className="p-1 rounded hover:bg-editor-highlight transition-colors duration-150"
          title="Esporta Progetto (ZIP)"
        >
          <Download size={18} />
        </button>
        <button
          onClick={onOpenSettings}
          className="p-1 rounded hover:bg-editor-highlight transition-colors duration-150"
          title="Impostazioni"
        >
          <Settings size={18} />
        </button>
      </div>
    </header>
  );
}

Header.propTypes = {
  onImport: PropTypes.func.isRequired,
  onExport: PropTypes.func.isRequired,
  onOpenSettings: PropTypes.func.isRequired,
};
