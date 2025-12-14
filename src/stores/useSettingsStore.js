import { create } from "zustand";
import { persist, subscribeWithSelector } from "zustand/middleware";
import { get, put, remove } from "../utils/indexedDB";

const SETTINGS_STORE_NAME = "settings";
const SETTINGS_KEY = "settings-data";

const DEFAULT_SETTINGS = {
  // Tema
  theme: "dark", // 'light' | 'dark'
  // Editor
  fontSize: 14,
  tabSize: 2,
  wordWrap: "off", // 'off' | 'on'
  minimapEnabled: true,
  // AI
  aiProvider: "claude", // 'claude' | 'gemini'
  llmModel: "claude-3-5-sonnet-20240620", // Modello LLM selezionato
  claudeApiKey: "", // Chiave API di Claude
  geminiApiKey: "", // Chiave API di Gemini
  // UI
  sidebarVisible: true,
  previewVisible: true,
  fileExplorerVisible: true,
  chatHistoryVisible: true,
  editorPreviewSplitSize: 50, // Dimensione di default 50%
  customSystemPrompt: "", // Aggiunto per il prompt di sistema custom
};

/**
 * Middleware per caricare e salvare le impostazioni su IndexedDB.
 * Questo è un adattatore per la persistenza di Zustand.
 */
const indexedDBStorage = {
  getItem: async (name) => {
    try {
      // Usiamo SETTINGS_STORE_NAME come nome dello store e SETTINGS_KEY come ID dell'oggetto
      const settings = await get(SETTINGS_STORE_NAME, SETTINGS_KEY);
      return settings ? settings.value : null;
    } catch (error) {
      console.error("Error loading settings from IndexedDB:", error);
      return null;
    }
  },
  setItem: async (name, value) => {
    try {
      // L'oggetto salvato deve avere la keyPath 'id'
      const settings = { id: SETTINGS_KEY, value: value };
      await put(SETTINGS_STORE_NAME, settings);
    } catch (error) {
      console.error("Error saving settings to IndexedDB:", error);
    }
  },
  removeItem: async (name) => {
    try {
      await remove(SETTINGS_STORE_NAME, SETTINGS_KEY);
    } catch (error) {
      console.error("Error removing settings from IndexedDB:", error);
    }
  },
};

export const useSettingsStore = create(
  subscribeWithSelector(
    persist(
      (set) => ({
        ...DEFAULT_SETTINGS,

        // Azioni per il tema
        setTheme: (theme) => set({ theme }),
        toggleTheme: () =>
          set((state) => ({
            theme: state.theme === "dark" ? "light" : "dark",
          })),

        // Azioni per l'editor
        setFontSize: (fontSize) => set({ fontSize }),
        setTabSize: (tabSize) => set({ tabSize }),
        setWordWrap: (wordWrap) => set({ wordWrap }),
        setMinimapEnabled: (minimapEnabled) => set({ minimapEnabled }),

        // Azioni per l'AI
        setAiProvider: (aiProvider) => set({ aiProvider }),
        setLlmModel: (llmModel) => set({ llmModel }),
        setClaudeApiKey: (claudeApiKey) => set({ claudeApiKey }),
        setGeminiApiKey: (geminiApiKey) => set({ geminiApiKey }),
        setCustomSystemPrompt: (customSystemPrompt) => set({ customSystemPrompt }),

        // Azioni per l'UI
        setSidebarVisible: (sidebarVisible) => set({ sidebarVisible }),
        toggleSidebar: () =>
          set((state) => ({ sidebarVisible: !state.sidebarVisible })),
        setPreviewVisible: (previewVisible) => set({ previewVisible }),
        togglePreview: () =>
          set((state) => ({ previewVisible: !state.previewVisible })),
        // Azioni per il File Explorer
        setFileExplorerVisible: (isVisible) =>
          set({ fileExplorerVisible: isVisible }),
        toggleFileExplorer: () =>
          set((state) => ({ fileExplorerVisible: !state.fileExplorerVisible })),
        // Azioni per il layout dell'editor
        setEditorPreviewSplitSize: (size) =>
          set({ editorPreviewSplitSize: size }),
        // Azioni per la Cronologia Chat
        toggleChatHistory: () =>
          set((state) => ({ chatHistoryVisible: !state.chatHistoryVisible })),
      }),
      {
        name: "codeforge-settings-storage",
        storage: indexedDBStorage,
        // Non salvare le API key nel DB se non sono state impostate
        partialize: (state) =>
          Object.fromEntries(
            Object.entries(state).filter(
              ([key, value]) => typeof value !== "function"
            )
          ),
      }
    )
  )
);

// Sincronizza il tema con l'attributo data-theme sul body
useSettingsStore.subscribe(
  (state) => state.theme,
  (theme) => {
    document.documentElement.setAttribute("data-theme", theme);
  },
  { fireImmediately: true }
);
