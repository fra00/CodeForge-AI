import { useEffect, useRef, useState } from 'react';
import { useFileStore } from '../stores/useFileStore';

const AUTOSAVE_INTERVAL = 2000; // Salva ogni 2 secondi

/**
 * Custom hook per implementare il meccanismo di auto-salvataggio.
 * Salva automaticamente i file "dirty" (modificati) su IndexedDB.
 */
export function useAutoSave() {
  const files = useFileStore(state => state.files);
  const saveFile = useFileStore(state => state.saveFile);
  const [isSaving, setIsSaving] = useState(false);
  const timeoutRef = useRef(null);

  // Effetto per l'auto-salvataggio periodico
  useEffect(() => {
    const dirtyFileIds = Object.values(files)
      .filter(file => file.isDirty && !file.isFolder)
      .map(file => file.id);

    if (dirtyFileIds.length > 0) {
      // Se c'è un timer attivo, lo cancella per evitare salvataggi multipli
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      // Imposta un nuovo timer per il salvataggio
      timeoutRef.current = setTimeout(async () => {
        setIsSaving(true);
        console.log(`Auto-saving ${dirtyFileIds.length} file(s)...`);
        
        // Salva tutti i file modificati in parallelo
        await Promise.all(dirtyFileIds.map(id => saveFile(id)));
        
        setIsSaving(false);
        console.log('Auto-save complete.');
      }, AUTOSAVE_INTERVAL);
    }

    // Cleanup: cancella il timer se il componente si smonta o le dipendenze cambiano
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [files, saveFile]);

  // Effetto per il salvataggio all'unload della finestra
  useEffect(() => {
    const handleBeforeUnload = (event) => {
      const dirtyFileIds = Object.values(files)
        .filter(file => file.isDirty && !file.isFolder)
        .map(file => file.id);

      if (dirtyFileIds.length > 0) {
        // Non possiamo usare async/await qui, ma possiamo avviare il salvataggio
        // e mostrare un messaggio di avviso (anche se i browser moderni lo ignorano)
        console.warn('Unsaved changes detected. Attempting to save before closing...');
        dirtyFileIds.forEach(id => saveFile(id));
        
        // Messaggio di avviso (spesso ignorato)
        event.preventDefault();
        event.returnValue = '';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [files, saveFile]);

  return { isSaving };
}