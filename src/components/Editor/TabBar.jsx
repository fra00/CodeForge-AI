import React, { useMemo } from 'react';
import PropTypes from 'prop-types';
import { X, FileText, FileCode, FileJson } from 'lucide-react';
import { useFileStore } from '../../stores/useFileStore';
import { detectIcon } from '../../utils/languageDetector';

// Mappa i nomi delle icone Lucide alle icone reali
const IconMap = {
  FileText,
  FileCode,
  FileJson,
};

/**
 * Componente per la singola tab di un file aperto.
 */
function TabItem({ file, isActive, onSelect, onClose }) {
  const IconComponent = IconMap[detectIcon(file.name)] || FileText;

  return (
    <div
      className={`flex items-center px-4 py-2 text-sm cursor-pointer transition-colors duration-150 ${
        isActive
          ? 'bg-editor-darker text-white border-t-2 border-blue-500'
          : 'bg-editor-bg text-editor-border hover:bg-editor-highlight'
      }`}
      onClick={() => onSelect(file.id)}
      title={file.path}
    >
      <IconComponent size={14} className="mr-2" />
      <span className={`truncate max-w-[150px] ${file.isDirty ? 'italic' : ''}`}>
        {file.name}
      </span>
      <button
        className="ml-3 p-1 rounded-sm hover:bg-editor-border"
        onClick={(e) => {
          e.stopPropagation(); // Evita di attivare la tab
          onClose(file.id);
        }}
        title="Chiudi"
      >
        <X size={12} />
      </button>
    </div>
  );
}

TabItem.propTypes = {
  file: PropTypes.shape({
    id: PropTypes.string.isRequired,
    name: PropTypes.string.isRequired,
    path: PropTypes.string.isRequired,
    isDirty: PropTypes.bool.isRequired,
  }).isRequired,
  isActive: PropTypes.bool.isRequired,
  onSelect: PropTypes.func.isRequired,
  onClose: PropTypes.func.isRequired,
};

/**
 * Componente per la barra delle tab dell'editor.
 */
export function TabBar() {
  const store = useFileStore();
  const openFiles = useMemo(() => store.getOpenFiles(), [store.files, store.openFileIds]);
  const activeFileId = store.activeFileId;
  const setActiveFile = store.setActiveFile;
  const closeFile = store.closeFile;

  if (openFiles.length === 0) {
    return (
      <div className="h-10 bg-editor-bg border-b border-editor-border flex items-center px-4 text-editor-border text-sm">
        Nessun file aperto
      </div>
    );
  }

  return (
    <div className="flex overflow-x-auto h-10 bg-editor-bg border-b border-editor-border">
      {openFiles.map(file => (
        <TabItem
          key={file.id}
          file={file}
          isActive={file.id === activeFileId}
          onSelect={setActiveFile}
          onClose={closeFile}
        />
      ))}
    </div>
  );
}