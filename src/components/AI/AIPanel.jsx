import React, { useRef, useEffect, useState } from "react";
import { useAIStore } from "../../stores/useAIStore";
import { useFileStore } from "../../stores/useFileStore";
import { useSettingsStore } from "../../stores/useSettingsStore";
import useEditorStore from "../../store/useEditorStore"; // Assumo che esista
import { ChatMessage } from "./ChatMessage";
import { PromptInput } from "./PromptInput";
import Alert from "../ui/Alert";
import Button from "../ui/Button";
import { Plus, Trash2, MessageSquare } from "lucide-react";

const DEFAULT_CLAUDE_MODEL = 'claude-3-5-sonnet-20240620';
const DEFAULT_GEMINI_MODEL = 'gemini-2.5-flash';

/**
 * Componente principale per l'AI Assistant.
 * Gestisce la logica di chat, l'invio dei prompt e il rendering della cronologia.
 */
export function AIPanel() {
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
    getMessages,
  } = useAIStore();

  const messages = useAIStore(state => state.getMessages());

  const { aiProvider, claudeApiKey, geminiApiKey, llmModel } = useSettingsStore();
  const activeFile = useFileStore((state) => state.getActiveFile());
  const insertContent = useEditorStore((state) => state.insertContent); // Funzione per inserire codice nell'editor

  const messagesEndRef = useRef(null);
  const apiKey = aiProvider === 'claude' ? claudeApiKey : geminiApiKey; // Usa la chiave del provider selezionato
  const isGenerating = isStreaming; // Rinominato per chiarezza

  // Carica la cronologia all'avvio
  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  // Scrolla in basso ad ogni nuovo messaggio
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]); // Dipende dalla lunghezza per evitare loop infiniti

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

    const modelToUse = llmModel || (aiProvider === 'claude' ? DEFAULT_CLAUDE_MODEL : DEFAULT_GEMINI_MODEL);
    sendMessage(prompt, context, aiProvider, apiKey, modelToUse); // Passa provider, apiKey e modelToUse
  };

  const handleInsertCode = (code) => {
    if (activeFile && insertContent) {
      insertContent(activeFile.id, code);
      alert("Codice inserito nell'editor.");
    } else {
      alert(
        "Impossibile inserire il codice. Assicurati che un file sia attivo nell'editor."
      );
    }
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
            Per utilizzare l'AI Assistant, devi configurare la tua chiave API per il provider selezionato nel pannello **Settings**.
          </p>
        </Alert>
      </div>
    );
  }

  return (
    <div className="flex h-full bg-editor-bg">
      {/* Sidebar per la lista delle chat */}
      <div className="w-64 border-r border-editor-border p-2 flex flex-col flex-shrink-0">
        <div className="flex justify-between items-center mb-2">
          <h3 className="text-sm font-semibold text-white">Cronologia Chat</h3>
          <Button onClick={newChat} variant="ghost" size="small" title="Nuova Chat">
            <Plus size={16} />
          </Button>
        </div>
        <div className="flex-1 overflow-y-auto space-y-1">
          {conversations.map((chat) => (
            <div
              key={chat.id}
              className={`flex items-center justify-between p-2 rounded-md cursor-pointer text-sm ${
                chat.id === currentChatId
                  ? "bg-editor-highlight text-white"
                  : "text-editor-text hover:bg-editor-darker"
              }`}
              onClick={() => selectChat(chat.id)}
            >
              <span className="truncate flex-1 mr-2">
                <MessageSquare size={14} className="inline mr-1" />
                {chat.title}
              </span>
              {conversations.length > 1 && (
                <Button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteChat(chat.id);
                  }}
                  variant="ghost"
                  size="small"
                  className="p-1 text-editor-text hover:text-red-500"
                  title="Elimina Chat"
                >
                  <Trash2 size={14} />
                </Button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Area Chat Principale */}
      <div className="flex flex-col flex-1" key={currentChatId}>
        {/* Area Messaggi */}
        <div className="flex-1 overflow-y-auto">
          {messages.length <= 2 && ( // Solo il system prompt e il messaggio iniziale
            <div className="p-4 text-editor-border text-center">
              Inizia una conversazione con l'AI Assistant.
            </div>
          )}
          {messages.filter(m => m.role !== 'system').map((message) => (
            <ChatMessage
              key={message.id} // Usiamo l'ID univoco per una chiave stabile
              message={message}
              onInsertCode={handleInsertCode}
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
        <PromptInput onSend={handleSendPrompt} isGenerating={isGenerating} />
      </div>
    </div>
  );
}
