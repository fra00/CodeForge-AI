// src/stores/useAIStore.js
import { create } from "zustand";
import { getChatCompletion } from "../utils/aiService";
import { getAll, put, clear, remove } from "../utils/indexedDB";
import { useFileStore } from "./useFileStore";

const CONVERSATIONS_STORE_NAME = "aiConversations";

const SYSTEM_PROMPT = `You are Kilo Code, a highly skilled software engineer AI assistant. Your primary function is to assist the user with code-related tasks, such as explaining code, refactoring, generating new code, or debugging.

When providing code, always use markdown code blocks.
Be concise, professional, and extremely helpful.
The user is working in a web-based code editor environment.`;

const initialMessages = [
  {
    id: "system-prompt",
    role: "system",
    content: SYSTEM_PROMPT,
  },
  {
    id: "initial-assistant",
    role: "assistant",
    content:
      "Hello! I am Kilo Code, your AI software engineer assistant. How can I help you with your code today?",
  },
];

/**
 * Estrae il contenuto JSON da un blocco di codice Markdown.
 * @param {string} text - Il testo che può contenere il blocco JSON.
 * @returns {string|null} Il contenuto JSON estratto, o null se non trovato.
 */
const extractJsonFromMarkdown = (text) => {
  if (!text || typeof text !== "string") {
    return null;
  }

  // Rimuovi spazi bianchi iniziali/finali
  const trimmed = text.trim();

  // Strategia 1: Cerca blocco ```json ... ```
  const jsonBlockMatch = trimmed.match(/```json\s*([\s\S]*?)\s*```/);
  if (jsonBlockMatch && jsonBlockMatch[1]) {
    return jsonBlockMatch[1].trim();
  }

  // Strategia 2: Cerca blocco ``` ... ``` generico che potrebbe contenere JSON
  const genericBlockMatch = trimmed.match(/```\s*([\s\S]*?)\s*```/);
  if (genericBlockMatch && genericBlockMatch[1]) {
    const content = genericBlockMatch[1].trim();
    // Verifica se sembra JSON
    if (content.startsWith("{") || content.startsWith("[")) {
      return content;
    }
  }

  // Strategia 3: Trova il primo { e l'ultimo } per estrarre l'oggetto JSON
  const firstBrace = trimmed.indexOf("{");
  const lastBrace = trimmed.lastIndexOf("}");

  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    const extracted = trimmed.substring(firstBrace, lastBrace + 1);
    // Verifica che sia JSON valido tentando il parse
    try {
      JSON.parse(extracted);
      return extracted;
    } catch (e) {
      // Non è JSON valido, continua
    }
  }

  // Strategia 4: Se l'intero testo sembra JSON, restituiscilo
  if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
    return trimmed;
  }

  return null;
};

/**
 * Valida la struttura base della risposta JSON dell'LLM
 * @param {Object} response - L'oggetto JSON parsato
 * @returns {boolean} True se la struttura è valida
 */
const validateResponseStructure = (response) => {
  if (!response || typeof response !== "object") {
    return false;
  }

  const validActions = [
    "create_files",
    "update_files",
    "delete_files",
    "text_response",
    "tool_call",
  ];

  return validActions.includes(response.action);
};

/**
 * Normalizza la risposta dell'LLM gestendo errori comuni
 * @param {Object} response - La risposta parsata dall'LLM
 * @returns {Object} La risposta normalizzata
 */
const normalizeResponse = (response) => {
  let normalized = { ...response };

  // Mappa 'tool_code' a 'action'
  if (!normalized.action && normalized.tool_code) {
    normalized.action = normalized.tool_code;
  }

  // Gestisci la vecchia struttura 'actions' array
  if (
    !normalized.action &&
    normalized.actions &&
    Array.isArray(normalized.actions) &&
    normalized.actions.length > 0
  ) {
    const firstAction = normalized.actions[0];
    normalized.action = firstAction.type;
    normalized.files = firstAction.files;
    console.warn(
      'LLM used deprecated "actions" array structure, normalized to current schema'
    );
  }

  // Normalizza i file (mappa 'file_path' e 'file_name' a 'path')
  if (normalized.files && Array.isArray(normalized.files)) {
    normalized.files = normalized.files.map((file) => {
      const normalizedFile = { ...file };

      if (file.file_path && !file.path) {
        normalizedFile.path = file.file_path;
        delete normalizedFile.file_path;
      } else if (file.file_name && !file.path) {
        normalizedFile.path = file.file_name;
        delete normalizedFile.file_name;
      }

      return normalizedFile;
    });
  }

  // Mappa 'text' a 'response_text' per text_response
  if (
    normalized.action === "text_response" &&
    !normalized.response_text &&
    normalized.text
  ) {
    normalized.response_text = normalized.text;
  }

  return normalized;
};

/**
 * Crea una nuova chat
 * @param {string} id - ID opzionale per la chat
 * @returns {Object} Oggetto chat
 */
const createNewChat = (id) => ({
  id: id || Date.now().toString(),
  title: "Nuova Chat",
  messages: initialMessages,
  timestamp: new Date().toISOString(),
});

/**
 * Costruisce il system prompt con il contesto del file
 * @param {Object} context - Contesto del file attivo
 * @returns {string} System prompt completo
 */
const buildSystemPrompt = (context) => {
  return `${SYSTEM_PROMPT}

---

# Istruzioni per l'Output Strutturato

Devi rispondere ESCLUSIVAMENTE con un oggetto JSON valido. NON aggiungere testo prima o dopo il JSON.

**IMPORTANTE: 
- Se la tua risposta è solo testuale (spiegazioni, discussioni), usa 'text_response'
- Se devi creare o modificare file, usa 'create_files' o 'update_files'
- Se devi leggere file esistenti o elencare file, usa 'tool_call'**

## 1. Risposta Solo Testuale

Usa quando devi solo rispondere con testo (spiegazioni, consigli, discussioni):

\`\`\`json
{
  "action": "text_response",
  "response_text": "La tua risposta testuale qui."
}
\`\`\`

## 2. Tool Call (Lettura File)

Usa quando hai bisogno di leggere file esistenti o ottenere informazioni sul filesystem:

**list_files**: Elenca tutti i file nel VFS
\`\`\`json
{
  "action": "tool_call",
  "tool_call": {
    "function_name": "list_files",
    "args": {}
  }
}
\`\`\`

**read_file**: Legge il contenuto di un file specifico
\`\`\`json
{
  "action": "tool_call",
  "tool_call": {
    "function_name": "read_file",
    "args": {
      "path": "src/App.jsx"
    }
  }
}
\`\`\`

## 3. Azioni sul File System (VFS Actions)

Usa quando devi creare nuovi file, modificare file esistenti o eliminare file:

**create_files**: Crea uno o più nuovi file (sovrascrive se esistono già)
\`\`\`json
{
  "action": "create_files",
  "files": [
    {
      "path": "index.html",
      "content": "<!DOCTYPE html>\\n<html>...</html>"
    },
    {
      "path": "styles.css",
      "content": "body { margin: 0; }"
    }
  ]
}
\`\`\`

**update_files**: Modifica il contenuto completo di file esistenti (deve già esistere)
\`\`\`json
{
  "action": "update_files",
  "files": [
    {
      "path": "src/App.jsx",
      "content": "import React from 'react';\\n\\nexport default function App() { return <h1>Updated</h1>; }"
    }
  ]
}
\`\`\`

**delete_files**: Elimina uno o più file
\`\`\`json
{
  "action": "delete_files",
  "files": [
    {
      "path": "old-file.js"
    }
  ]
}
\`\`\`

---

# Contesto del File Attivo

- Language: ${context.language || "unknown"}
- File Name: ${context.currentFile || "none"}
- Content:
\`\`\`${context.language || "text"}
${context.content || "(empty)"}
\`\`\`

---

# RICORDA:
- Restituisci SOLO JSON valido
- Usa 'create_files' per creare nuovi file (come index.html, app.js, ecc.)
- NON usare blocchi di testo prima del JSON
- Il JSON deve essere completo e valido
`;
};

/**
 * Schema JSON per la validazione delle risposte
 */
const getResponseSchema = () => ({
  type: "object",
  properties: {
    action: {
      type: "string",
      enum: [
        "create_files",
        "update_files",
        "delete_files",
        "text_response",
        "tool_call",
      ],
    },
    files: {
      type: "array",
      items: {
        type: "object",
        properties: {
          path: { type: "string" },
          content: { type: "string" },
        },
        required: ["path"],
      },
    },
    response_text: { type: "string" },
    tool_call: {
      type: "object",
      properties: {
        function_name: {
          type: "string",
          enum: ["list_files", "read_file"],
        },
        args: {
          type: "object",
          properties: {
            path: { type: "string" },
          },
        },
      },
      required: ["function_name", "args"],
    },
  },
  required: ["action"],
});

export const useAIStore = create((set, get) => ({
  conversations: [],
  currentChatId: null,
  isStreaming: false,
  error: null,

  /**
   * Ottiene i messaggi della chat corrente
   * @returns {Array} Array di messaggi
   */
  getMessages: () => {
    const { conversations, currentChatId } = get();
    const currentChat = conversations.find((c) => c.id === currentChatId);
    return currentChat ? currentChat.messages : initialMessages;
  },

  /**
   * Carica tutte le conversazioni da IndexedDB
   */
  loadConversations: async () => {
    try {
      const dbConversations = await getAll(CONVERSATIONS_STORE_NAME);
      let conversations =
        dbConversations.length > 0 ? dbConversations : [createNewChat("1")];

      conversations.sort(
        (a, b) => new Date(a.timestamp) - new Date(b.timestamp)
      );
      const currentChatId = conversations[conversations.length - 1].id;

      set({ conversations, currentChatId });
    } catch (e) {
      console.error("Failed to load AI conversations from IndexedDB:", e);
      set({ conversations: [createNewChat("1")], currentChatId: "1" });
    }
  },

  /**
   * Salva la conversazione corrente su IndexedDB
   */
  saveConversation: async () => {
    const { conversations, currentChatId } = get();
    const chatToSave = conversations.find((c) => c.id === currentChatId);

    if (!chatToSave) return;

    const messagesToSave = chatToSave.messages.filter(
      (m) => m.role !== "system"
    );

    if (messagesToSave.length === 0) return;

    try {
      if (chatToSave.title === "Nuova Chat" && messagesToSave.length > 0) {
        const firstUserMessage = messagesToSave.find((m) => m.role === "user");
        if (firstUserMessage) {
          chatToSave.title = firstUserMessage.content.substring(0, 30) + "...";
        }
      }

      const updatedChat = {
        ...chatToSave,
        messages: messagesToSave,
        timestamp: new Date().toISOString(),
      };

      await put(CONVERSATIONS_STORE_NAME, updatedChat);

      set((state) => ({
        conversations: state.conversations.map((c) =>
          c.id === updatedChat.id ? updatedChat : c
        ),
      }));
    } catch (e) {
      console.error("Failed to save AI conversation to IndexedDB:", e);
    }
  },

  /**
   * Crea una nuova chat
   */
  newChat: () => {
    const newChat = createNewChat();
    set((state) => ({
      conversations: [...state.conversations, newChat],
      currentChatId: newChat.id,
      error: null,
    }));
  },

  /**
   * Seleziona una chat esistente
   * @param {string} chatId - ID della chat da selezionare
   */
  selectChat: (chatId) => {
    set({ currentChatId: chatId, error: null });
  },

  /**
   * Elimina una chat
   * @param {string} chatId - ID della chat da eliminare
   */
  deleteChat: async (chatId) => {
    const { conversations, currentChatId } = get();

    if (conversations.length === 1) {
      get().clearConversation();
      return;
    }

    try {
      await remove(CONVERSATIONS_STORE_NAME, chatId);

      set((state) => {
        const newConversations = state.conversations.filter(
          (c) => c.id !== chatId
        );
        let newCurrentChatId = state.currentChatId;

        if (state.currentChatId === chatId) {
          newCurrentChatId = newConversations[newConversations.length - 1].id;
        }

        return {
          conversations: newConversations,
          currentChatId: newCurrentChatId,
          error: null,
        };
      });
    } catch (e) {
      console.error("Failed to delete AI conversation from IndexedDB:", e);
      set({ error: e.message });
    }
  },

  /**
   * Aggiunge un messaggio alla conversazione corrente
   * @param {Object} message - Messaggio da aggiungere
   */
  addMessage: (message) =>
    set((state) => {
      const { currentChatId, conversations } = state;
      const newConversations = conversations.map((chat) => {
        if (chat.id === currentChatId) {
          return {
            ...chat,
            messages: [...chat.messages, message],
          };
        }
        return chat;
      });

      return {
        conversations: newConversations,
        error: null,
      };
    }),

  /**
   * Resetta la conversazione corrente
   */
  clearConversation: () => {
    const { currentChatId } = get();
    set((state) => ({
      conversations: state.conversations.map((chat) => {
        if (chat.id === currentChatId) {
          return {
            ...chat,
            messages: initialMessages,
          };
        }
        return chat;
      }),
      error: null,
    }));
  },

  /**
   * Invia un messaggio all'AI e gestisce la risposta con tool calls
   * @param {string} userMessage - Messaggio dell'utente
   * @param {Object} context - Contesto del file attivo
   * @param {string} provider - Provider AI ('claude' o 'gemini')
   * @param {string} apiKey - Chiave API
   * @param {string} modelName - Nome del modello
   * @param {number} maxToolCalls - Numero massimo di tool calls (default: 5)
   */
  sendMessage: async (
    userMessage,
    context,
    provider,
    apiKey,
    modelName,
    maxToolCalls = 5
  ) => {
    const { addMessage, currentChatId, conversations } = get();
    const fileStore = useFileStore.getState();

    // Validazione input
    if (!provider || !apiKey || !modelName) {
      set({
        error: "Missing required parameters: provider, apiKey, or modelName",
      });
      return;
    }

    if (!context) {
      context = { language: "text", currentFile: "none", content: "" };
    }

    let toolCallCount = 0;

    try {
      // Se c'è un nuovo messaggio utente, aggiungilo
      if (userMessage && userMessage.trim()) {
        const newUserMessage = {
          id: Date.now().toString(),
          role: "user",
          content: userMessage.trim(),
        };

        // Rimuovi il messaggio iniziale se presente
        set((state) => {
          const newConversations = state.conversations.map((chat) => {
            if (chat.id === currentChatId) {
              return {
                ...chat,
                messages: chat.messages.filter(
                  (m) => m.id !== "initial-assistant"
                ),
              };
            }
            return chat;
          });
          return { conversations: newConversations };
        });

        addMessage(newUserMessage);
      }

      set({ isStreaming: true, error: null });

      const systemPromptWithContext = buildSystemPrompt(context);
      const responseSchema = getResponseSchema();

      // Loop per gestire tool calls multipli
      while (toolCallCount < maxToolCalls) {
        // Ottieni la cronologia aggiornata
        const currentChat = get().conversations.find(
          (c) => c.id === currentChatId
        );
        const conversationHistory = currentChat
          ? currentChat.messages
          : initialMessages;

        // Prepara i messaggi per l'LLM
        const messagesForLLM = [
          { role: "system", content: systemPromptWithContext },
          ...conversationHistory.filter((m) => m.role !== "system"),
        ];

        // Chiamata all'LLM
        const response = await getChatCompletion({
          provider,
          apiKey,
          modelName,
          messages: messagesForLLM,
          stream: false,
          responseSchema,
          //maxTokens: 4096, // Aumenta il limite per risposte lunghe con codice
        });

        // Parsing della risposta
        const jsonString = extractJsonFromMarkdown(response.text);

        if (!jsonString) {
          console.error("Raw AI response:", response.text);
          throw new Error(
            `No valid JSON found in AI response. Response length: ${response.text?.length || 0} chars. Preview: ${response.text?.substring(0, 300)}...`
          );
        }

        let parsedResponse;
        try {
          parsedResponse = JSON.parse(jsonString);
        } catch (e) {
          console.error("Failed to parse JSON:", jsonString.substring(0, 500));
          throw new Error(
            `Failed to parse JSON from AI response: ${e.message}\nJSON preview: ${jsonString.substring(0, 300)}...`
          );
        }

        // Normalizza e valida la risposta
        parsedResponse = normalizeResponse(parsedResponse);

        if (!validateResponseStructure(parsedResponse)) {
          console.error("Invalid response structure:", parsedResponse);
          throw new Error(
            `Invalid action in AI response: ${parsedResponse.action || "undefined"}`
          );
        }

        const { action, files, response_text, tool_call } = parsedResponse;

        // Gestione Tool Call
        if (action === "tool_call" && tool_call) {
          toolCallCount++;

          console.log(
            `[Tool Call ${toolCallCount}/${maxToolCalls}] ${tool_call.function_name}`,
            tool_call.args
          );

          // Aggiungi messaggio dell'assistente che richiede il tool
          const assistantToolMessage = {
            id: `${Date.now()}-tool-req`,
            role: "assistant",
            content: `[Executing: ${tool_call.function_name}(${JSON.stringify(tool_call.args)})]`,
          };
          addMessage(assistantToolMessage);

          // Esegui il tool call
          let toolResult;
          try {
            toolResult = fileStore.executeToolCall(tool_call);
          } catch (toolError) {
            toolResult = `Error executing tool: ${toolError.message}`;
            console.error("Tool execution error:", toolError);
          }

          // Aggiungi il risultato del tool come messaggio 'user'
          const toolResponseMessage = {
            id: `${Date.now()}-tool-res`,
            role: "user",
            content: `[Tool Result: ${tool_call.function_name}]\n${toolResult}`,
          };
          addMessage(toolResponseMessage);

          // Continua il loop per la prossima chiamata LLM
          continue;
        }

        // Gestione Risposta Testuale
        if (action === "text_response") {
          const textContent = response_text || parsedResponse.text;

          if (!textContent) {
            throw new Error('Missing text content for action "text_response"');
          }

          const finalMessage = {
            id: Date.now().toString(),
            role: "assistant",
            content: textContent,
          };
          addMessage(finalMessage);
          break; // Esci dal loop
        }

        // Gestione Azioni VFS
        if (
          ["create_files", "update_files", "delete_files"].includes(action) &&
          files
        ) {
          if (!Array.isArray(files) || files.length === 0) {
            throw new Error(
              `Invalid or empty files array for action "${action}"`
            );
          }

          console.log(`[VFS Action] ${action}`, files);

          let results;
          try {
            results = fileStore.applyFileActions(files, action);
          } catch (vfsError) {
            results = [`Error: ${vfsError.message}`];
            console.error("VFS action error:", vfsError);
          }

          const vfsMessage = {
            id: Date.now().toString(),
            role: "assistant",
            content: `✓ VFS Action: ${action}\n\nResults:\n${results.map((r) => `  • ${r}`).join("\n")}`,
          };
          addMessage(vfsMessage);
          break; // Esci dal loop
        }

        // Se arriviamo qui, c'è un problema con la risposta
        throw new Error(
          `Unhandled action or invalid response structure: ${JSON.stringify(parsedResponse)}`
        );
      }

      // Controllo limite tool calls
      if (toolCallCount >= maxToolCalls) {
        const limitMessage = {
          id: Date.now().toString(),
          role: "assistant",
          content: `⚠️ Maximum tool call limit reached (${maxToolCalls}). Please try breaking down your request into smaller steps.`,
        };
        addMessage(limitMessage);
        console.warn("Maximum tool call limit reached");
      }
    } catch (e) {
      console.error("Error in AI conversation:", e);
      set({ error: e.message || "An unknown error occurred" });

      // Aggiungi un messaggio di errore visibile all'utente
      const errorMessage = {
        id: Date.now().toString(),
        role: "assistant",
        content: `❌ Error: ${e.message}`,
      };
      addMessage(errorMessage);
    } finally {
      set({ isStreaming: false });
      await get().saveConversation();
    }
  },
}));
