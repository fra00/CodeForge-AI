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
      let bundledCode;
      const transformer = new TestTransformer(files);

      // filePath è una stringa (il percorso) o undefined (se chiamato dalla UI per tutti i test).
      // Non è l'oggetto file completo, quindi controlliamo direttamente il valore.
      if (!filePath || filePath === "__all__") {
        // Esecuzione di tutti i test
        const testFiles = Object.values(files).filter(
          (f) =>
            !f.isFolder &&
            /\.(test|spec)\.(js|jsx|ts|tsx)$/.test(f.name)
        );

        if (testFiles.length === 0) {
          throw new Error("Nessun file di test trovato nel progetto.");
        }

        // Crea un entry point virtuale che importa tutti i file di test
        const entryCode = testFiles
          .map((f) => {
            const relativePath = f.path.startsWith('/') ? `.${f.path}` : `./${f.path}`;
            return `import '${relativePath}';`;
          })
          .join("\n");
        
        // Trasforma questo codice virtuale
        bundledCode = transformer.transformVirtual(entryCode);
      } else {
        // Esecuzione singolo file
        bundledCode = transformer.transform(filePath);
      }

      
      // Esegue il test in un Web Worker isolato
      const sandbox = new TestSandbox();
      const onStatusUpdate = (message) => {
        set((state) => ({ statusMessages: [...state.statusMessages, message] }));
      };
      const testResults = await sandbox.executeTest(bundledCode, onStatusUpdate);

      console.log("Test Results:", testResults);
      set({ results: testResults });
      return testResults; // Restituisce i risultati al chiamante (es. AI)
    } catch (err) {
      console.error("Errore durante l'esecuzione dei test:", err);
      set({
        error: err.message,
        results: { rawOutput: err.stack }, // Salva lo stack per il debug
      });
      throw err; // Rilancia l'errore per il chiamante
    } finally {
      // 4. Resetta lo stato di esecuzione.
      set({ isRunning: false, runningTestPath: null, statusMessages: [] });
    }
  },
}));