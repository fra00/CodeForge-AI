import { create } from "zustand";
import { useFileStore } from "../stores/useFileStore";
import { TestSandbox } from "../testing/TestSandbox.js";
import { TestTransformer } from "../testing/TestTransformer.js";

/**
 * Hook e store Zustand per gestire l'esecuzione dei test con il nostro runner custom.
 */
export const useTestRunner = create((set, get) => ({
  // --- STATO ---
  isRunning: false, // Flag generico per indicare se un'operazione di test è in corso.
  runningTestPath: null, // Percorso del file di test specifico in esecuzione, se applicabile.
  results: null, // Risultati JSON prodotti dal nostro runner.
  error: null, // Messaggio di errore in caso di fallimento.
  statusMessages: [], // Nuovo: per i log dal worker

  // --- AZIONI ---

  /**
   * Avvia un'esecuzione di test.
   * @param {string} [filePath] - Il percorso opzionale del file di test da eseguire.
   */
  runTests: async (filePath) => {
    const { files } = useFileStore.getState();

    set({
      isRunning: true,
      runningTestPath: filePath || "__all__", // Usa un identificatore speciale per "tutti i test"
      results: null,
      error: null,
      statusMessages: [], // Pulisce i messaggi precedenti
    });
    try {
      // Per ora, gestiamo solo l'esecuzione di un singolo file
      if (!filePath) {
        throw new Error("L'esecuzione di tutti i test non è ancora implementata.");
      }

      const testFile = Object.values(files).find(f => f.path === filePath);
      if (!testFile) {
        throw new Error(`File di test non trovato: ${filePath}`);
      }

      // 1. Trasforma il codice per risolvere gli import
      const transformer = new TestTransformer(files);
      const bundledCode = transformer.transform(filePath);
      
      // Esegue il test in un Web Worker isolato
      const sandbox = new TestSandbox();
      const onStatusUpdate = (message) => {
        set((state) => ({ statusMessages: [...state.statusMessages, message] }));
      };
      const testResults = await sandbox.executeTest(bundledCode, onStatusUpdate);

      console.log("Test Results:", testResults);
      set({ results: testResults });

    } catch (err) {
      console.error("Errore durante l'esecuzione dei test:", err);
      set({
        error: err.message,
        results: { rawOutput: err.stack }, // Salva lo stack per il debug
      });
    } finally {
      // 4. Resetta lo stato di esecuzione.
      set({ isRunning: false, runningTestPath: null, statusMessages: [] });
    }
  },
}));