// src/stores/useAIStore.js
import { create } from "zustand";
import { getChatCompletion } from "../utils/aiService";
import { getAll, put, clear, remove } from "../utils/indexedDB";
import { useFileStore } from "./useFileStore";
import { parseMultiPartResponse } from "../utils/responseParser"; // Importa il nuovo parser
import {
  buildSystemPrompt,
  SYSTEM_PROMPT,
  getProjectStructurePrompt,
} from "./ai/systemPrompt";
import { getResponseSchema } from "./ai/responseSchema";
import { FRAMEWORK_2WHAV_PROMPT } from "./ai/2whavPrompt";
import Ajv from "ajv";

import { useTestRunner } from "../hooks/useTestRunner";
import { ENVIRONMENTS } from "./environment";
const stoppingObject = { isStopping: false };

// --- Validatore AJV ---
const ajv = new Ajv();
const schema = getResponseSchema();
const validateResponse = ajv.compile(schema);

const CONVERSATIONS_STORE_NAME = "aiConversations";

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
  initialPrompt: null, // Nuovo stato per il prompt iniziale
  abortController: null, // Per gestire l'annullamento delle chiamate fetch
  contextFiles: [], // Nuovo: Array per i percorsi dei file di contesto

  // --- AZIONI PER I FILE DI CONTESTO ---
  addContextFile: (path) =>
    set((state) => {
      if (!state.contextFiles.includes(path)) {
        return { contextFiles: [...state.contextFiles, path] };
      }
      return state;
    }),

  removeContextFile: (path) =>
    set((state) => ({
      contextFiles: state.contextFiles.filter((p) => p !== path),
    })),

  clearContextFiles: () => set({ contextFiles: [] }),
  // --- FINE AZIONI CONTESTO ---

  getMessages: () => {
    const { conversations, currentChatId } = get();
    const currentChat = conversations.find((c) => c.id === currentChatId);
    return currentChat ? currentChat.messages : initialMessages;
  },

  // Nuova azione per impostare e consumare il prompt iniziale
  setInitialPrompt: (prompt) => set({ initialPrompt: prompt }),
  consumeInitialPrompt: () => {
    const prompt = get().initialPrompt;
    if (prompt) {
      set({ initialPrompt: null }); // Resetta dopo la lettura
    }
    return prompt;
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
    get().clearContextFiles(); // Pulisce i file di contesto quando si crea una nuova chat
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
        typeof message.content !== "string" ||
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
    get().clearContextFiles(); // Pulisce anche i file di contesto
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

      return true; // Continua il loop
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

    // CORREZIONE: Gestisce il caso 'noop' prima di tentare di accedere a next_file.file.path
    // per evitare errori quando 'file' è un oggetto vuoto.
    if (next_file.action === "noop" && next_file.is_last_file) {
      addMessage({
        id: `${Date.now()}-res`,
        role: "file-status",
        content: "Task marked as complete by AI.",
      });
      set({ multiFileTaskState: null }); // Pulisce lo stato del task
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
      return true; // Continua il loop
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
   * Gestisce l'esecuzione dei test su richiesta dell'AI.
   * @returns {Promise<boolean>} True per continuare il loop.
   * @private
   */
  _handleRunTest: async (file) => {
    const { addMessage } = get();
    const runner = useTestRunner.getState();
    
    addMessage({
      id: `${Date.now()}-test-status`,
      role: "test-status",
      content: `Running tests${file ? ` on ${file}` : '...'}`
    });

    try {
      const results = await runner.runTests(file);
      
      // Formatta i risultati per l'AI
      let output = `Test Results:\n`;
      output += `Status: ${results.numFailedTests === 0 ? 'PASSED' : 'FAILED'}\n`;
      output += `Passed: ${results.numPassedTests}, Failed: ${results.numFailedTests}, Total: ${results.numTotalTests}\n`;
      
      if (results.numFailedTests > 0) {
        output += `\nFailures:\n`;
        results.testResults.forEach(suite => {
          suite.assertionResults.forEach(assertion => {
            if (assertion.status === 'fail') {
              output += `- ${assertion.fullName}: ${assertion.failureMessages.join(', ')}\n`;
            }
          });
        });
      }

      addMessage({
        id: `${Date.now()}-test-res`,
        role: "test-status",
        content: output
      });
      
      return true; // Continua il loop per permettere all'AI di commentare o fixare
    } catch (e) {
      addMessage({
        id: `${Date.now()}-test-err`,
        role: "test-status",
        content: `Error running tests: ${e.message}`
      });
      return true;
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
      // Dopo una risposta testuale, il loop si interrompe.
    } else if (action === "tool_call" && tool_call) {
      shouldContinue = await get()._handleToolCall(tool_call);
      // Dopo una chiamata a tool, il loop continua.
    } else if (action === "start_multi_file" && plan && first_file) {
      shouldContinue = await get()._handleStartMultiFile(
        plan,
        first_file,
        message
      );
    } else if (action === "continue_multi_file" && next_file) {
      shouldContinue = await get()._handleContinueMultiFile(next_file, message);
    } else if (action === "run_test") {
      const filePath = file?.path || (typeof file === 'string' ? file : undefined);
      shouldContinue = await get()._handleRunTest(filePath);
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
    return shouldContinue; // Ritorna la decisione dell'handler
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
    const { addMessage, currentChatId, contextFiles } = get();
    const fileStore = useFileStore.getState();

    if (!provider || !apiKey || !modelName) {
      set({
        error: "Missing required parameters: provider, apiKey, or modelName",
      });
      return;
    }

    if (!context || !context.currentFile || context.currentFile === "none") {
      // Fallback: prova a prendere il file attivo dallo store se disponibile
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
        abortController: controller,
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

        if (startFilePath && startFilePath !== "none") {
          const freshFile = Object.values(useFileStore.getState().files).find(
            (f) => f && normalizePath(f.path) === normalizePath(startFilePath)
          );

          if (freshFile) {
            context.content = freshFile.content;
          } else {
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

        // --- NUOVA LOGICA: COSTRUISCI CONTESTO AGGIUNTIVO ---
        const allFiles = Object.values(useFileStore.getState().files); // CORREZIONE: Converti oggetto in array
        const userProvidedContext = contextFiles
          .map((path) => {
            const file = allFiles.find((f) => f && f.path === path);
            if (file) {
              return `--- ${path} ---\n${file.content}`;
            }
            return `--- ${path} ---\n(File not found)`;
          })
          .join("\n\n");
        // --- FINE NUOVA LOGICA ---

        const systemPromptWithContext = buildSystemPrompt(
          context,
          currentMultiFileState,
          useAIStore,
          fileStore,
          userProvidedContext // Passa il nuovo contesto
        );

        const recentHistory = conversationHistory
          .filter((m) => m.role !== "system" && m.role !== "status")
          .filter((m) => m.content && m.content.toString().trim().length > 0)
          .slice(-10);

        const messagesForLLM = [
          { role: "system", content: systemPromptWithContext },
          ...recentHistory,
        ];

        const response = await getChatCompletion({
          provider,
          apiKey,
          modelName,
          messages: messagesForLLM,
          stream: false,
          responseSchema,
          signal: controller.signal,
          maxTokens: 8192,
        });

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

        const jsonObject = parseMultiPartResponse(rawText);

        if (!jsonObject) {
          console.error("Failed to parse AI response.", rawText);
          addMessage({
            id: Date.now().toString(),
            role: "assistant",
            content:
              "⚠️ Error: Could not parse the response structure. Raw response:\n" +
              rawText,
          });
          continue;
        }

        console.log("Parsed AI Response JSON:", jsonObject);

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
            role: "user",
            content: `[SYSTEM-ERROR] Your response does not conform to the required JSON schema. Please correct it. Errors:\n${validationErrors}`,
          });
          continue;
        }

        toolCallCount++;
        const shouldContinue = await get()._handleParsedResponse(jsonObject);

        if (shouldContinue) {
          continue;
        } else {
          break;
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
              if (msg.role === "file-status" || msg.role === "content") {
                return { ...msg, role: "status" };
              }
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

  /**
   * Usa il framework 2WHAV per espandere un prompt utente semplice in una specifica tecnica dettagliata.
   * @param {string} userPrompt - Il testo inserito dall'utente.
   * @param {object} settings - Le impostazioni AI correnti (provider, apiKey, modelName).
   * @param {string} [mode='[FULL]'] - La modalità 2WHAV da applicare.
   * @returns {Promise<string>} Il prompt esteso o un messaggio di errore.
   */
  extendPromptWith2WHAV: async (userPrompt, settings, mode = "[FULL]") => {
    const fileStore = useFileStore.getState();
    const { provider, apiKey, modelName, environment } = settings;

    if (!provider || !apiKey || !modelName) {
      const errorMsg = "Error: AI provider settings are not configured.";
      console.error(errorMsg);
      return errorMsg;
    }

    const projectStructure = getProjectStructurePrompt(fileStore);

    const specificationSystemPrompt = `You are a prompt engineering expert specializing in the 2WHAV framework. The current project environment is "${environment}".
Your task is to take a user's request and expand it into a detailed, structured prompt using the 2WHAV framework provided below.
Analyze the user's request and the provided project structure, identify the implicit requirements, and populate all relevant phases of the framework with specific file paths and details.
The final output should be ONLY the generated markdown prompt, ready to be used.`;

    const messages = [
      {
        role: "system",
        content: `${specificationSystemPrompt}\n\n${projectStructure}\n\n${FRAMEWORK_2WHAV_PROMPT}`,
      },
      {
        role: "user",
        content: `Apply 2WHAV ${mode} to: "${userPrompt}"`,
      },
    ];

    set({ isStreaming: true, error: null });

    try {
      const response = await getChatCompletion({
        provider,
        apiKey,
        modelName,
        messages,
        stream: false,
        maxTokens: 4096,
      });

      const extendedPrompt =
        response?.text ||
        response?.content ||
        response?.candidates?.[0]?.content?.parts?.[0]?.text ||
        "";

      return extendedPrompt.trim();
    } catch (error) {
      console.error("Error extending prompt with 2WHAV:", error);
      return `Error during prompt extension: ${error.message}`;
    } finally {
      set({ isStreaming: false });
    }
  },
}));
