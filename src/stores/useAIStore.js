// src/stores/useAIStore.js
import { create } from "zustand";
import { getChatCompletion } from "../utils/aiService";
import { getAll, put, clear, remove } from "../utils/indexedDB";
import { useFileStore } from "./useFileStore"; // Import necessario per accedere alle azioni VFS

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
  // Espressione regolare per catturare il contenuto tra ```json e ```
  const match = text.match(/```json\s*([\s\S]*?)\s*```/);

  // 1. Controlla se il match è avvenuto.
  if (match) {
    // 2. Il contenuto catturato è nel primo gruppo di cattura (indice 1)
    //    e deve essere pulito (trim) prima di essere restituito.
    return match[1].trim();
  }

  // 3. Ritorna null (o una stringa vuota) se il blocco JSON non viene trovato.
  //    Restituire l'intero testo può portare a errori di parsing JSON successivi.
  return null;
};

// Funzione helper per creare una nuova chat
const createNewChat = (id) => ({
  id: id || Date.now().toString(),
  title: "Nuova Chat",
  messages: initialMessages,
  timestamp: new Date().toISOString(),
});

export const useAIStore = create((set, get) => ({
  // Stato per la gestione di più chat
  conversations: [], // Array di { id, title, messages, timestamp }
  currentChatId: null,
  isStreaming: false,
  error: null,

  // Funzione per ottenere i messaggi della chat corrente
  getMessages: () => {
    const { conversations, currentChatId } = get();
    const currentChat = conversations.find((c) => c.id === currentChatId);
    return currentChat ? currentChat.messages : initialMessages;
  },

  /**
   * Carica tutte le conversazioni persistenti da IndexedDB.
   */
  loadConversations: async () => {
    try {
      const dbConversations = await getAll(CONVERSATIONS_STORE_NAME);
      let conversations =
        dbConversations.length > 0 ? dbConversations : [createNewChat("1")];

      // Ordina per timestamp e imposta l'ultima come attiva
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
   * Salva la conversazione corrente su IndexedDB.
   */
  saveConversation: async () => {
    const { conversations, currentChatId } = get();
    const chatToSave = conversations.find((c) => c.id === currentChatId);

    if (!chatToSave) return;

    // Non salvare il system prompt
    const messagesToSave = chatToSave.messages.filter(
      (m) => m.role !== "system"
    );

    if (messagesToSave.length === 0) return;

    try {
      // Aggiorna il titolo della chat se è ancora 'Nuova Chat' e ha messaggi
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

      // Aggiorna lo stato locale con la chat salvata
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
   * Crea una nuova chat e la imposta come attiva.
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
   * Seleziona una chat esistente per renderla attiva.
   * @param {string} chatId - L'ID della chat da selezionare.
   */
  selectChat: (chatId) => {
    set({ currentChatId: chatId, error: null });
  },

  /**
   * Elimina una chat per ID.
   * @param {string} chatId - L'ID della chat da eliminare.
   */
  deleteChat: async (chatId) => {
    const { conversations, currentChatId } = get();

    if (conversations.length === 1) {
      // Non permettere l'eliminazione dell'ultima chat, resettala
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
          // Se la chat eliminata era quella attiva, selezionane un'altra
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
   * Adds a message to the conversation history of the current chat.
   * @param {{role: 'user'|'assistant'|'system', content: string}} message
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
   * Resets the current conversation to the initial state.
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
    // La chat vuota verrà salvata al prossimo saveConversation
  },

  /**
   * Sends a user message to the AI provider and streams the response.
   * @param {string} userMessage - The content of the user's message.
   * @param {Object} context - Contesto del file attivo (language, currentFile, content).
   * @param {'claude'|'gemini'} provider - Il provider AI selezionato.
   * @param {string} apiKey - La chiave API del provider.
   * @param {string} modelName - Il nome del modello LLM da usare.
   */
  sendMessage: async (userMessage, context, provider, apiKey, modelName) => {
    const { addMessage, currentChatId, conversations } = get();
    const fileStore = useFileStore.getState(); // Accesso allo store VFS

    // 1. Add user message to state
    const newUserMessage = {
      id: Date.now().toString(),
      role: "user",
      content: userMessage,
    };

    // Rimuovi il messaggio iniziale dell'assistente se presente, per iniziare la vera conversazione
    set((state) => {
      const { currentChatId, conversations } = state;
      const newConversations = conversations.map((chat) => {
        if (chat.id === currentChatId) {
          return {
            ...chat,
            messages: chat.messages.filter((m) => m.id !== "initial-assistant"),
          };
        }
        return chat;
      });
      return { conversations: newConversations };
    });

    addMessage(newUserMessage);

    // 2. Start non-streaming request for structured output
    set({ isStreaming: true, error: null });

    // Costruisci la cronologia della conversazione in modo esplicito
    const currentChat = conversations.find((c) => c.id === currentChatId);
    const baseMessages = currentChat ? currentChat.messages : initialMessages;

    // La cronologia per l'API è la base + il messaggio utente
    const conversationHistory = [...baseMessages, newUserMessage];

    // Aggiungi il contesto del file al system prompt per la singola richiesta
    const systemPromptWithContext = `${SYSTEM_PROMPT}
      
      ---
      
      # Istruzioni per l'Output Strutturato
      
      Devi rispondere ESCLUSIVAMENTE con un oggetto JSON che segue lo schema fornito.
      
      **IMPORTANTE: Se la tua risposta è solo testuale (non contiene codice o azioni VFS), DEVI usare l'azione 'text_response'.**
      
      ## 1. Risposta Solo Testuale
      
      \`\`\`json
      {
        "action": "text_response",
        "response_text": "La tua risposta testuale qui."
      }
      \`\`\`
      
      ## 2. Tool Call (Lettura File)
      
      Se hai bisogno di leggere il contenuto di un file o di elencare i file, rispondi con l'azione 'tool_call'.
      
      - **list_files**: Elenca tutti i file nel VFS.
      - **read_file**: Legge il contenuto di un file specifico.
      
      ### Esempio Tool Call:
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
      
      Se hai generato il codice o devi eliminare un file, rispondi con una delle seguenti azioni:
      
      - **create_files**: Crea uno o più file.
      - **update_files**: Modifica il contenuto completo di uno o più file esistenti.
      - **delete_files**: Elimina uno o più file/cartelle.
      
      ### Esempio VFS Action (Update):
      \`\`\`json
      {
        "action": "update_files",
        "files": [
          {
            "path": "src/App.jsx",
            "content": "import React from 'react';\\n\\nexport default function App() { return <h1>Hello World</h1>; }"
          }
        ]
      }
      \`\`\`
      
      ---
      
      # Contesto del File Attivo
      
      - Language: ${context.language}
      - File Name: ${context.currentFile}
      - Content:
      \`\`\`${context.language}
      ${context.content}
      \`\`\`
      `;

    // Sostituisci il system prompt con quello aggiornato per la singola richiesta
    const messagesWithContext = [
      { role: "system", content: systemPromptWithContext },
      ...conversationHistory.filter((m) => m.role !== "system"),
    ];

    // Schema JSON unificato per tutte le azioni (Tool Call e VFS Actions)
    const responseSchema = {
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
    };

    try {
      // Chiamata non in streaming per ottenere l'output JSON strutturato
      const response = await getChatCompletion({
        provider,
        apiKey,
        modelName,
        messages: messagesWithContext,
        stream: false, // Non-streaming per output JSON
        responseSchema,
      });

      let parsedResponse;
      try {
        // 1. Estrai il JSON puro (gestisce i blocchi di codice Markdown)
        const jsonString = extractJsonFromMarkdown(response.text);
        // 2. Parsa il JSON
        parsedResponse = JSON.parse(jsonString);
      } catch (e) {
        throw new Error(`Failed to parse AI JSON response: ${response.text}`);
      }

      let { action, files, response_text, tool_call } = parsedResponse;
      let assistantResponseContent = "";
      let isToolCall = false;

      // --- Tolleranza per errore LLM: Mappa la vecchia struttura 'actions' alla nuova ---
      if (!action && parsedResponse.actions && parsedResponse.actions.length > 0) {
        const firstAction = parsedResponse.actions;
        action = firstAction.type;
        files = firstAction.files;
        // Non c'è un mapping chiaro per response_text o tool_call in questa struttura
      }
      // --------------------------------------------------------------------------------

      // Mappa la chiave 'tool_code' a 'action' per tollerare l'errore dell'LLM
      const finalAction = action || parsedResponse.tool_code;

      // Mappa le chiavi errate ('file_path', 'file_name') a 'path' per tollerare l'errore dell'LLM
      if (files && files.length > 0) {
        files.forEach((file) => {
          if (file.file_path && !file.path) {
            file.path = file.file_path;
            delete file.file_path;
          } else if (file.file_name && !file.path) {
            // L'LLM ha usato 'file_name' invece di 'path'
            file.path = file.file_name;
            delete file.file_name;
          }
        });
      }

      if (finalAction === "tool_call" && tool_call) {
        // --- GESTIONE TOOL CALL (Lettura File) ---
        isToolCall = true;
        const toolResult = fileStore.executeToolCall(tool_call);

        // Invia la risposta del tool come un nuovo messaggio 'user' (sistema) all'LLM
        const toolResponseMessage = {
          id: Date.now().toString(),
          role: "user",
          content: toolResult,
        };

        // Aggiungi il messaggio di risposta del tool alla chat
        addMessage(toolResponseMessage);

        // Riavvia la conversazione con il nuovo contesto (Tool Response)
        // Non aggiungiamo un messaggio 'assistant' qui, l'LLM risponderà nel prossimo ciclo
        get().sendMessage(userMessage, context, provider, apiKey, modelName);
        return; // Esci dal ciclo corrente
      } else if (action === "text_response") {
        // --- GESTIONE RISPOSTA TESTUALE NORMALE ---
        // Accetta sia 'response_text' (da schema) che 'text' (errore comune LLM)
        assistantResponseContent = response_text || parsedResponse.text;
        if (!assistantResponseContent) {
          throw new Error(`Missing text content for action 'text_response'.`);
        }
      } else if (
        ["create_files", "update_files", "delete_files"].includes(action) &&
        files
      ) {
        // --- GESTIONE AZIONI VFS (Scrittura/Eliminazione) ---
        const results = fileStore.applyFileActions(files, action);
        assistantResponseContent = `VFS Action Executed: ${action}\n\nResults:\n${results.join("\n")}`;
      } else {
        throw new Error(
          `Invalid or missing action/data in AI response: ${JSON.stringify(parsedResponse)}`
        );
      }

      // 3. Aggiungi la risposta finale dell'assistente (o il risultato dell'azione VFS)
      const finalAssistantMessage = {
        id: Date.now().toString(),
        role: "assistant",
        content: assistantResponseContent,
      };
      addMessage(finalAssistantMessage);
    } catch (e) {
      console.error("Error sending message to AI:", e);
      set({
        error:
          e.message || "An unknown error occurred during AI communication.",
      });
      // Rimuovi l'ultimo messaggio (utente) in caso di errore
      set((state) => {
        const { currentChatId, conversations } = state;
        const newConversations = conversations.map((chat) => {
          if (chat.id === currentChatId) {
            return {
              ...chat,
              messages: chat.messages.slice(0, -1),
            };
          }
          return chat;
        });
        return { conversations: newConversations };
      });
    } finally {
      set({ isStreaming: false });
      // 4. Salva la conversazione dopo il completamento
      get().saveConversation();
    }
  },
}));
