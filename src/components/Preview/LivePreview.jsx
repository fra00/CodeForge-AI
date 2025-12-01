import React, { useState, useCallback, useMemo, useEffect } from "react";
import { useFileStore } from "../../stores/useFileStore";
import { useAIStore } from "../../stores/useAIStore";
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
const SandpackLogInterceptor = ({ onLog }) => {
  const { listen } = useSandpack();

  useEffect(() => {
    // listen() ci permette di ascoltare i messaggi dal bundler/iframe
    const unsubscribe = listen((msg) => {
      if (msg.type === "console" && msg.log) {
        // msg.log contiene { method: 'log'|'error', data: [...] }
        onLog({
          type: msg.log.method,
          // Aggiungiamo un fallback a un array vuoto per evitare crash se msg.log.data è undefined
          data: (msg.log.data || []).map((d) => String(d)),
          timestamp: new Date().toISOString(),
        });
      }
    });
    return unsubscribe;
  }, [listen, onLog]);

  return null;
};

// --- Main Component ---
export function LivePreview({ className = "" }) {
  const vfsFiles = useFileStore((state) => state.files);
  const rootId = useFileStore((state) => state.rootId);
  const currentChatId = useAIStore((state) => state.currentChatId);
  const conversations = useAIStore((state) => state.conversations);

  const currentChat = conversations.find((c) => c.id === currentChatId);
  const environment = currentChat?.environment || "web";

  const [logs, setLogs] = useState([]);
  // Usiamo questa key SOLO per il pulsante "Refresh" manuale, non per ogni tasto premuto
  const [refreshKey, setRefreshKey] = useState(0);

  // State to manage the external window
  const [isWindowOpen, setIsWindowOpen] = useState(false);

  const handleClearConsole = useCallback(() => setLogs([]), []);

  // Conversione memoizzata
  const sandpackFiles = useMemo(() => {
    return convertVfsToSandpackFiles(vfsFiles, rootId);
  }, [vfsFiles, rootId]);

  // Gestione Logs
  const handleLog = useCallback((logItem) => {
    setLogs((prev) => [...prev, logItem]);

    // Auto-debugging AI
    if (
      logItem.type === "error" &&
      typeof window.handleIframeError === "function"
    ) {
      window.handleIframeError(logItem.data.join(" "));
    }
  }, []);

  const handleRefresh = useCallback(() => {
    setRefreshKey((prev) => prev + 1);
    handleClearConsole();
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
      showRefreshButton={false}
      showNavigator={true}
    />
  );

  // 1. Define common props for the Provider to avoid duplication
  const sandpackProps = useMemo(
    () => ({
      files: sandpackFiles,
      template: template,
      theme: sandpackDark,
      options: {
        autoReload: true,
      },
    }),
    [sandpackFiles, template]
  );

  // 2. Define the content for the Popup
  // IMPORTANT: Here we wrap the preview in its OWN specific Provider
  const PopupContent = (
    <div className="h-screen w-screen flex flex-col bg-gray-900">
      <SandpackProvider {...sandpackProps}>
        <SandpackLayout className="flex-1 h-full w-full">
          <SandpackPreview
            className="h-full w-full"
            showOpenInCodeSandbox={false}
            showRefreshButton={true} // Show refresh button in popup
            showNavigator={true}
          />
          {/* Also add the interceptor here if you want logs from the popup */}
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
      <div className="flex-1 relative min-h-0">
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

            {/* <SandpackLayout style={{ "--sp-layout-height": "100%" }}> */}
            <SandpackLayout>
              {PreviewComponent}
              <SandpackLogInterceptor onLog={handleLog} />
            </SandpackLayout>
          </SandpackProvider>
        )}
      </div>

      <ConsolePanel logs={logs} onClear={handleClearConsole} />
    </div>
  );
}
