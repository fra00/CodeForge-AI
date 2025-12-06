// src/stores/useAIStore.js
import { create } from "zustand";
import { getChatCompletion } from "../utils/aiService";
import { getAll, put, clear, remove } from "../utils/indexedDB";
import { useFileStore } from "./useFileStore";
import { extractAndSanitizeJson } from "../utils/extractAndSanitizeJson";
import { buildSystemPrompt, SYSTEM_PROMPT } from "./ai/systemPrompt";
import { getResponseSchema } from "./ai/responseSchema";
import Ajv from "ajv";

import { ENVIRONMENTS } from "./environment";
const stoppingObject = { isStopping: false };

// --- Validatore AJV ---
const ajv = new Ajv();
const validateResponse = ajv.compile(getResponseSchema());

const CONVERSATIONS_STORE_NAME = "aiConversations";

const MAX_AUTO_FIX_ATTEMPTS = 3;

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
      "Hello! I am Code Assistant, your AI software engineer assistant. How can I help you with your code today?",
  },
];

const normalizePath = (path) => {
  if (!path) return "";
  // Rimuove ./ iniziale e normalizza gli slash
  return path
    .replace(/^[./]+/, "")
    .replace(/\\/g, "/")
    .trim();
};

/**
 * Normalizza la risposta per retrocompatibilità e pulizia
 */
const normalizeResponse = (response) => {
  let normalized = { ...response };

  // Mappa tool_code -> action
  if (!normalized.action && normalized.tool_code) {
    normalized.action = normalized.tool_code;
  }

  // Mappa array actions -> action singola
  if (
    !normalized.action &&
    normalized.actions &&
    Array.isArray(normalized.actions) &&
    normalized.actions.length > 0
  ) {
    normalized.action = normalized.actions[0].type;
    normalized.files = normalized.actions[0].files;
  }

  // Normalizza path dei file e rimuove oggetti malformati
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

  // Mappa text -> text_response
  if (
    normalized.action === "text_response" &&
    !normalized.text_response &&
    normalized.text
  ) {
    normalized.text_response = normalized.text;
  }
  return normalized;
};

const createNewChat = (id) => ({
  id: id || Date.now().toString(),
  title: "Nuova Chat",
  messages: initialMessages,
  timestamp: new Date().toISOString(),
  environment: "web", // Default a 'web' per le nuove chat
});

export const useAIStore = create((set, get) => ({
  conversations: [],
  currentChatId: null,
  isStreaming: false,
  error: null,
  multiFileTaskState: null,
  autoFixAttempts: 0,
  abortController: null, // Per gestire l'annullamento delle chiamate fetch

  getMessages: () => {
    const { conversations, currentChatId } = get();
    const currentChat = conversations.find((c) => c.id === currentChatId);
    return currentChat ? currentChat.messages : initialMessages;
  },

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
   * Interrompe attivamente la chiamata di rete in corso.
   */
  stopGeneration: () => {
    console.log("[AIStore] Stop generation requested.");
    get().abortController?.abort(); // Attiva il segnale di interruzione
    stoppingObject.isStopping = true; // Imposta il flag di stop
  },

  /**
   * Imposta l'ambiente di programmazione per la chat corrente e lo salva.
   */
  setChatEnvironment: (environment) => {
    set((state) => ({
      conversations: state.conversations.map((chat) =>
        chat.id === state.currentChatId ? { ...chat, environment } : chat
      ),
    }));
    // Salva immediatamente la conversazione per persistere il cambio di ambiente.
    get().saveConversation();
  },

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

  newChat: () => {
    const newChat = createNewChat();
    set((state) => ({
      conversations: [...state.conversations, newChat],
      currentChatId: newChat.id,
      error: null,
    }));
  },

  selectChat: (chatId) => {
    set({ currentChatId: chatId, error: null });
  },

  deleteChat: async (chatId) => {
    const { conversations } = get();
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
      set({ error: e.message });
    }
  },

  /**
   * 🛡️ GUARDIA DELLO STORE
   * Impedisce l'aggiunta di messaggi vuoti che sporcano la UI e rompono l'API
   */
  addMessage: (message) =>
    set((state) => {
      if (
        !message ||
        !message.content ||
        message.content.toString().trim() === ""
      ) {
        console.warn("⚠️ [useAIStore] Messaggio vuoto scartato:", message);
        return state;
      }

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
      return { conversations: newConversations, error: null };
    }),

  clearConversation: () => {
    const { currentChatId } = get();
    set((state) => ({
      conversations: state.conversations.map((chat) => {
        if (chat.id === currentChatId) {
          return { ...chat, messages: initialMessages };
        }
        return chat;
      }),
      error: null,
    }));
  },

  /**
   * Elimina un singolo messaggio dalla chat corrente.
   */
  deleteMessage: async (messageId) => {
    // Impedisce di eliminare il system prompt o l'ultimo messaggio rimasto
    const messages = get().getMessages();
    if (messages.length <= 2 || messageId === "system-prompt") {
      console.warn("Cannot delete the last message or the system prompt.");
      return;
    }

    set((state) => ({
      conversations: state.conversations.map((chat) => {
        if (chat.id === state.currentChatId) {
          return {
            ...chat,
            messages: chat.messages.filter((m) => m.id !== messageId),
          };
        }
        return chat;
      }),
    }));

    // Salva la conversazione aggiornata su IndexedDB
    await get().saveConversation();
  },

  // --- Auto-Debugging Cycle ---

  /**
   * Attende e controlla se l'ultima azione ha causato un errore di runtime.
   * Se sì, avvia un ciclo di correzione. Altrimenti, procede.
   * @returns {boolean} True se il ciclo principale deve continuare, false altrimenti.
   * @private
   */
  _checkForRuntimeErrors: async () => {
    const { addMessage, sendMessage, multiFileTaskState } = get();

    // Attendi che l'iframe si ricarichi e che eventuali errori vengano catturati
    await new Promise((resolve) => setTimeout(resolve, 2500));

    const lastError = window.projectContext?.lastIframeError;
    window.projectContext.lastIframeError = null; // Consuma l'errore

    if (lastError) {
      const currentAttempts = get().autoFixAttempts;
      if (currentAttempts >= MAX_AUTO_FIX_ATTEMPTS) {
        const errorMessage = `❌ Auto-fix failed after ${MAX_AUTO_FIX_ATTEMPTS} attempts. Last error: ${lastError}`;
        addMessage({
          id: Date.now().toString(),
          role: "assistant",
          content: errorMessage,
        });
        set({ autoFixAttempts: 0, multiFileTaskState: null }); // Interrompi tutto
        return false;
      }

      set({ autoFixAttempts: currentAttempts + 1 });
      const systemErrorMessage = `[SYSTEM-ERROR] The last action caused a runtime error: "${lastError}". Please analyze the code and fix it.`;
      addMessage({
        id: Date.now().toString(),
        role: "user", // Lo presentiamo come un input di sistema per l'AI
        content: systemErrorMessage,
      });

      // Pulisci la console per evitare di rileggere lo stesso errore.
      if (typeof window.clearProjectConsole === "function") {
        window.clearProjectConsole();
      }

      return true; // Continua il loop di sendMessage per la correzione
    }

    // Successo! Nessun errore.
    set({ autoFixAttempts: 0 });

    // Se siamo in un task multi-file, controlla se è finito.
    if (multiFileTaskState && multiFileTaskState.remainingFiles.length === 0) {
      addMessage({
        id: Date.now().toString(),
        role: "status", // Ruolo di stato per non inquinare la cronologia AI
        content: "Multi-file task completed successfully.",
      });
      set({ multiFileTaskState: null });
      return false; // Task finito, interrompi il loop.
    }

    // Se siamo in un task multi-file e ci sono altri file, continua.
    return !!multiFileTaskState;
  },

  // --- Action Handlers (Refactored from sendMessage) ---

  /**
   * Gestisce la logica per una risposta testuale semplice.
   * @returns {Promise<boolean>} Sempre false per interrompere il loop.
   * @private
   */
  _handleTextResponse: (text_response) => {
    const { addMessage } = get();
    const finalContent = text_response || "✅ Done.";
    addMessage({
      id: Date.now().toString(),
      role: "assistant",
      content: finalContent,
    });
    return Promise.resolve(false); // Interrompe il loop
  },

  /**
   * Gestisce la logica per una chiamata a un tool (list_files, read_file).
   * @returns {Promise<boolean>} Sempre true per continuare il loop.
   * @private
   */
  _handleToolCall: (tool_call) => {
    const { addMessage } = get();
    const fileStore = useFileStore.getState();

    const isBatchRead =
      tool_call.function_name === "read_file" &&
      Array.isArray(tool_call.args.paths);
    const logArgs = isBatchRead
      ? `(Batch: ${tool_call.args.paths.length} files)`
      : `(Args: ${JSON.stringify(tool_call.args)})`;

    addMessage({
      id: `${Date.now()}-tool-status`,
      role: "file-status", // Ruolo speciale per messaggi di stato, non inviati all'AI
      content: `Executing: ${tool_call.function_name} ${logArgs}`,
    });

    let toolResult = "";
    try {
      if (isBatchRead) {
        const paths = tool_call.args.paths;
        const results = paths.map((path) => {
          try {
            const singleResult = fileStore.executeToolCall({
              function_name: "read_file",
              args: { path },
            });
            return `--- FILE: ${path} ---\n${singleResult || "(Empty File)"}`;
          } catch (err) {
            return `--- ERROR READING FILE: ${path} ---\n${err.message}`;
          }
        });
        toolResult = results.join("\n\n");
      } else {
        toolResult = fileStore.executeToolCall(tool_call);
      }
    } catch (e) {
      toolResult = `Error executing tool: ${e.message}`;
    }

    if (!toolResult || toolResult.trim() === "") {
      toolResult = "[Action executed successfully, but returned no content]";
    }

    addMessage({
      id: `${Date.now()}-tool-res`,
      role: "user",
      content: `[Tool Result]\n${toolResult}`,
    });

    return Promise.resolve(true); // Continua il loop
  },

  /**
   * Gestisce la logica per l'inizio di un task multi-file.
   * @returns {Promise<boolean>} True per continuare il loop, false per interromperlo.
   * @private
   */
  _handleStartMultiFile: async (plan, first_file, message) => {
    const { addMessage } = get();
    const fileStore = useFileStore.getState();

    set({
      multiFileTaskState: {
        plan: plan.description,
        allFiles: plan.files_to_modify,
        completedFiles: [],
        remainingFiles: plan.files_to_modify,
      },
    });
    addMessage({
      id: Date.now().toString(),
      role: "assistant", // Ruolo di stato per non inquinare la cronologia AI
      content: `Start Task: ${plan.description} + \n ${message}`,
    });

    try {
      const result = fileStore.applyFileActions(
        first_file.action,
        first_file.file,
        first_file.tags // Passa i tag allo store dei file
      );
      addMessage({
        id: `${Date.now()}-res`,
        role: "file-status", // Ruolo di stato per non inquinare la cronologia AI
        content: result || "First file action completed.",
      });

      const currentPath = first_file.file.path;
      set((state) => ({
        multiFileTaskState: {
          ...state.multiFileTaskState,
          completedFiles: [currentPath],
          remainingFiles: state.multiFileTaskState.remainingFiles.filter(
            (f) => normalizePath(f) !== normalizePath(currentPath)
          ),
        },
      }));

      return true;
      // return await get()._checkForRuntimeErrors();
    } catch (e) {
      addMessage({
        id: Date.now().toString(),
        role: "assistant",
        content: `Error: ${e.message}`,
      });
      set({ multiFileTaskState: null });
      return false;
    }
  },

  /**
   * Gestisce la logica per la continuazione di un task multi-file.
   * @returns {Promise<boolean>} True per continuare il loop, false per interromperlo.
   * @private
   */
  _handleContinueMultiFile: async (next_file, message) => {
    const { addMessage } = get();
    const fileStore = useFileStore.getState();
    const taskState = get().multiFileTaskState;

    if (!taskState) {
      addMessage({
        id: `${Date.now()}-err`,
        role: "assistant",
        content: "⚠️ No active task state found.",
      });
      return false; // Interrompe il loop
    }

    addMessage({
      id: `${Date.now()}-msg`,
      role: "assistant", // Ruolo di stato per non inquinare la cronologia AI
      content: `Continuing with ${next_file.file.path} \n ${message}`,
    });

    try {
      const result = fileStore.applyFileActions(
        next_file.action,
        next_file.file,
        next_file.tags // Passa i tag allo store dei file
      );
      addMessage({
        id: `${Date.now()}-res`,
        role: "file-status", // Ruolo di stato per non inquinare la cronologia AI
        content: result || "Action completed.",
      });

      const currentPath = next_file.file.path;
      set((state) => ({
        multiFileTaskState: {
          ...state.multiFileTaskState,
          completedFiles: [
            ...state.multiFileTaskState.completedFiles,
            currentPath,
          ],
          remainingFiles: state.multiFileTaskState.remainingFiles.filter(
            (f) => normalizePath(f) !== normalizePath(currentPath)
          ),
        },
      }));

      // return await get()._checkForRuntimeErrors();
    } catch (e) {
      addMessage({
        id: Date.now().toString(),
        role: "assistant",
        content: `Error: ${e.message}`,
      });
      set({ multiFileTaskState: null });
      return false;
    }
  },

  /**
   * Dispatcher principale che smista la risposta parsata dell'AI all'handler corretto.
   * @returns {Promise<boolean>} True se il loop di `sendMessage` deve continuare, altrimenti false.
   * @private
   */
  _handleParsedResponse: async (jsonObject) => {
    const {
      action,
      file,
      text_response,
      tool_call,
      plan,
      first_file,
      next_file,
      message,
    } = jsonObject;

    let shouldContinue = false; // Default: non continuare il loop.
    if (action === "text_response") {
      shouldContinue = await get()._handleTextResponse(text_response);
      return false; // Dopo una risposta testuale, continua per eventuali altre azioni
    } else if (action === "tool_call" && tool_call) {
      shouldContinue = await get()._handleToolCall(tool_call);
      return true; // Dopo una chiamata a tool, continua per eventuali altre azioni
    } else if (action === "start_multi_file" && plan && first_file) {
      shouldContinue = await get()._handleStartMultiFile(
        plan,
        first_file,
        message
      );
    } else if (action === "continue_multi_file" && next_file) {
      shouldContinue = await get()._handleContinueMultiFile(next_file, message);
    } else {
      // Se nessuna azione corrisponde, aggiungi un messaggio di errore e interrompi
      console.warn("Unhandled action type:", action, jsonObject);
      get().addMessage({
        id: Date.now().toString(),
        role: "user", // Lo presentiamo come un errore di sistema che l'AI deve vedere
        content: `[SYSTEM-ERROR] The action '${action}' is not a valid or recognized action. Please review the available actions and correct your response.`,
      });
      shouldContinue = false; // Non continuare
    }
    // shouldContinue = await get()._checkForRuntimeErrors();
    return shouldContinue;
  },

  /**
   * Logica principale di interazione con l'AI
   */
  sendMessage: async (
    userMessage,
    context,
    provider,
    apiKey,
    modelName,
    maxToolCalls = 20
  ) => {
    const { addMessage, currentChatId } = get();
    const fileStore = useFileStore.getState();

    if (!provider || !apiKey || !modelName) {
      set({
        error: "Missing required parameters: provider, apiKey, or modelName",
      });
      return;
    }

    if (!context || !context.currentFile || context.currentFile === "none") {
      // Fallback: prova a prendere il file attivo dallo store se disponibile
      // Nota: Adatta 'activeFilePath' al nome esatto della proprietà nel tuo fileStore se diverso
      const activePath = fileStore.activeFilePath;
      const activeFile = activePath
        ? fileStore.files.find((f) => f.path === activePath)
        : null;

      context = {
        language: activeFile?.language || "text",
        currentFile: activeFile?.path || "none",
        content: activeFile?.content || "",
      };
    }

    let toolCallCount = 0;

    try {
      // Aggiunta messaggio utente
      if (userMessage && userMessage.trim()) {
        const newUserMessage = {
          id: Date.now().toString(),
          role: "user",
          content: userMessage.trim(),
        };

        // Pulizia messaggio di benvenuto
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

      const controller = new AbortController();
      set({
        isStreaming: true,
        error: null,
        abortController: controller, // <-- SALVA IL CONTROLLER NELLO STATO
      });
      const responseSchema = getResponseSchema();

      const startFilePath = context.currentFile;
      stoppingObject.isStopping = false; // Reset flag di stop
      while (toolCallCount < maxToolCalls) {
        if (stoppingObject.isStopping) {
          console.log("[AIStore] Generation stopped by user.");
          addMessage({
            id: Date.now().toString(),
            role: "status",
            content: "⚠️ Generation stopped by user.",
          });
          break;
        }
        // 🛑 LOGICA SEMPLIFICATA
        if (startFilePath && startFilePath !== "none") {
          // FIX: Usa Object.values() per iterare correttamente l'oggetto files
          const freshFile = Object.values(useFileStore.getState().files).find(
            (f) => f && normalizePath(f.path) === normalizePath(startFilePath)
          );

          if (freshFile) {
            // CASO 1: Il file esiste ancora (è stato solo modificato) -> Aggiorna contenuto
            context.content = freshFile.content;
          } else {
            // CASO 2: Il file è sparito (rinominato o cancellato)
            context.content =
              "(File no longer exists at this path - possibly renamed or deleted)";
          }
        }

        const currentChat = get().conversations.find(
          (c) => c.id === currentChatId
        );
        const conversationHistory = currentChat
          ? currentChat.messages
          : initialMessages;
        const currentMultiFileState = get().multiFileTaskState;

        const systemPromptWithContext = buildSystemPrompt(
          context,
          currentMultiFileState,
          useAIStore,
          fileStore
        );

        // Filtra i messaggi non utili per l'AI e prendi solo gli ultimi 20
        const recentHistory = conversationHistory
          // 🛡️ FILTRO API: Rimuove messaggi di sistema e di stato
          .filter((m) => m.role !== "system" && m.role !== "status")
          .filter((m) => m.content && m.content.toString().trim().length > 0)
          .slice(-20); // Prendi solo gli ultimi 20 messaggi

        // Prepara il payload finale per l'API
        const messagesForLLM = [
          { role: "system", content: systemPromptWithContext },
          ...recentHistory,
        ];

        // Chiamata LLM
        const response = await getChatCompletion({
          provider,
          apiKey,
          modelName,
          messages: messagesForLLM,
          stream: false,
          responseSchema,
          signal: controller.signal, // Passa il signal per l'annullamento
          maxTokens: 8192,
        });

        // Check Troncamento
        if (response.truncated) {
          addMessage({
            id: Date.now().toString(),
            role: "assistant",
            content: "⚠️ Risposta troncata (limite token).",
          });
          set({ isStreaming: false });
          await get().saveConversation();
          return;
        }

        // Parsing Risposta
        let rawText;
        if (typeof response === "string") {
          rawText = response;
        } else if (response.text) {
          rawText = response.text;
        } else if (response.content) {
          rawText = response.content;
        } else if (response.candidates?.[0]?.content?.parts?.[0]?.text) {
          rawText = response.candidates[0].content.parts[0].text;
        } else {
          rawText = JSON.stringify(response);
        }

        const { rawJsonContent, contentFile } = extractAndSanitizeJson(rawText);
        if (!rawJsonContent) {
          addMessage({
            id: Date.now().toString(),
            role: "assistant",
            content: "⚠️ NO JSON VALID:\n" + rawText,
          });
          continue;
        }
        // if (!jsonString) throw new Error("No valid JSON found in AI response.");

        let jsonObject = null;
        try {
          jsonObject = JSON.parse(rawJsonContent);
        } catch (e) {
          console.error(
            "JSON Parse Error:",
            e,
            "Raw JSON String:",
            rawJsonContent
          );
        }
        jsonObject = normalizeResponse(jsonObject);

        // --- INIEZIONE PRAGMATICA (Opzione 2) ---
        // Centralizziamo qui la logica di "arricchimento" del JSON.
        // Iniettiamo il `contentFile` nell'oggetto corretto prima di procedere.
        if (contentFile) {
          const action = jsonObject.action;

          if (
            ["create_file", "update_file"].includes(action) &&
            jsonObject.file
          ) {
            jsonObject.file.content = contentFile;
            console.log(
              `[Injector] Injected content into single action file: ${jsonObject.file.path}`
            );
          } else if (
            action === "start_multi_file" &&
            jsonObject.first_file?.file
          ) {
            jsonObject.first_file.file.content = contentFile;
            console.log(
              `[Injector] Injected content into multi-file start: ${jsonObject.first_file.file.path}`
            );
          } else if (
            action === "continue_multi_file" &&
            jsonObject.next_file?.file
          ) {
            jsonObject.next_file.file.content = contentFile;
            console.log(
              `[Injector] Injected content into multi-file continue: ${jsonObject.next_file.file.path}`
            );
          }
        }

        console.log("Parsed AI Response JSON:", jsonObject);

        // --- 🛡️ VALIDAZIONE DELLO SCHEMA ---
        // Questo è il "controllo qualità" che rende lo schema un contratto blindato.
        const isValid = validateResponse(jsonObject);
        if (!isValid) {
          const validationErrors = JSON.stringify(
            validateResponse.errors,
            null,
            2
          );
          console.error(
            "AI Response failed schema validation:",
            validationErrors
          );
          addMessage({
            id: Date.now().toString(),
            role: "user", // Lo presentiamo come un errore di sistema che l'AI deve vedere
            content: `[SYSTEM-ERROR] Your response does not conform to the required JSON schema. Please correct it. Errors:\n${validationErrors}`,
          });
          // Continuiamo il loop per permettere all'AI di correggersi.
          continue;
        }

        // --- DISPATCHER ---
        // Delega la gestione della risposta agli handler specifici.
        // Il risultato booleano determina se il loop deve continuare.
        toolCallCount++;
        const shouldContinue = await get()._handleParsedResponse(jsonObject);

        if (shouldContinue) {
          continue; // Prossima iterazione del while loop
        } else {
          break; // Esci dal while loop
        }
      }

      if (toolCallCount >= maxToolCalls) {
        addMessage({
          id: Date.now().toString(),
          role: "assistant",
          content: `⚠️ Operation count limit reached ${maxToolCalls} calls.`,
        });
      }
    } catch (e) {
      // Gestisce tutti gli altri errori
      console.error("Error in AI conversation:", e);
      set({ error: e.message });
      addMessage({
        id: Date.now().toString(),
        role: "assistant",
        content: `❌ Error: ${e.message}`,
      });
    } finally {
      set((state) => {
        const newConversations = state.conversations.map((chat) => {
          if (chat.id === state.currentChatId) {
            const updatedMessages = chat.messages.map((msg) => {
              // Trasforma 'file-status' e 'content' in 'status'
              if (msg.role === "file-status" || msg.role === "content") {
                return { ...msg, role: "status" };
              }
              // Trasforma anche i risultati dei tool in messaggi di stato
              if (
                msg.role === "user" &&
                msg.content.startsWith("[Tool Result]")
              ) {
                return { ...msg, role: "status" };
              }
              return msg;
            });
            return { ...chat, messages: updatedMessages };
          }
          return chat;
        });
        return { conversations: newConversations };
      });
      set({ isStreaming: false, abortController: null });
      addMessage({
        id: Date.now().toString(),
        role: "assistant",
        content: `✓ Task completed. Total tool calls: ${toolCallCount}.`,
      });
      await get().saveConversation();
    }
  },
}));
