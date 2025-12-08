import React, { useEffect, useState } from "react";
import { useFileStore } from "./stores/useFileStore";
import { EditorArea } from "./components/Editor/EditorArea";
import {
  Panel as ResizablePanel,
  PanelGroup as ResizablePanelGroup,
  PanelResizeHandle as ResizableHandle,
} from "react-resizable-panels";
import { useSettingsStore } from "./stores/useSettingsStore";
import { useAIStore } from "./stores/useAIStore";
import { Header } from "./components/Layout/Header";
import { Sidebar } from "./components/Layout/Sidebar";
import { useMediaQuery } from "./hooks/useMediaQuery";
import { StatusBar } from "./components/Editor/StatusBar"; // Riutilizzo la StatusBar dell'editor come status bar principale
import { useAutoSave } from "./hooks/useAutoSave"; // Importo useAutoSave per lo stato di salvataggio

import { SnippetPanel } from "./components/Snippets/SnippetPanel";
import { FileExplorer } from "./components/FileSystem/FileExplorer";
import { AIPanel } from "./components/AI/AIPanel";
import { ChatHistoryPanel } from "./components/AI/ChatHistoryPanel"; // Importa il pannello
import { LivePreview } from "./components/Preview/LivePreview";
import { SettingsPanel } from "./components/Settings/SettingsPanel";
// La ErrorDialog non è più necessaria, il sistema ora è automatico.
import { BlockingOverlay } from "./components/Layout/BlockingOverlay";

/**
 * Componente principale dell'applicazione.
 * Gestisce l'inizializzazione del file system e il layout principale.
 */
function App() {
  const loadFiles = useFileStore((state) => state.loadFiles);
  const downloadProjectZip = useFileStore((state) => state.downloadProjectZip);
  const importProjectFromZip = useFileStore(
    (state) => state.importProjectFromZip
  );
  const resetProject = useFileStore((state) => state.resetProject);
  // Recupera le funzioni per la gestione della chat AI
  const {
    conversations,
    currentChatId,
    newChat,
    selectChat,
    deleteChat,
    loadConversations: loadAiConversations,
    extendPromptWith2WHAV, // Recupera la nuova funzione
  } = useAIStore();
  const isInitialized = useFileStore((state) => state.isInitialized);
  const isBlockingOperation = useFileStore(
    (state) => state.isBlockingOperation
  );
  const {
    theme,
    sidebarVisible,
    toggleSidebar,
    previewVisible,
    togglePreview,
    setFileExplorerVisible,
    editorPreviewSplitSize,
    setEditorPreviewSplitSize,
  } = useSettingsStore();
  const { isSaving } = useAutoSave(); // Inizializza l'autosave
  const isMobile = useMediaQuery("(max-width: 768px)");

  const [activePanel, setActivePanel] = useState("editor");
  const [initialPrompt, setInitialPrompt] = useState("");

  // Lo stato showFileExplorer non è più necessario, la visibilità è gestita da useSettingsStore

  // Carica i file all'avvio dell'applicazione
  useEffect(() => {
    loadFiles();
    loadAiConversations();
  }, [loadFiles]);

  // Imposta il gestore di errori per l'iframe
  useEffect(() => {
    // Inizializza il contesto globale se non esiste
    window.projectContext = window.projectContext || {}; // Correzione: Garantisce che l'oggetto esista.
    window.projectContext.lastIframeError = null;

    window.handleIframeError = (message) => {
      console.log("ERROR LATCHED:", message);
      window.projectContext.lastIframeError = message;
    };

    // Funzione per gestire il click su un errore nella console
    window.projectContext.handleErrorClick = (errorMessage) => {
      setActivePanel("ai"); // Passa al pannello AI
      setInitialPrompt(errorMessage); // Imposta il prompt iniziale
    };

    return () => {
      if (window.handleIframeError) delete window.handleIframeError;
      // Pulisce la funzione quando il componente viene smontato
      if (window.projectContext.handleErrorClick) {
        delete window.projectContext.handleErrorClick;
      }
    };
  }, []);

  // Sincronizza il tema con l'attributo data-theme sul body
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);

  // Collassa di default il file explorer su mobile
  useEffect(() => {
    if (isMobile) {
      setFileExplorerVisible(false);
    }
  }, [isMobile, setFileExplorerVisible]);

  // Funzioni di callback per l'Header
  const handleNewProject = resetProject;
  const handleExport = downloadProjectZip; // Collega la funzione dello store
  const handleOpenSettings = () => setActivePanel("settings");

  // Funzione per gestire l'importazione
  const handleImport = (event) => {
    const file = event.target.files[0];
    if (file) {
      importProjectFromZip(file);
    }
    // Resetta l'input per permettere di caricare lo stesso file di nuovo
    event.target.value = null;
  };

  // Funzione per triggerare il click sull'input file nascosto
  const triggerImport = () =>
    document.getElementById("import-zip-input")?.click();

  if (!isInitialized) {
    const handleDeleteChat = (chatId) => {
      if (window.confirm("Sei sicuro di voler eliminare questa chat?")) {
        deleteChat(chatId);
      }
    };

    return (
      <div className="flex items-center justify-center h-screen w-screen bg-editor-bg text-white">
        Caricamento File System...
      </div>
    );
  }

  const handleDeleteChat = (chatId) => {
    if (window.confirm("Sei sicuro di voler eliminare questa chat?")) {
      deleteChat(chatId);
    }
  };

  // Determina il contenuto del pannello principale
  let mainContent;
  switch (activePanel) {
    case "editor":
      mainContent = (
        <ResizablePanelGroup
          direction="horizontal"
          onLayout={(sizes) => {
            setEditorPreviewSplitSize(sizes[0]);
          }}
        >
          <ResizablePanel defaultSize={editorPreviewSplitSize}>
            <EditorArea />
          </ResizablePanel>
          {!isMobile && previewVisible && (
            <>
              <ResizableHandle />
              <ResizablePanel
                defaultSize={100 - editorPreviewSplitSize}
                minSize={20}
              >
                <LivePreview />
              </ResizablePanel>
            </>
          )}
        </ResizablePanelGroup>
      );
      break;
    case "ai":
      // Passiamo la nuova funzione al pannello AI.
      // AIPanel internamente la userà per il pulsante "Estendi Prompt".
      mainContent = (
        <AIPanel
          extendPromptAction={extendPromptWith2WHAV}
          initialPrompt={initialPrompt}
        />
      );
      break;
    case "snippets":
      mainContent = <SnippetPanel />;
      break;
    case "settings":
      mainContent = <SettingsPanel />;
      break;
    case "live-preview": // Nuovo pannello per la preview a schermo intero su mobile
      mainContent = <LivePreview />;
      break;
    default:
      mainContent = <AIPanel />;
  }

  return (
    <div className="flex flex-col h-screen w-screen bg-editor-bg">
      {/* Overlay per operazioni bloccanti */}
      <Header
        onNewProject={handleNewProject}
        onExport={handleExport}
        onImport={triggerImport} // Passa la nuova funzione
        onOpenSettings={handleOpenSettings}
      />

      {isBlockingOperation && <BlockingOverlay />}

      {/* Input nascosto per l'upload del file ZIP */}
      <input
        type="file"
        id="import-zip-input"
        className="hidden"
        accept=".zip"
        onChange={handleImport}
      />
      {/* Main Content Area */}
      <main className="flex flex-grow overflow-hidden">
        {/* Sidebar Nav */}
        <Sidebar activePanel={activePanel} onPanelChange={setActivePanel} />

        {/* Pannello Laterale Contestuale */}
        {activePanel === "editor" && <FileExplorer />}
        {activePanel === "ai" && (
          <ChatHistoryPanel
            conversations={conversations}
            currentChatId={currentChatId}
            onSelectChat={selectChat}
            onNewChat={newChat}
            onDeleteChat={handleDeleteChat}
          />
        )}

        {/* Main Panel */}
        {/* Rimosso min-w-0 che causava problemi di schiacciamento */}
        <div className="flex-1 flex overflow-hidden">{mainContent}</div>
      </main>

      {/* Status Bar (Riutilizzo la StatusBar dell'editor) */}
      <StatusBar isSaving={isSaving} />
    </div>
  );
}

export default App;
