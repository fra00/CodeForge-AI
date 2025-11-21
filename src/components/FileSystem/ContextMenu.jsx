import React, { useEffect, useRef } from 'react';
import ReactDOM from 'react-dom';
import PropTypes from 'prop-types';
import { FilePlus, FolderPlus, Edit, Trash, Copy, X } from 'lucide-react';

/**
 * Componente per il singolo elemento del menu contestuale.
 */
function ContextMenuItem({ icon: Icon, label, action, shortcut, disabled = false }) {
  return (
    <button
      onClick={action}
      disabled={disabled}
      className="flex justify-between items-center w-full px-3 py-1.5 text-sm text-white hover:bg-blue-600 transition-colors duration-100 disabled:opacity-50 disabled:cursor-not-allowed"
    >
      <div className="flex items-center">
        <Icon size={16} className="mr-2" />
        <span>{label}</span>
      </div>
      {shortcut && <span className="text-xs text-editor-border">{shortcut}</span>}
    </button>
  );
}

ContextMenuItem.propTypes = {
  icon: PropTypes.elementType.isRequired,
  label: PropTypes.string.isRequired,
  action: PropTypes.func.isRequired,
  shortcut: PropTypes.string,
  disabled: PropTypes.bool,
};

/**
 * Componente del menu contestuale che utilizza un Portal per il rendering.
 */
export function ContextMenu({ x, y, targetId, onClose, onAction, files, rootId }) {
  const menuRef = useRef(null);

  const isRoot = targetId === rootId;

  // Definisco le azioni del menu (placeholder)
  const menuItems = [
    { label: 'Nuovo File', icon: FilePlus, action: () => onAction('newFile', targetId), shortcut: 'Ctrl+N' },
    { label: 'Nuova Cartella', icon: FolderPlus, action: () => onAction('newFolder', targetId) },
    { type: 'separator' },
    { label: 'Rinomina', icon: Edit, action: () => onAction('rename', targetId), shortcut: 'F2', disabled: isRoot },
    { label: 'Elimina', icon: Trash, action: () => onAction('delete', targetId), shortcut: 'Del', disabled: isRoot },
    { type: 'separator' },
    { label: 'Copia Percorso', icon: Copy, action: () => onAction('copyPath', targetId) },
  ];

  // Calcola la posizione per evitare che il menu esca dallo schermo
  const style = {
    top: y,
    left: x,
  };

  // Se il menu è troppo vicino al bordo destro, lo sposta a sinistra
  useEffect(() => {
    if (menuRef.current) {
      const rect = menuRef.current.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;

      if (rect.right > viewportWidth) {
        menuRef.current.style.left = `${x - rect.width}px`;
      }
      if (rect.bottom > viewportHeight) {
        menuRef.current.style.top = `${y - rect.height}px`;
      }
    }
  }, [x, y]);

  // Il menu viene renderizzato tramite Portal
  return ReactDOM.createPortal(
    <div
      ref={menuRef}
      className="fixed z-50 bg-editor-darker border border-editor-border shadow-lg rounded-md py-1 min-w-[180px] flex flex-col"
      style={style}
      onClick={onClose} // Chiude il menu al click su un elemento
    >
      {menuItems.map((item, index) => {
        if (item.type === 'separator') {
          return <div key={`sep-${index}`} className="border-t border-editor-border my-1 mx-2" />;
        }
        return <ContextMenuItem key={item.label} {...item} disabled={item.disabled} />;
      })}
    </div>,
    document.body // Renderizza nel body
  );
}

ContextMenu.propTypes = {
  x: PropTypes.number.isRequired,
  y: PropTypes.number.isRequired,
  targetId: PropTypes.string.isRequired,
  onClose: PropTypes.func.isRequired,
  onAction: PropTypes.func.isRequired,
  files: PropTypes.object.isRequired,
  rootId: PropTypes.string.isRequired,
};