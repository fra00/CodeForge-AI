import React, {
  useState,
  useCallback,
  useMemo,
  useEffect,
  useRef,
} from "react";
import { useFileStore } from "../../stores/useFileStore";
import { useAIStore } from "../../stores/useAIStore";
import errorCatcherCode from "./error-catcher.js?raw"; // Importa il codice come stringa
import { ConsolePanel } from "./Console";
import {
  SandpackProvider,
  SandpackPreview,
  SandpackLayout,
  useSandpack,
} from "@codesandbox/sandpack-react";
import { sandpackDark } from "@codesandbox/sandpack-themes";
import { PreviewToolbar } from "./PreviewToolbar";
import { WindowPortal } from "./WindowPortal"; // Import the new component

// --- Helper Conversion ---
const convertVfsToSandpackFiles = (vfsFiles, rootId) => {
  const sandpackFiles = {};
  const rootChildren = vfsFiles[rootId]?.children || [];

  const traverse = (childrenIds, currentPath) => {
    for (const id of childrenIds) {
      const file = vfsFiles[id];
      if (!file) continue;

      if (file.isFolder) {
        if (file.children)
          traverse(file.children, `${currentPath}${file.name}/`);
        continue;
      }

      const fullPath = `${currentPath}${file.name}`;
      sandpackFiles[`/${fullPath}`] = {
        code: file.content || "",
        // Importante: active true se vuoi forzare l'apertura di un file specifico,
        // ma di solito lo gestisce l'utente cliccando.
      };
    }
  };

  traverse(rootChildren, "");

  // Fix per entry point React se manca main.jsx ma c'è main.js
  if (!sandpackFiles["/src/main.jsx"] && sandpackFiles["/src/main.js"]) {
    sandpackFiles["/src/main.jsx"] = sandpackFiles["/src/main.js"];
    delete sandpackFiles["/src/main.js"];
  }

  // Assicuriamoci che package.json esista se servono dipendenze,
  // altrimenti Sandpack usa i default.
  return sandpackFiles;
};

// --- Componente per Intercettare i Log ---
// Questo deve stare DENTRO il Provider per funzionare
const SandpackLogInterceptor = ({ onLog, onClear }) => {
  const { listen } = useSandpack();

  useEffect(() => {
    // listen() ci permette di ascoltare i messaggi dal bundler/iframe
    const unsubscribe = listen((msg) => {
      // Se Sandpack inizia una nuova esecuzione, puliamo la console.
      if (msg.type === "done") {
        onClear();
        return;
      }

      // 🛡️ GUARDIA DI ROBUSTEZZA:
      // Filtra solo i veri messaggi di console, ignorando gli eventi interni di Sandpack
      // che possono avere type: 'console' ma method non validi (es. 'u' per unmount).
      const validConsoleMethods = ["log", "error", "warn", "info", "debug"];

      if (
        msg.type === "console" &&
        msg.log &&
        validConsoleMethods.includes(msg.log.method)
      ) {
        // msg.log contiene { method: 'log'|'error', data: [...] }
        onLog({
          type: msg.log.method,
          // Aggiungiamo un fallback a un array vuoto per evitare crash se msg.log.data è undefined
          data: (msg.log.data || []).map((d) =>
            d === undefined ? "undefined" : String(d)
          ),
          timestamp: new Date().toISOString(),
        });
      } else if (
        (msg.type === "action" && msg.action === "show-error" && msg.payload) ||
        (msg.type === "error" && msg.error)
      ) {
        // --- GESTIONE ERRORI DI RUNTIME ---
        // Cattura sia gli errori inviati come 'action' (es. ReferenceError)
        // sia quelli inviati come 'error'.
        // CORREZIONE: Sandpack incapsula l'errore. Estraiamo l'oggetto completo.
        const errorObject = msg.error || msg.payload;
        onLog({
          type: "error", // Classifichiamo come un errore
          // Passiamo l'intero oggetto errore per preservare lo stack trace.
          data: [errorObject],
          timestamp: new Date().toISOString(),
        });
      }
    });
    return unsubscribe;
  }, [listen, onLog, onClear]);

  return null;
};

// --- Main Component ---
export function LivePreview({ className = "", onRefresh: onRefreshProp }) {
  const vfsFiles = useFileStore((state) => state.files);
  const rootId = useFileStore((state) => state.rootId);
  const currentChatId = useAIStore((state) => state.currentChatId);
  const conversations = useAIStore((state) => state.conversations);

  const currentChat = conversations.find((c) => c.id === currentChatId);
  const environment = currentChat?.environment || "web";

  const [logs, setLogs] = useState([]);
  // Usiamo questa key SOLO per il pulsante "Refresh" manuale, non per ogni tasto premuto
  const [refreshKey, setRefreshKey] = useState(0);

  // Ref per il contenitore della preview per calcolare l'altezza disponibile
  const containerRef = useRef(null);
  const [containerHeight, setContainerHeight] = useState(0);

  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setContainerHeight(entry.contentRect.height);
      }
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  // --- LISTENER PER L'ERROR CATCHER ---
  // La dichiarazione di handleLog deve precedere il suo utilizzo nell'useEffect.
  const handleLog = useCallback((logItem) => {
    setLogs((prev) => [...prev, logItem]);

    // Auto-debugging AI
    if (
      logItem.type === "error" &&
      typeof window.handleIframeError === "function"
    ) {
      // Modifica: Passiamo il primo elemento di data, che ora è l'oggetto errore.
      // Aggiungiamo un controllo per assicurarci che esista.
      const errorObject = logItem.data && logItem.data[0];
      if (errorObject) {
        window.handleIframeError(errorObject);
      }
    }
  }, []);

  // Funzione unificata per pulire sia la console che gli errori nella status bar.
  const handleClearConsole = useCallback(() => {
    setLogs([]);
    if (onRefreshProp) {
      onRefreshProp();
    }
  }, [onRefreshProp]);

  // Esponi la funzione di pulizia della console globalmente per l'AI
  useEffect(() => {
    window.clearProjectConsole = handleClearConsole;
    return () => delete window.clearProjectConsole;
  }, [handleClearConsole]);

  useEffect(() => {
    const handleCustomError = (event) => {
      // Controlla che il messaggio provenga dalla nostra fonte e abbia il tipo corretto.
      if (event.data && event.data.type === "custom-sandpack-error") {
        const errorPayload = event.data.payload;
        handleLog({
          type: "error",
          // CORREZIONE: Passiamo l'intero oggetto payload per preservare lo stack trace
          data: [errorPayload],
          timestamp: new Date().toISOString(),
        });
      }
    };

    window.addEventListener("message", handleCustomError);
    return () => window.removeEventListener("message", handleCustomError);
  }, [handleLog]); // handleLog è wrappato in useCallback, quindi è sicuro.

  // State to manage the external window
  const [isWindowOpen, setIsWindowOpen] = useState(false);

  // Conversione memoizzata
  const sandpackFiles = useMemo(() => {
    const files = convertVfsToSandpackFiles(vfsFiles, rootId);

    // --- INIEZIONE ROBUSTA DELL'ERROR CATCHER ---
    // Lo facciamo qui per assicurarci che venga ricalcolato ogni volta che i file cambiano.
    files["/error-catcher.js"] = { code: errorCatcherCode, hidden: true };

    // Se index.html esiste, iniettiamo lo script.
    if (files["/index.html"]) {
      const bodyTagRegex = /<body.*?>/i; // Regex per trovare <body>, <BODY>, <body class="...">, etc.

      // Evita iniezioni multiple se il codice è già presente
      if (
        !files["/index.html"].code.includes('src="/error-catcher.js"') &&
        bodyTagRegex.test(files["/index.html"].code)
      ) {
        files["/index.html"].code = files["/index.html"].code.replace(
          bodyTagRegex,
          (match) => `${match}\n    <script src="/error-catcher.js"></script>`
        );
      }
    }
    return files;
  }, [vfsFiles, rootId]);

  const handleRefresh = useCallback(() => {
    setRefreshKey((prev) => prev + 1);
    handleClearConsole(); // Ora questa funzione fa tutto il lavoro.
  }, [handleClearConsole]);

  const template = environment === "react" ? "vite-react" : "static";
  // const template = environment === "react" ? "vite-react" : "vanilla";

  // Handlers for opening/closing the portal window, wrapped in useCallback
  const handleOpenInNewWindow = useCallback(() => setIsWindowOpen(true), []);
  const handleCloseWindow = useCallback(() => setIsWindowOpen(false), []);

  // Define the PreviewComponent separately for reuse
  const PreviewComponent = (
    <SandpackPreview
      className="w-full h-full border-none bg-white"
      showOpenInCodeSandbox={false}
      showRefreshButton={true}
      showNavigator={true}
      style={{ height: containerHeight ? `${containerHeight}px` : "100%" }}
    />
  );

  // 1. Define common props for the Provider to avoid duplication
  const sandpackProps = useMemo(
    () => ({
      files: sandpackFiles,
      template: template,
      theme: sandpackDark,
      options: { autoReload: true },
    }), // Rimuoviamo handleLog dalle dipendenze, non è necessario
    [sandpackFiles, template]
  );

  // 2. Define the content for the Popup
  // IMPORTANT: Here we wrap the preview in its OWN specific Provider
  const PopupContent = (
    <div className="h-screen w-screen flex flex-col bg-gray-900">
      <SandpackProvider {...sandpackProps}>
        {/* Le props comuni (incluso il template) vengono passate qui */}
        <SandpackLayout className="flex-1 h-full w-full">
          <SandpackPreview
            className="h-full w-full"
            showOpenInCodeSandbox={false}
            showRefreshButton={true} // Show refresh button in popup
            showNavigator={true}
          />
          {/*
            Aggiungiamo l'intercettore anche qui per catturare i console.log
            generati dalla finestra popup.
          */}
          <SandpackLogInterceptor onLog={handleLog} />
        </SandpackLayout>
      </SandpackProvider>
    </div>
  );

  // Determina se siamo in modalità popup controllando l'URL.
  const isPopupMode = window.location.pathname === "/preview-popup";

  return (
    <div
      className={`flex flex-col bg-editor-bg ${className} ${
        isPopupMode ? "absolute inset-0 z-50" : "h-full w-full"
      }`}
    >
      <PreviewToolbar
        onRefresh={handleRefresh}
        onOpenInNewWindow={handleOpenInNewWindow}
        isWindowOpen={isWindowOpen}
        onViewportChange={() => {}}
        currentViewport="full"
      />

      {/* Il provider stesso non ha bisogno di classi di layout, ma i suoi figli sì.
          Usiamo flex-1 per dire a questo contenitore di riempire lo spazio disponibile. */}
      <div ref={containerRef} className="flex-1 relative min-h-0">
        {isWindowOpen ? (
          // --- CASE 1: Window is Open ---
          <>
            <div className="flex items-center justify-center w-full h-full text-gray-400 bg-gray-900">
              <div className="text-center">
                <p className="mb-4">Preview is active in a new window.</p>
                <button
                  onClick={handleCloseWindow}
                  className="px-4 py-2 bg-blue-600 rounded hover:bg-blue-500 text-white font-medium"
                >
                  Bring Preview Back Here
                </button>
              </div>
            </div>

            <WindowPortal onClose={handleCloseWindow} title="Live Preview">
              {PopupContent}
            </WindowPortal>
          </>
        ) : (
          // --- CASE 2: Normal In-App View ---
          <SandpackProvider
            key={refreshKey}
            {...sandpackProps}
            // Applichiamo h-full qui. Il Provider renderizzerà un div che riempie il suo contenitore.
            className="h-full w-full"
          >
            {/* La soluzione corretta è usare la variabile CSS che Sandpack espone per il layout.
                Questo forza il layout a prendere il 100% dell'altezza del suo contenitore genitore (il div con flex-1). */}

            <SandpackLayout>
              {PreviewComponent}
              {/*
                Questo intercetta i console.log e alcuni errori.
                onUncaughtError su SandpackPreview cattura gli altri.
                Usandoli entrambi abbiamo la massima copertura.
              */}
              <SandpackLogInterceptor
                onLog={handleLog}
                onClear={handleClearConsole}
              />
            </SandpackLayout>
          </SandpackProvider>
        )}
      </div>

      <ConsolePanel logs={logs} onClear={handleClearConsole} />
    </div>
  );
}
