// src/stores/useAIStore.js
import { create } from "zustand";
import { getChatCompletion } from "../utils/aiService";
import { getAll, put, clear, remove } from "../utils/indexedDB";
import { useFileStore } from "./useFileStore";
import { extractAndSanitizeJson } from "../utils/extractAndSanitizeJson";

const CONVERSATIONS_STORE_NAME = "aiConversations";

const SYSTEM_PROMPT = `You are Kilo Code, a highly skilled software engineer AI assistant. 
Your primary function is to assist the user with code-related tasks, such as explaining code, refactoring, generating new code, 
or debugging.

When providing code, always use markdown code blocks.
Be concise, professional, and extremely helpful.
The user is working in a web-based code editor environment.

ALL reply are in JSON format as specified below. DO NOT include any text outside the JSON object.`;

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
});

/**
 * Costruisce il System Prompt Dinamico con regole rafforzate
 */
const buildSystemPrompt = (context, multiFileTaskState) => {
  let prompt = `${SYSTEM_PROMPT}
---
### 🧠 DECISION PROTOCOL (Follow strictly)

1. **ANALYSIS PHASE**
   - Ask: "Do I have all the file contents required to answer/code?"
   - IF NO -> Use tool 'read_file' (use 'paths' array for multiple files).
   - IF YES -> Proceed to Execution.

2. **EXECUTION PHASE**
   - Ask: "Does this task involve modifying ONE file or MULTIPLE files?"
   
   - **CASE A: Single File**
     Action: Use 'update_files' (or create/delete).
     Result: Task done immediately.

   - **CASE B: Multiple Files (Refactoring/Global Changes)**
     Action: Use 'start_multi_file'.
     Requirement: define 'plan' AND generate code for the 'first_file'.
     Note: The system will automatically prompt you for the next files.

3. **TEXT RESPONSE**
   - Only use 'text_response' if no code changes or file reads are needed.
---
# ⚠️ REGOLE CRITICHE PER I FILE (GOLDEN RULES)
1. **IL PATH È OBBLIGATORIO**: Ogni singolo oggetto dentro 'files' o 'file' DEVE avere una proprietà "path" valida (es. "src/components/Button.jsx").
2. **BATCH READING**: Se devi leggere più file (es. per analisi), usa "paths": [...] (array) in una singola chiamata read_file.
3. **JSON PURO**: Scrivi testo o spiegazioni **SOLO** dentro il JSON object.
4. OGNI RISPOSTA DEVE ESSERE UN **SOLO** OGGETTO **JSON VALIDO**.
5. OGNI RISPOSTA DEVE AVERE UNA SOLA **ACTION**.
6. **ESCAPE DELLE STRINGHE JSON**: All'interno di qualsiasi valore "stringa" nel JSON (come in "content"), i caratteri speciali DEVONO essere sempre escapati."}
7. EVITA {\n"action":"[stringa]"} , usa invece {"action":"[stringa]"} 
---

# Istruzioni per l'Output Strutturato (JSON)
⚠️ ATTENZIONE: Ogni risposta in formato diverso da JSON è da considerare errata.
 
## 1. Risposta Solo Testuale
Usa 'text_response' per dare risposte solo testuali o esplicative.
**NON mescolare text_response con tool_call.**

\`\`\`json
{
"action":"text_response"
"text_response" : "Spiegazione dettagliata..."
}
\`\`\`

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
### A. Create / Update (Scrittura)
Richiede "content". Se aggiorni un file, fornisci il contenuto COMPLETO.
\`\`\`json
{
  "action": "update_files",
  "files": [
    {
      "path": "src/components/Header.jsx",
      "content": "export default function Header() { return <div>Logo</div>; }"
    }
  ]
}
\`\`\`
*(Nota: puoi usare "create_files" con la stessa identica struttura)*

### B. Delete (Cancellazione)
Richiede solo "path".
\`\`\`json
{
  "action": "delete_files",
  "files": [
    { "path": "src/unused/legacy.js" }
  ]
}
\`\`\`

## 4. Multi-File Task (Modifiche Complesse)
Usa 'start_multi_file' e 'continue_multi_file' per refactoring che toccano molti file in sequenza.

1. Ottieni la lista completa dei file
2. **ANALYZE**: Identifica tutti i file che hanno bisogno di essere modificati o creati.
2. **ORDER**: Ordinali logicamente (dependencies first).
3. **EXECUTE**:
   - Usa 'start_multi_file' action.
   - Definisci il 'plan' con una descrizione e un array di 'files' che sono i file da modificare o creare.  
   - IMMEDIATELY genera il codice per FIRST file in the 'first_file' field.

#### JSON Template for STARTING a task:
\`\`\`json
{
  "action": "start_multi_file",
  "plan": {
    "description": "Short description of the goal",
    "files_to_modify": ["src/utils/api.js", "src/App.jsx", "src/components/Login.jsx"]
  },
  "first_file": {
    "action": "[create_files|update_files]", 
    "file": { 
      "path": "src/utils/api.js", 
      "content": "export const newApi = ..." 
    }
  },
  "message": "Starting refactor: Updating API utility first."
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

\`\`\`json
{
  "action": "continue_multi_file",
  "next_file": {
    "action": "[create_files|update_files]",
    "file": { 
      "path": "TARGET_FILE_PATH_HERE", 
      "content": "FULL_UPDATED_CONTENT_HERE" 
    }
  },
  "message": "{
                \"action\":\"text_response\"
                \"text_response\" : \"Now updating [File Name]...\"
              }"  
}
\`\`\`

## AUTO VERIFICA:
- La tua risposta è SOLO un oggetto JSON valido?
- Ogni file ha un "path" valido?

se non hai rispettato una di queste regole, correggi la tua risposta
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
    text_response: { type: "string" },
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

      set({ isStreaming: true, error: null });
      const responseSchema = getResponseSchema();

      const startFilePath = context.currentFile;

      while (toolCallCount < maxToolCalls) {
        // 🛑 LOGICA SEMPLIFICATA
        if (startFilePath && startFilePath !== "none") {
          // Cerchiamo il file originale nello store aggiornato
          const freshFile = Array(useFileStore.getState().files).find(
            (f) => normalizePath(f.path) === normalizePath(startFilePath)
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

        const jsonString = extractAndSanitizeJson(rawText);
        if (!jsonString) {
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
          jsonObject = JSON.parse(jsonString);
        } catch (e) {
          console.error("JSON Parse Error:", e, "Raw JSON String:", jsonString);
        }
        jsonObject = normalizeResponse(jsonObject);

        console.log("Parsed AI Response JSON:", jsonObject);

        if (!validateResponseStructure(jsonObject)) {
          throw new Error(`Invalid action: ${jsonObject.action}`);
        }

        const {
          action,
          files,
          text_response,
          tool_call,
          plan,
          first_file,
          next_file,
          message,
        } = jsonObject;

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
                  (f) => normalizePath(f) !== normalizePath(currentPath)
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
                  (f) => normalizePath(f) !== normalizePath(currentPath)
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
          const finalContent = text_response || jsonObject.text || "✅ Done.";
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
