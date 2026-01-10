import React, { useEffect, useState, useCallback } from "react";
import { useFileStore } from "./stores/useFileStore";
import { EditorArea } from "./components/Editor/EditorArea";
import {
  Panel as ResizablePanel,
  PanelGroup as ResizablePanelGroup,
  PanelResizeHandle as ResizableHandle,
} from "react-resizable-panels";
import { ChevronUp, ChevronDown, RotateCcw } from "lucide-react";
import { useSettingsStore } from "./stores/useSettingsStore";
import { useAIStore } from "./stores/useAIStore";
import { Header } from "./components/Layout/Header";
import { Sidebar } from "./components/Layout/Sidebar";
import { useMediaQuery } from "./hooks/useMediaQuery";
import { StatusBar } from "./components/Editor/StatusBar"; // Riutilizzo la StatusBar dell'editor come status bar principale
import { useAutoSave } from "./hooks/useAutoSave"; // Importo useAutoSave per lo stato di salvataggio

import { FileExplorer } from "./components/FileSystem/FileExplorer";
import { AIPanel } from "./components/AI/AIPanel";
import { ChatHistoryPanel } from "./components/AI/ChatHistoryPanel"; // Importa il pannello
import { PreviewContainer } from "./components/Preview/PreviewContainer";
import { SettingsPanel } from "./components/Settings/SettingsPanel";
// La ErrorDialog non è più necessaria, il sistema ora è automatico.
import { useTestRunner } from "./hooks/useTestRunner";
import { TestResultsPanel } from "./components/Testing/TestResultsPanel";
import { BlockingOverlay } from "./components/Layout/BlockingOverlay";
import { NewProjectModal } from "./components/Modals/NewProjectModal";

// Importa i CSS dei componenti UI riutilizzabili
import "./components/ui/Dialog.css";
import "./components/ui/Card.css";
import "./components/ui/Button.css";

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
  const createFileOrFolder = useFileStore((state) => state.createFileOrFolder);
  const rootId = useFileStore((state) => state.rootId);
  // Recupera le funzioni per la gestione della chat AI
  const {
    conversations,
    currentChatId,
    newChat,
    selectChat,
    deleteChat,
    loadConversations: loadAiConversations,
    extendPromptWith2WHAV, // Recupera la nuova funzione
    setInitialPrompt: setAiInitialPrompt, // Recupera l'azione dallo store
    setChatEnvironment,
  } = useAIStore();
  const {
    runTests,
    runningTestPath,
    isRunning: isTesting,
    results: testResults,
    error: testError,
    statusMessages,
  } = useTestRunner();
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
  const [runtimeErrors, setRuntimeErrors] = useState([]);
  const [isTestPanelCollapsed, setIsTestPanelCollapsed] = useState(false);
  const [isNewProjectModalOpen, setIsNewProjectModalOpen] = useState(false);

  // Lo stato showFileExplorer non è più necessario, la visibilità è gestita da useSettingsStore

  // Carica i file all'avvio dell'applicazione
  useEffect(() => {
    loadFiles();
    loadAiConversations();
  }, [loadFiles]);

  // Sincronizza l'environment della chat con quello del progetto al caricamento
  useEffect(() => {
    if (isInitialized && conversations.length > 0) {
      const state = useFileStore.getState();
      const files = state.files;
      const configFile = Object.values(files).find(
        (f) =>
          f.path === "/.llmContext/project.json" ||
          f.path === ".llmContext/project.json"
      );

      if (configFile && configFile.content) {
        try {
          const config = JSON.parse(configFile.content);
          if (config.environment) {
            const currentChat = conversations.find((c) => c.id === currentChatId);
            // Se l'environment della chat è diverso da quello del progetto, lo aggiorniamo
            if (currentChat && currentChat.environment !== config.environment) {
              setChatEnvironment(config.environment);
            }
          }
        } catch (e) {
          console.error("Error parsing project.json for env sync:", e);
        }
      }
    }
  }, [isInitialized, conversations, currentChatId, setChatEnvironment]);

  // Imposta il gestore di errori per l'iframe
  useEffect(() => {
    // Inizializza il contesto globale se non esiste
    window.projectContext = window.projectContext || {}; // Correzione: Garantisce che l'oggetto esista.

    // Modificato per accettare un oggetto errore o una stringa
    window.handleIframeError = (error) => {
      console.log("ERROR LATCHED:", error);
      let formattedMessage;
      if (typeof error === "object" && error !== null && error.message) {
        // Caso: è un oggetto Error con message e (forse) stack
        formattedMessage = error.message;
        if (error.stack) {
          const stackSnippet = error.stack.substring(0, 200);
          formattedMessage += `\n\nStack Trace (snippet):\n${stackSnippet}...`;
        }
      } else {
        // Caso: è una stringa o un altro tipo
        formattedMessage = String(error);
      }

      // Aggiunge l'errore alla lista, evitando duplicati esatti
      setRuntimeErrors((prevErrors) => [
        ...new Set([...prevErrors, formattedMessage]),
      ]);
    };

    // Funzione per gestire il click su un errore nella console
    window.projectContext.handleErrorClick = (errorMessage) => {
      // CORREZIONE: Assicuriamoci di passare sempre una stringa formattata.
      // Se `errorMessage` è un oggetto Error, lo formattiamo.
      let finalMessage;
      if (
        typeof errorMessage === "object" &&
        errorMessage !== null &&
        errorMessage.message
      ) {
        finalMessage = errorMessage.message;
        if (errorMessage.stack) {
          const stackSnippet = errorMessage.stack.substring(0, 200);
          finalMessage += `\n\nStack Trace (snippet):\n${stackSnippet}...`;
        }
      } else {
        finalMessage = String(errorMessage);
      }

      setActivePanel("ai");
      setAiInitialPrompt(finalMessage); // Notifica lo store con una stringa
    };

    return () => {
      if (window.handleIframeError) delete window.handleIframeError;
      // Pulisce la funzione quando il componente viene smontato
      if (window.projectContext.handleErrorClick) {
        delete window.projectContext.handleErrorClick;
      }
    };
  }, [setAiInitialPrompt]); // Aggiunta dipendenza

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

  // Gestione creazione nuovo progetto
  const handleNewProjectRequest = () => {
    setIsNewProjectModalOpen(true);
  };

  const handleCreateProject = async (environment) => {
    await resetProject();

    // 1. Persistenza Environment: Crea cartella e file di configurazione nel VFS
    const configFolder = createFileOrFolder(rootId, ".llmContext", true);
    if (configFolder) {
      const configContent = JSON.stringify(
        {
          environment: environment,
          created_at: new Date().toISOString(),
          version: "1.0",
        },
        null,
        2
      );
      createFileOrFolder(configFolder.id, "project.json", false, configContent);
    }

    // 2. Inizializza la chat con l'environment selezionato
    newChat(environment);
    setIsNewProjectModalOpen(false);
  };

  // Funzioni di callback per l'Header
  const handleNewProject = handleNewProjectRequest;
  const handleExport = downloadProjectZip; // Collega la funzione dello store
  const handleOpenSettings = () => setActivePanel("settings");

  // Funzione per gestire l'importazione
  const handleImport = async (event) => {
    const file = event.target.files[0];
    if (file) {
      await importProjectFromZip(file);

      // 3. Rilevamento Environment: Legge il file di configurazione dal VFS
      const state = useFileStore.getState();
      const files = state.files;
      const configFile = Object.values(files).find(
        (f) =>
          f.path === "/.llmContext/project.json" ||
          f.path === ".llmContext/project.json"
      );

      let env = "web"; // Fallback default
      if (configFile && configFile.content) {
        try {
          const config = JSON.parse(configFile.content);
          if (config.environment) {
            env = config.environment;
          }
        } catch (e) {
          console.error("Errore parsing project.json:", e);
        }
      }

      // Allinea la chat con l'environment rilevato
      newChat(env);
    }
    // Resetta l'input per permettere di caricare lo stesso file di nuovo
    event.target.value = null;
  };

  // Funzione per triggerare il click sull'input file nascosto
  const triggerImport = () =>
    document.getElementById("import-zip-input")?.click();

  // Callback per l'esecuzione dei test
  const handleRunTest = useCallback(
    (filePath) => {
      runTests(filePath);
    },
    [runTests]
  );

  const handleRunAllTests = useCallback(() => runTests(), [runTests]);

  const handleFixError = () => {
    if (runtimeErrors.length > 0) {
      const combinedErrors = `Please fix the following ${runtimeErrors.length} error(s):\n\n---\n\n${runtimeErrors.join("\n\n---\n\n")}`;
      window.projectContext.handleErrorClick(combinedErrors);
      setRuntimeErrors([]); // Resetta gli errori dopo averli inviati all'AI
    }
  };

  const clearRuntimeErrors = useCallback(() => {
    setRuntimeErrors([]);
  }, []);

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
                <PreviewContainer onRefresh={clearRuntimeErrors} />
              </ResizablePanel>
            </>
          )}
        </ResizablePanelGroup>
      );
      break;
    case "ai":
      // Passiamo la nuova funzione al pannello AI.
      // AIPanel internamente la userà per il pulsante "Estendi Prompt".
      mainContent = <AIPanel extendPromptAction={extendPromptWith2WHAV} />;
      break;
    case "settings":
      mainContent = <SettingsPanel />;
      break;
    case "live-preview": // Nuovo pannello per la preview a schermo intero su mobile
      mainContent = <PreviewContainer onRefresh={clearRuntimeErrors} />;
      break;
    default:
      mainContent = <AIPanel />;
  }

  // Determina il contenuto del pannello inferiore
  const showTestPanel = isTesting || testResults || testError;

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

      <NewProjectModal
        isOpen={isNewProjectModalOpen}
        onClose={() => setIsNewProjectModalOpen(false)}
        onConfirm={handleCreateProject}
      />

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
        {activePanel === "editor" && (
          <FileExplorer
            onRunTest={handleRunTest}
            onRunAllTests={handleRunAllTests}
            runningTestPath={runningTestPath}
            isTesting={isTesting}
          />
        )}
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
      <StatusBar
        isSaving={isSaving}
        runtimeErrors={runtimeErrors}
        onFixError={handleFixError}
        showTestTab={!!(testResults || testError || isTesting)}
      />

      {/* Pannello Inferiore Dinamico (es. Risultati Test) */}
      {showTestPanel && (
        <div
          className={`border-t border-editor-border bg-editor-darker transition-all duration-200 ease-in-out flex flex-col ${
            isTestPanelCollapsed ? "h-9" : "h-64"
          }`}
        >
          <div
            className="flex items-center justify-between p-2 border-b border-editor-border text-xs font-semibold cursor-pointer hover:bg-editor-highlight select-none"
            onClick={() => setIsTestPanelCollapsed(!isTestPanelCollapsed)}
          >
            <div className="flex items-center gap-2">
              <span>Test Results</span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleRunAllTests();
                }}
                disabled={isTesting}
                className="p-1 rounded text-gray-400 hover:text-white hover:bg-white/10 transition-colors disabled:opacity-50"
                title="Rerun All Tests"
              >
                <RotateCcw
                  size={14}
                  className={isTesting ? "animate-spin" : ""}
                />
              </button>
            </div>
            <button className="text-gray-400 hover:text-white focus:outline-none">
              {isTestPanelCollapsed ? (
                <ChevronUp size={16} />
              ) : (
                <ChevronDown size={16} />
              )}
            </button>
          </div>
          {!isTestPanelCollapsed && (
            <div className="flex-1 overflow-hidden">
              <TestResultsPanel
                results={testResults}
                error={testError}
                isRunning={isTesting}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default App;
