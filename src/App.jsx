import React, { useEffect, useState } from "react";
import { useFileStore } from "./stores/useFileStore";
import { EditorArea } from "./components/Editor/EditorArea";
import { LivePreview } from "./components/Preview/LivePreview";
import { useSettingsStore } from "./stores/useSettingsStore";
import { Header } from "./components/Layout/Header";
import { Sidebar } from "./components/Layout/Sidebar";
import { StatusBar } from "./components/Editor/StatusBar"; // Riutilizzo la StatusBar dell'editor come status bar principale
import { useAutoSave } from "./hooks/useAutoSave"; // Importo useAutoSave per lo stato di salvataggio

import { SnippetPanel } from "./components/Snippets/SnippetPanel";
import { TemplatePanel } from "./components/Templates/TemplatePanel";
import { FileExplorer } from "./components/FileSystem/FileExplorer";
import { AIPanel } from "./components/AI/AIPanel";
import { SettingsPanel } from "./components/Settings/SettingsPanel";

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
  const isInitialized = useFileStore((state) => state.isInitialized);
  const {
    theme,
    sidebarVisible,
    toggleSidebar,
    previewVisible,
    togglePreview,
  } = useSettingsStore();
  const { isSaving } = useAutoSave(); // Inizializza l'autosave

  const [activePanel, setActivePanel] = useState("editor");
  // Lo stato showFileExplorer non è più necessario, la visibilità è gestita da useSettingsStore

  // Carica i file all'avvio dell'applicazione
  useEffect(() => {
    loadFiles();
  }, [loadFiles]);

  // Sincronizza il tema con l'attributo data-theme sul body
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);

  // Funzioni di callback per l'Header
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
    return (
      <div className="flex items-center justify-center h-screen w-screen bg-editor-bg text-white">
        Caricamento File System...
      </div>
    );
  }

  // Determina il contenuto del pannello principale
  let mainContent;
  switch (activePanel) {
    case "editor":
      mainContent = (
        <div className="flex h-full overflow-hidden">
          <EditorArea className={previewVisible ? "w-2/3" : "flex-grow"} />
          {previewVisible && <LivePreview className="w-1/3" />}
        </div>
      );
      break;
    case "ai":
      mainContent = <AIPanel />;
      break;
    case "snippets":
      mainContent = <SnippetPanel />;
      break;
    case "templates":
      mainContent = <TemplatePanel />;
      break;
    case "settings":
      mainContent = <SettingsPanel />;
      break;
    default:
      mainContent = <EditorArea />;
  }

  return (
    <div className="flex flex-col h-screen w-screen bg-editor-bg">
      {/* Header */}
      <Header
        onExport={handleExport}
        onImport={triggerImport} // Passa la nuova funzione
        onOpenSettings={handleOpenSettings}
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

        {/* File Explorer (Mostrato solo se activePanel è 'editor' e sidebarVisible è true) */}
        {activePanel === "editor" && sidebarVisible && <FileExplorer />}

        {/* Main Panel */}
        <div className="flex-1 overflow-hidden min-w-0">{mainContent}</div>
      </main>

      {/* Status Bar (Riutilizzo la StatusBar dell'editor) */}
      <StatusBar isSaving={isSaving} />
    </div>
  );
}

export default App;
