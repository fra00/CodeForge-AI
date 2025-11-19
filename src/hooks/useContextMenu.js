import { useState, useCallback, useEffect } from 'react';

/**
 * Custom hook per gestire lo stato e la posizione di un menu contestuale.
 * @returns {{
 *   contextMenu: { x: number, y: number, targetId: string } | null,
 *   handleContextMenu: (e: React.MouseEvent, targetId: string) => void,
 *   handleCloseContextMenu: () => void
 * }}
 */
export function useContextMenu() {
  const [contextMenu, setContextMenu] = useState(null);

  /**
   * Gestisce l'evento di click destro per mostrare il menu.
   * @param {React.MouseEvent} e - L'evento del mouse.
   * @param {string} targetId - L'ID dell'elemento su cui è stato cliccato.
   */
  const handleContextMenu = useCallback((e, targetId) => {
    e.preventDefault();
    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      targetId,
    });
  }, []);

  /**
   * Chiude il menu contestuale.
   */
  const handleCloseContextMenu = useCallback(() => {
    setContextMenu(null);
  }, []);

  // Effetto per chiudere il menu al click sinistro
  useEffect(() => {
    const handleClick = () => {
      if (contextMenu) {
        handleCloseContextMenu();
      }
    };

    document.addEventListener('click', handleClick);
    return () => {
      document.removeEventListener('click', handleClick);
    };
  }, [contextMenu, handleCloseContextMenu]);

  return {
    contextMenu,
    handleContextMenu,
    handleCloseContextMenu,
  };
}