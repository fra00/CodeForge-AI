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
 */
const extractJsonFromMarkdown = (text) => {
  if (!text || typeof text !== "string") return null;
  const trimmed = text.trim();

  // Strategia 1: Cerca blocco ```json ... ```
  const jsonBlockMatch = trimmed.match(/```json\s*([\s\S]*?)\s*```/);
  if (jsonBlockMatch && jsonBlockMatch[1]) {
    return jsonBlockMatch[1].trim();
  }

  // Strategia 2: Cerca blocco ``` ... ``` generico
  const genericBlockMatch = trimmed.match(/```\s*([\s\S]*?)\s*```/);
  if (genericBlockMatch && genericBlockMatch[1]) {
    const content = genericBlockMatch[1].trim();
    if (content.startsWith("{") || content.startsWith("[")) {
      return content;
    }
  }

  // Strategia 3: Trova parentesi graffe esterne
  const firstBrace = trimmed.indexOf("{");
  const lastBrace = trimmed.lastIndexOf("}");
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    try {
      const extracted = trimmed.substring(firstBrace, lastBrace + 1);
      JSON.parse(extracted); // Test validità
      return extracted;
    } catch (e) {
      // Non valido, continua
    }
  }

  // Strategia 4: Testo grezzo
  if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
    return trimmed;
  }

  return null;
};

/**
 * Sanitizza una stringa JSON
 */
const sanitizeJsonString = (jsonString) => {
  if (!jsonString) return jsonString;
  try {
    JSON.parse(jsonString);
    return jsonString;
  } catch (e) {}

  // Fix escape characters inside strings
  let fixed = jsonString;
  const stringPattern = /"([^"\\]*(\\.[^"\\]*)*)"/g;
  fixed = fixed.replace(stringPattern, (match) => {
    return match
      .replace(/\\n/g, "\\n")
      .replace(/\\t/g, "\\t")
      .replace(/\\r/g, "\\r");
  });
  return fixed;
};

/**
 * Valida la struttura della risposta
 */
const validateResponseStructure = (response) => {
  if (!response || typeof response !== "object") return false;
  const validActions = [
    "create_files",
    "update_files",
    "delete_files",
    "text_response",
    "tool_call",
    "start_multi_file",
    "continue_multi_file",
  ];
  return validActions.includes(response.action);
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

  // Mappa text -> response_text
  if (
    normalized.action === "text_response" &&
    !normalized.response_text &&
    normalized.text
  ) {
    normalized.response_text = normalized.text;
  }
  return normalized;
};

const createNewChat = (id) => ({
  id: id || Date.now().toString(),
  title: "Nuova Chat",
  messages: initialMessages,
  timestamp: new Date().toISOString(),
});

/**
 * Costruisce il System Prompt Dinamico con regole rafforzate
 */
const buildSystemPrompt = (context, multiFileTaskState) => {
  let prompt = `${SYSTEM_PROMPT}

---

# ⚠️ REGOLE CRITICHE PER I FILE (GOLDEN RULES)
1. **IL PATH È OBBLIGATORIO**: Ogni singolo oggetto dentro 'files' o 'file' DEVE avere una proprietà "path" valida (es. "src/components/Button.jsx").
2. **BATCH READING**: Se devi leggere più file (es. per analisi), usa "paths": [...] (array) in una singola chiamata read_file.
3. **JSON PURO**: Non scrivere testo introduttivo prima del JSON.

---

# Istruzioni per l'Output Strutturato

Devi rispondere ESCLUSIVAMENTE con un oggetto JSON valido.
 
 ## 1. Risposta Solo Testuale
Usa 'text_response' per spiegazioni o domande.

## 2. Tool Call (Lettura File e Analisi)
Usa 'tool_call' per interagire con il file system.

**list_files**: Elenca i file nel progetto.
\`\`\`json
{
  "action": "tool_call",
  "tool_call": { "function_name": "list_files", "args": {} }
}
\`\`\`

**read_file**: Legge il contenuto dei file.
IMPORTANTE: Se devi analizzare più file, NON leggerli uno alla volta.
Usa il parametro "paths" (array) per richiedere TUTTI i file necessari in una sola chiamata.

Esempio Batch Reading:
\`\`\`json
{
  "action": "tool_call",
  "tool_call": {
    "function_name": "read_file",
    "args": {
      "paths": ["src/App.jsx", "src/style.css", "src/utils.js"]
    }
  }
}
\`\`\`

## 3. Azioni sul File System (Scrittura)
Usa 'create_files', 'update_files', 'delete_files' per operazioni immediate.
Ogni file DEVE avere "path".

## 4. Multi-File Task (Modifiche Complesse)
Usa 'start_multi_file' e 'continue_multi_file' per refactoring che toccano molti file in sequenza.

---

# Contesto del File Attivo

- Language: ${context.language || "unknown"}
- File Name: ${context.currentFile || "none"}
- Content:
\`\`\`${context.language || "text"}
${context.content || "(empty)"}
\`\`\`
`;

  // Iniezione Stato Multi-File
  if (multiFileTaskState) {
    const nextFile = multiFileTaskState.remainingFiles[0];
    prompt += `
---
# ⚠️ MULTI-FILE TASK IN CORSO
Attualmente sei nel mezzo di un task multi-file. DEVI completare il piano.

Piano: ${multiFileTaskState.plan}
File completati: ${JSON.stringify(multiFileTaskState.completedFiles)}
File Rimanenti: ${JSON.stringify(multiFileTaskState.remainingFiles)}

## ISTRUZIONE CRITICA:
Hai ancora ${multiFileTaskState.remainingFiles.length} file da processare.
Il prossimo file che DEVI modificare è: "${nextFile}".

La tua PROSSIMA risposta DEVE essere un JSON con action "continue_multi_file" per processare "${nextFile}".
NON usare "text_response". NON fermarti. Procedi col codice per "${nextFile}".
`;
  }

  return prompt;
};

/**
 * Schema JSON per la validazione (incluso 'paths' array)
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
        "start_multi_file",
        "continue_multi_file",
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
    message: { type: "string" },
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
            paths: { type: "array", items: { type: "string" } }, // Batch support
          },
        },
      },
      required: ["function_name", "args"],
    },
    plan: {
      type: "object",
      properties: {
        description: { type: "string" },
        files_to_modify: { type: "array", items: { type: "string" } },
      },
    },
    first_file: {
      type: "object",
      properties: {
        action: { type: "string" },
        file: {
          type: "object",
          properties: { path: { type: "string" }, content: { type: "string" } },
        },
      },
    },
    next_file: {
      type: "object",
      properties: {
        action: { type: "string" },
        file: {
          type: "object",
          properties: { path: { type: "string" }, content: { type: "string" } },
        },
      },
    },
  },
  required: ["action"],
});

export const useAIStore = create((set, get) => ({
  conversations: [],
  currentChatId: null,
  isStreaming: false,
  error: null,
  multiFileTaskState: null,

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
   * Logica principale di interazione con l'AI
   */
  sendMessage: async (
    userMessage,
    context,
    provider,
    apiKey,
    modelName,
    maxToolCalls = 10
  ) => {
    const { addMessage, currentChatId } = get();
    const fileStore = useFileStore.getState();

    if (!provider || !apiKey || !modelName) {
      set({
        error: "Missing required parameters: provider, apiKey, or modelName",
      });
      return;
    }

    if (!context)
      context = { language: "text", currentFile: "none", content: "" };

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

      set({ isStreaming: true, error: null });
      const responseSchema = getResponseSchema();

      while (toolCallCount < maxToolCalls) {
        const currentChat = get().conversations.find(
          (c) => c.id === currentChatId
        );
        const conversationHistory = currentChat
          ? currentChat.messages
          : initialMessages;
        const currentMultiFileState = get().multiFileTaskState;

        const systemPromptWithContext = buildSystemPrompt(
          context,
          currentMultiFileState
        );

        // 🛡️ FILTRO API: Rimuove messaggi vuoti dalla history prima di inviare
        const messagesForLLM = [
          { role: "system", content: systemPromptWithContext },
          ...conversationHistory
            .filter((m) => m.role !== "system")
            .filter((m) => m.content && m.content.toString().trim().length > 0),
        ];

        // Chiamata LLM
        const response = await getChatCompletion({
          provider,
          apiKey,
          modelName,
          messages: messagesForLLM,
          stream: false,
          responseSchema,
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

        const jsonString = extractJsonFromMarkdown(rawText);
        if (!jsonString) throw new Error("No valid JSON found in AI response.");

        const sanitizedJson = sanitizeJsonString(jsonString);
        let parsedResponse = JSON.parse(sanitizedJson);
        parsedResponse = normalizeResponse(parsedResponse);

        if (!validateResponseStructure(parsedResponse)) {
          throw new Error(`Invalid action: ${parsedResponse.action}`);
        }

        const {
          action,
          files,
          response_text,
          tool_call,
          plan,
          first_file,
          next_file,
          message,
        } = parsedResponse;

        // === START MULTI-FILE ===
        if (action === "start_multi_file" && plan && first_file) {
          set({
            multiFileTaskState: {
              plan: plan.description,
              allFiles: plan.files_to_modify,
              completedFiles: [],
              remainingFiles: plan.files_to_modify,
            },
          });

          // Fallback content
          const msgContent = message || `📋 Start Task: ${plan.description}`;
          addMessage({
            id: Date.now().toString(),
            role: "assistant",
            content: msgContent,
          });

          try {
            const results = fileStore.applyFileActions(
              [first_file.file],
              first_file.action
            );
            const resultText =
              results.length > 0
                ? results.join("\n")
                : "✅ First file action completed.";
            addMessage({
              id: `${Date.now()}-res`,
              role: "assistant",
              content: resultText,
            });

            const currentPath = first_file.file.path;
            set((state) => ({
              multiFileTaskState: {
                ...state.multiFileTaskState,
                completedFiles: [currentPath],
                remainingFiles: state.multiFileTaskState.remainingFiles.filter(
                  (f) => f !== currentPath
                ),
              },
            }));

            if (get().multiFileTaskState.remainingFiles.length > 0) {
              toolCallCount++;
              continue;
            } else {
              set({ multiFileTaskState: null });
              break;
            }
          } catch (e) {
            addMessage({
              id: Date.now().toString(),
              role: "assistant",
              content: `Error: ${e.message}`,
            });
            set({ multiFileTaskState: null });
            break;
          }
        }

        // === CONTINUE MULTI-FILE ===
        if (action === "continue_multi_file" && next_file) {
          const taskState = get().multiFileTaskState;
          if (!taskState) {
            addMessage({
              id: Date.now().toString(),
              role: "assistant",
              content: "⚠️ No active task state found.",
            });
            break;
          }

          const msgContent =
            message || `Continuing with ${next_file.file.path}...`;
          addMessage({
            id: Date.now().toString(),
            role: "assistant",
            content: msgContent,
          });

          try {
            const results = fileStore.applyFileActions(
              [next_file.file],
              next_file.action
            );
            const resultText =
              results.length > 0 ? results.join("\n") : "✅ Action completed.";
            addMessage({
              id: `${Date.now()}-res`,
              role: "assistant",
              content: resultText,
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
                  (f) => f !== currentPath
                ),
              },
            }));

            if (get().multiFileTaskState.remainingFiles.length > 0) {
              toolCallCount++;
              continue;
            } else {
              addMessage({
                id: Date.now().toString(),
                role: "assistant",
                content: "✅ Multi-file task completed.",
              });
              set({ multiFileTaskState: null });
              break;
            }
          } catch (e) {
            addMessage({
              id: Date.now().toString(),
              role: "assistant",
              content: `Error: ${e.message}`,
            });
            set({ multiFileTaskState: null });
            break;
          }
        }

        // === GESTIONE TOOL CALL (BATCH & SINGLE) ===
        if (action === "tool_call" && tool_call) {
          toolCallCount++;
          const isBatchRead =
            tool_call.function_name === "read_file" &&
            Array.isArray(tool_call.args.paths);

          const logArgs = isBatchRead
            ? `(Batch: ${tool_call.args.paths.length} files)`
            : `(Args: ${JSON.stringify(tool_call.args)})`;

          addMessage({
            id: `${Date.now()}-tool-req`,
            role: "assistant",
            content: `[Executing: ${tool_call.function_name} ${logArgs}]`,
          });

          let toolResult = "";

          try {
            if (isBatchRead) {
              const paths = tool_call.args.paths;
              const results = [];
              for (const path of paths) {
                try {
                  const singleResult = fileStore.executeToolCall({
                    function_name: "read_file",
                    args: { path: path },
                  });
                  const safeContent = singleResult || "(Empty File)";
                  results.push(`--- FILE: ${path} ---\n${safeContent}`);
                } catch (err) {
                  results.push(
                    `--- ERROR READING FILE: ${path} ---\n${err.message}`
                  );
                }
              }
              toolResult = results.join("\n\n");
            } else {
              toolResult = fileStore.executeToolCall(tool_call);
            }
          } catch (e) {
            toolResult = `Error executing tool: ${e.message}`;
          }

          // Fallback Content per evitare stringhe vuote
          if (!toolResult || toolResult.trim() === "") {
            toolResult =
              "[Action executed successfully, but returned no content]";
          }

          addMessage({
            id: `${Date.now()}-tool-res`,
            role: "user",
            content: `[Tool Result]\n${toolResult}`,
          });

          continue; // LOOP
        }

        // === TEXT RESPONSE ===
        if (action === "text_response") {
          const finalContent =
            response_text || parsedResponse.text || "✅ Done.";
          addMessage({
            id: Date.now().toString(),
            role: "assistant",
            content: finalContent,
          });
          break;
        }

        // === VFS ACTIONS (SINGLE) ===
        if (["create_files", "update_files", "delete_files"].includes(action)) {
          // 1. Controllo esistenza array
          if (!files || !Array.isArray(files) || files.length === 0) {
            const errorMsg = `❌ Error: Action '${action}' requires a 'files' array, but it was missing or empty.`;
            addMessage({
              id: `${Date.now()}-err`,
              role: "user",
              content: errorMsg,
            });
            continue;
          }

          // 2. AUTO-CORREZIONE: Controllo integrità Path
          const filesWithMissingPath = files.filter(
            (f) => !f.path || typeof f.path !== "string" || f.path.trim() === ""
          );

          if (filesWithMissingPath.length > 0) {
            console.warn(
              "AI attempted to operate on files without path:",
              filesWithMissingPath
            );
            const errorMsg = `❌ CRITICAL ERROR: You attempted '${action}' without specifying "path".
REQUIRED ACTION: Regenerate JSON providing "path" for all files.`;
            addMessage({
              id: `${Date.now()}-path-err`,
              role: "user",
              content: errorMsg,
            });
            continue; // Forza Retry
          }

          // 3. Esecuzione Sicura
          let results;
          try {
            results = fileStore.applyFileActions(files, action);
          } catch (e) {
            console.error("VFS Execution Error:", e);
            results = [`Error: ${e.message}`];
          }

          const resultText =
            results.length > 0
              ? results.map((r) => `• ${r}`).join("\n")
              : "Files processed successfully.";

          addMessage({
            id: Date.now().toString(),
            role: "assistant",
            content: `✓ Action: ${action}\n\n${resultText}`,
          });
          break;
        }
      }

      if (toolCallCount >= maxToolCalls) {
        addMessage({
          id: Date.now().toString(),
          role: "assistant",
          content: "⚠️ Operation limit reached.",
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
      set({ isStreaming: false });
      await get().saveConversation();
    }
  },
}));
