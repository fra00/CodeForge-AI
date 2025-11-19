import { useEffect, useCallback } from 'react';

/**
 * Custom hook per registrare e gestire le scorciatoie da tastiera globali.
 * @param {object} shortcuts - Un oggetto dove la chiave è la combinazione di tasti (es. 'Control+s') e il valore è la funzione di callback.
 * @param {Array<any>} dependencies - Array di dipendenze per useCallback.
 */
export function useKeyboardShortcuts(shortcuts, dependencies = []) {
  const handleKeyDown = useCallback((event) => {
    const { key, ctrlKey, metaKey, shiftKey, altKey } = event;

    // Normalizza la combinazione di tasti
    const keys = [];
    if (ctrlKey) keys.push('Control');
    if (metaKey) keys.push('Meta'); // Command key on Mac
    if (shiftKey) keys.push('Shift');
    if (altKey) keys.push('Alt');
    keys.push(key.toLowerCase());

    const combination = keys.join('+');

    // Cerca la scorciatoia
    const action = shortcuts[combination];

    if (action) {
      event.preventDefault();
      action(event);
    }
  }, [shortcuts, ...dependencies]);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleKeyDown]);
}