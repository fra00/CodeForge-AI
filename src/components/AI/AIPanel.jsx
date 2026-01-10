import React, { useRef, useEffect, useState } from "react";
import { Lock } from "lucide-react";
import { useAIStore } from "../../stores/useAIStore";
import { ENVIRONMENTS } from "../../stores/environment";
import { useFileStore } from "../../stores/useFileStore";
import { useSettingsStore } from "../../stores/useSettingsStore";
import useEditorStore from "../../stores/useEditorStore"; // Assumo che esista
import { ChatMessage } from "./ChatMessage";
import { PromptInput } from "./PromptInput";
import Alert from "../ui/Alert";
import { ChatHistoryPanel } from "./ChatHistoryPanel";
import { KnowledgeCacheIndicator } from "./KnowledgeCacheIndicator";

const DEFAULT_CLAUDE_MODEL = "claude-3-5-sonnet-20240620";
const DEFAULT_GEMINI_MODEL = "gemini-2.5-flash";

/**
 * Componente principale per l'AI Assistant.
 * Gestisce la logica di chat, l'invio dei prompt e il rendering della cronologia.
 */
export function AIPanel({
  extendPromptAction, // Nuova funzione per estendere il prompt
  ...props
}) {
  const {
    isStreaming,
    sendMessage,
    loadConversations,
    error,
    conversations,
    currentChatId,
    newChat,
    selectChat,
    deleteChat,
    deleteMessage, // Recupero la nuova funzione
    stopGeneration, // Nuova funzione per fermare il flusso
    setChatEnvironment,
    getMessages,
  } = useAIStore();

  // Selettore ottimizzato per ottenere solo la chat corrente
  const currentChat = useAIStore((state) =>
    state.conversations.find((c) => c.id === state.currentChatId)
  );

  // Recupera l'environment dal progetto (Source of Truth) leggendo il file di configurazione
  const projectEnvironment = useFileStore((state) => {
    const configFile = Object.values(state.files).find(
      (f) =>
        f.path === "/.llmContext/project.json" ||
        f.path === ".llmContext/project.json"
    );
    if (configFile && configFile.content) {
      try {
        return JSON.parse(configFile.content).environment;
      } catch {
        return null;
      }
    }
    return null;
  });
  const currentEnvironment =
    projectEnvironment || currentChat?.environment || "web";

  const messages = useAIStore((state) => state.getMessages());

  const { aiProvider, claudeApiKey, geminiApiKey, llmModel } =
    useSettingsStore();
  const activeFile = useFileStore((state) => state.getActiveFile());

  const messagesEndRef = useRef(null);
  const scrollContainerRef = useRef(null); // Ref per il contenitore scrollabile
  const apiKey = aiProvider === "claude" ? claudeApiKey : geminiApiKey; // Usa la chiave del provider selezionato
  const isGenerating = isStreaming; // Rinominato per chiarezza

  // Carica la cronologia all'avvio
  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  // Scrolla in basso ad ogni nuovo messaggio con animazione rallentata
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    // Calcola la posizione target (fondo)
    const targetScrollTop = container.scrollHeight - container.clientHeight;

    // Se siamo già vicini al fondo o non c'è nulla da scrollare, esci
    if (targetScrollTop <= container.scrollTop + 5) return;

    // Configurazione animazione
    const duration = 1000; // 1 secondo per permettere la lettura
    const startScrollTop = container.scrollTop;
    const distance = targetScrollTop - startScrollTop;
    let startTime = null;
    let animationFrameId;

    const animateScroll = (currentTime) => {
      if (!startTime) startTime = currentTime;
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);

      // Easing function: easeOutQuart per un rallentamento naturale alla fine
      const ease = 1 - Math.pow(1 - progress, 4);

      container.scrollTop = startScrollTop + distance * ease;

      if (progress < 1) {
        animationFrameId = requestAnimationFrame(animateScroll);
      }
    };

    animationFrameId = requestAnimationFrame(animateScroll);

    return () => {
      if (animationFrameId) cancelAnimationFrame(animationFrameId);
    };
  }, [messages.length]);

  const handleSendPrompt = (prompt) => {
    if (!activeFile) {
      alert("Apri un file nell'editor per fornire contesto all'AI.");
      return;
    }

    const context = {
      language: activeFile.language,
      currentFile: activeFile.name,
      content: activeFile.content,
    };

    const modelToUse =
      llmModel ||
      (aiProvider === "claude" ? DEFAULT_CLAUDE_MODEL : DEFAULT_GEMINI_MODEL);
    sendMessage(prompt, context, aiProvider, apiKey, modelToUse); // Passa provider, apiKey e modelToUse
  };

  // Crea un gestore per l'estensione del prompt che include le impostazioni.
  const handleExtendPrompt = async (prompt) => {
    const modelToUse =
      llmModel ||
      (aiProvider === "claude" ? DEFAULT_CLAUDE_MODEL : DEFAULT_GEMINI_MODEL);
    const settings = { provider: aiProvider, apiKey, modelName: modelToUse };
    // Chiama la funzione passata dalle props con tutti i parametri necessari.
    return await extendPromptAction(prompt, settings, "[FULL]");
  };

  const handleEnvironmentChange = (e) => {
    setChatEnvironment(e.target.value);
  };

  const handleDeleteChat = (chatId) => {
    if (window.confirm("Sei sicuro di voler eliminare questa chat?")) {
      deleteChat(chatId);
    }
  };

  if (!apiKey) {
    return (
      <div className="p-4 h-full flex items-center justify-center bg-editor-bg">
        <Alert variant="warning">
          <p className="font-bold">API Key Mancante</p>
          <p>
            Per utilizzare l'AI Assistant, devi configurare la tua chiave API
            per il provider selezionato nel pannello **Settings**.
          </p>
        </Alert>
      </div>
    );
  }

  return (
    // Il pannello della cronologia è stato spostato in App.jsx per un controllo di layout globale.
    <div className="flex flex-col h-full w-full bg-editor-bg text-white">
      {/* Header con selezione ambiente */}
      <div className="flex items-center justify-between p-2 border-b border-editor-border h-10 text-xs flex-shrink-0">
        <KnowledgeCacheIndicator />
        <div className="flex items-center">
          {projectEnvironment && (
            <Lock
              size={12}
              className="mr-1 text-gray-500"
              title="Environment vincolato al progetto"
            />
          )}
          <label htmlFor="env-select" className="mr-2 text-gray-400">
            Contesto:
          </label>
          <select
            id="env-select"
            value={currentEnvironment}
            onChange={handleEnvironmentChange}
            disabled={isGenerating || !!projectEnvironment}
            className={`bg-editor-highlight border border-editor-border rounded px-2 py-1 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 ${projectEnvironment ? "cursor-not-allowed text-gray-400" : ""}`}
            title={
              projectEnvironment
                ? "Ambiente gestito dalle impostazioni di progetto"
                : "Seleziona il contesto di programmazione per l'AI"
            }
          >
            {Object.entries(ENVIRONMENTS).map(([key, { label }]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Area Chat Principale */}
      {/* Aggiunto overflow-hidden per forzare il contenitore a rispettare i suoi limiti di altezza,
         permettendo al figlio con overflow-y-auto di funzionare correttamente. */}
      <div className="flex flex-col flex-1 overflow-hidden" key={currentChatId}>
        {/* Area Messaggi */}
        <div className="flex-1 overflow-y-auto" ref={scrollContainerRef}>
          {messages.length <= 2 && ( // Solo il system prompt e il messaggio iniziale
            <div className="p-4 text-editor-border text-center">
              Inizia una conversazione con l'AI Assistant.
            </div>
          )}
          {messages
            .filter((m) => m.role !== "system")
            .map((message) => (
              <ChatMessage
                key={message.id} // Usiamo l'ID univoco per una chiave stabile
                message={message}
                onDeleteMessage={deleteMessage} // Passo la funzione per eliminare
              />
            ))}
          <div ref={messagesEndRef} />
        </div>

        {/* Errori */}
        {error && (
          <Alert variant="danger" className="mx-4 mt-2">
            Errore: {error}
          </Alert>
        )}

        {/* Input Prompt */}
        <PromptInput
          onSend={handleSendPrompt}
          onStop={stopGeneration}
          isGenerating={isGenerating}
          onExtend={handleExtendPrompt}
        />
      </div>
    </div>
  );
}
