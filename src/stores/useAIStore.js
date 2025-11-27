// src/stores/useAIStore.js
import { create } from "zustand";
import { getChatCompletion } from "../utils/aiService";
import { getAll, put, clear, remove } from "../utils/indexedDB";
import { useFileStore } from "./useFileStore";
import { extractAndSanitizeJson } from "../utils/extractAndSanitizeJson";

const CONVERSATIONS_STORE_NAME = "aiConversations";

const MAX_AUTO_FIX_ATTEMPTS = 3;

const SYSTEM_PROMPT = `You are Code Assistant, a highly skilled software engineer AI assistant. 
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
      "Hello! I am Code Assistant, your AI software engineer assistant. How can I help you with your code today?",
  },
];

/**
 * Valida la struttura della risposta
 */
const validateResponseStructure = (response) => {
  if (!response || typeof response !== "object") return false;
  const validActions = [
    "create_file",
    "update_file",
    "delete_file",
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
# 🏛️ PRINCIPIO GUIDA FONDAMENTALE: Problem-Solving

Il tuo unico scopo è risolvere il problema dell'utente. Per farlo, segui questi passi MENTALI prima di ogni azione:

1.  **COMPRENDI**: Qual è il vero obiettivo dell'utente? Sta chiedendo un'analisi, una modifica, una spiegazione o una creazione?
2.  **SCOMPONI**: Se il compito è complesso, quali sono i sotto-problemi? (es. "Prima devo leggere il file A, poi modificare il file B").
3.  **AGISCI**: Scegli l'azione più diretta ed efficiente dalla sezione # 📘 AZIONI DISPONIBILI per risolvere il primo sotto-problema. 
    Se la richiesta è una semplice domanda, l'azione più diretta è quasi sempre 'text_response'.

---
# 🧠 DECISION PROTOCOL (Follow strictly)

1. **ANALYSIS PHASE**
   - Ask: "Do I have all the file contents required to answer/code?"
   - IF NO -> Use tool 'read_file' (use 'paths' array for multiple files).
   - IF YES -> Proceed to Execution.

2. **EXECUTION PHASE**
   - Ask: "Does this task involve modifying ONE file or MULTIPLE files?"
   
   - **CASE A: Single File**
     Action: Use 'update_file' (or create/delete).
     Result: Task done immediately.

   - **CASE B: Multiple Files (Refactoring/Global Changes)**
     Action: Use 'start_multi_file'.
     Requirement: define 'plan' AND generate code for the 'first_file'.
     Note: The system will automatically prompt you for the next files.

3. **TEXT RESPONSE**
   - Only use 'text_response' if no code changes or file reads are needed.

# ⚙️ AUTO-DEBUGGING PROTOCOL
After you perform a file modification, the system will automatically execute the code.
If a runtime error occurs, you will receive a new message starting with "[SYSTEM-ERROR]".
When you see this message, your ONLY task is to analyze the error and the related code to provide a fix.
Do not ask for confirmation, just provide the corrected code using the 'update_file' action.
Example system error message: "[SYSTEM-ERROR] The last action caused a runtime error: ReferenceError: 'myVar' is not defined. Please fix it."

---
# ⚠️ REGOLE CRITICHE (GOLDEN RULES)
1. **IL PATH È OBBLIGATORIO**: Ogni singolo oggetto dentro 'files' o 'file' DEVE avere una proprietà "path" valida (es. "src/components/Button.jsx").
2. **BATCH READING**: Se devi leggere più file (es. per analisi), usa "paths": [...] (array) in una singola chiamata read_file.
3. OGNI RISPOSTA DEVE ESSERE UN **SOLO** OGGETTO **JSON VALIDO**.
4. OGNI RISPOSTA DEVE AVERE UNA SOLA **ACTION**.
---

# 📋 FORMATO DELLA RISPOSTA JSON
## 🔴 CONTRATTO DI SERIALIZZAZIONE JSON (PUNTO DI FALLIMENTO CRITICO)

**LA STRUTTURA DEL JSON DEVE ESSERE COMPATTATA AL 100%. L'OUTPUT È RICEVUTO DA UN PARSER AUTOMATICO E NON TOLLERA GLI ERRORI DI SERIALIZZAZIONE.**

**🚫 JSON STRUCTURAL NEWLINE FORBIDDEN 🚫**
È **ASSOLUTAMENTE VIETATO** usare caratteri di newline (\`\\n\` o \`\\r\`) o tabulazioni tra gli elementi 
sintattici del JSON: chiavi, due punti (\`:\`), virgole (\`,\`) o graffe (\`{}\`).

| AZIONE | ESEMPIO SCORRETTO (VIETATO) | ESEMPIO CORRETTO (OBBLIGATORIO) |
| :--- | :--- | :--- |
| **Separazione Chiave/Valore** | \`"key":\n "value"\` | \`"key":"value"\` |
| **Separazione Elementi** | \`"v1",\n "v2"\` | \`"v1","v2"\` |
| **Formattazione Strutturale** | \`{\n "action": ...}\` | \`{"action":...}\` |

**LA VIOLAZIONE DI QUESTA REGOLA COMPORTA UN ERRORE DI PARSING NON RECUPERABILE. 
GARANTISCI CHE L'INTERO JSON SIA SU UNA SINGOLA RIGA LOGICA PRIMA DI INVIARLO.**

## JSON e file content:
Il JSON DEVE essere seguito da un separatore speciale \`# [content-file]:\` 
per indicare l'inizio del contenuto del file (se applicabile).
\`\`\`json
{ ... JSON OBJECT ... }
# [content-file]:
export default function Component() { return <div>Hello</div>; }

\`\`\`

# 📘 AZIONI DISPONIBILI

## 1. Risposta Solo Testuale
Usa 'text_response' per dare risposte solo testuali o esplicative.
**NON USARE text_response con tool_call.**

\`\`\`json
{"action":"text_response",
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
Usa 'create_file', 'update_file', 'delete_file' per operazioni immediate.
Attenzion il path "path" è obbligatorio.

### A. Create / Update (Scrittura)
Richiede "content". Se aggiorni un file, fornisci il contenuto COMPLETO.
L'azione gestisce UN SOLO file alla volta, usa l'oggetto 'file'.
\`\`\`
{
  "action": "update_file",
  "file": {
    "path": "src/components/Header.jsx"
  }
}
# [content-file]: 
export default function Header() { return <div>Logo</div>; }
\`\`\`

*(Nota: "create_file" usa la stessa identica struttura)*

### B. Delete (Cancellazione)
Richiede solo "path" nell'oggetto 'file'.
\`\`\`json
{
  "action": "delete_file",
  "file": { "path": "src/unused/legacy.js" }
}
\`\`\`

## 4. Multi-File Task (Modifiche Complesse)
Usa 'start_multi_file' e 'continue_multi_file' per refactoring che toccano molti file in sequenza.

1. Ottieni la lista completa dei file
2. **ANALYZE**: Identifica tutti i file che hanno bisogno di essere modificati o creati.
2. **ORDER**: Ordinali logicamente (dependencies first).
3. **EXECUTE**:
   - Usa 'start_multi_file' action.
   - Definisci il 'plan' (plan.decription field) con una descrizione 
   - Definisci un array di 'files' che sono i file da modificare o creare (plan.files_to_modify field).  
   - IMMEDIATELY genera il codice per FIRST file in the 'first_file' field.

#### JSON Template for STARTING a task:
Richiede "content".
\`\`\`json
{
  "action": "start_multi_file",
  "plan": {
    "description": "Short description of the goal",
    "files_to_modify": ["src/utils/api.js", "src/App.jsx", "src/components/Login.jsx"]
  },
  "first_file": {
    "action": "[create_file|update_file]", 
    "file": { 
      "path": "src/utils/api.js", 
    }
  },
  "message": "Starting refactor: Updating API utility first."
}
# [content-file]:
export const newApi = ...
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
Richiede "content".
\`\`\`json
{
  "action": "continue_multi_file",
  "next_file": {
    "action": "[create_file|update_file]",
    "file": { 
      "path": "PATH_OF_NEXT_FILE", 
    }
  },
  "message": "Now updating [File Name]..."  
}
# [content-file]:
export const newApi = ...
\`\`\`

## AUTO VERIFICA:
- La risposta contiene un oggetto JSON valido?
- Il JSON è sintatticamente valido (tutte le parentesi aperte sono chiuse)?
- Ogni file ha un "path" valido?

Se una delle verifiche fallisce, NON inviare la risposta. RIPETI l'intera risposta JSON, compattata e corretta, prima di procedere.
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
        "create_file",
        "update_file",
        "delete_file",
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
    file: {
      type: "object",
      properties: {
        path: { type: "string" },
        content: { type: "string" },
      },
      required: ["path"],
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
  autoFixAttempts: 0,

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
    await new Promise((resolve) => setTimeout(resolve, 1500));

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
   * Gestisce la logica per le azioni sul VFS (create, update, delete).
   * @returns {Promise<boolean>} True se il loop deve continuare (per auto-debug).
   * @private
   */
  _handleVFSAction: async (action, file) => {
    const { addMessage } = get();
    const fileStore = useFileStore.getState();

    // Validazione
    if (!file || typeof file !== "object") {
      addMessage({
        id: `${Date.now()}-err`,
        role: "user",
        content: `❌ Error: Action '${action}' requires a 'file' object.`,
      });
      return true; // Forza Retry immediato
    }
    if (
      !file.path ||
      typeof file.path !== "string" ||
      file.path.trim() === ""
    ) {
      addMessage({
        id: `${Date.now()}-path-err`,
        role: "user",
        content: `❌ CRITICAL ERROR: You attempted '${action}' without specifying "path".`,
      });
      return true; // Forza Retry immediato
    }

    let results;
    try {
      results = fileStore.applyFileActions([file], action);
    } catch (e) {
      results = [`Error: ${e.message}`];
    }

    const resultText =
      results.length > 0
        ? results.map((r) => `• ${r}`).join("\n")
        : "Files processed successfully.";
    addMessage({
      id: `${Date.now()}-vfs-status`,
      role: "status", // Ruolo di stato per non inquinare la cronologia AI
      content: `Action: ${action}\n${resultText}`,
    });

    return await get()._checkForRuntimeErrors();
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
      role: "status", // Ruolo speciale per messaggi di stato, non inviati all'AI
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
      role: "status", // Ruolo di stato per non inquinare la cronologia AI
      content: message || `Start Task: ${plan.description}`,
    });

    try {
      const results = fileStore.applyFileActions(
        [first_file.file],
        first_file.action
      );
      addMessage({
        id: `${Date.now()}-res`,
        role: "status", // Ruolo di stato per non inquinare la cronologia AI
        content: results.join("\n") || "First file action completed.",
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

      return await get()._checkForRuntimeErrors();
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
      role: "status", // Ruolo di stato per non inquinare la cronologia AI
      content: message || `Continuing with ${next_file.file.path}...`,
    });

    try {
      const results = fileStore.applyFileActions(
        [next_file.file],
        next_file.action
      );
      addMessage({
        id: `${Date.now()}-res`,
        role: "status", // Ruolo di stato per non inquinare la cronologia AI
        content: results.join("\n") || "Action completed.",
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

      return await get()._checkForRuntimeErrors();
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

    if (action === "text_response") {
      return await get()._handleTextResponse(text_response);
    }
    if (["create_file", "update_file", "delete_file"].includes(action)) {
      return await get()._handleVFSAction(action, file);
    }
    if (action === "tool_call" && tool_call) {
      return await get()._handleToolCall(tool_call);
    }
    if (action === "start_multi_file" && plan && first_file) {
      return await get()._handleStartMultiFile(plan, first_file, message);
    }
    if (action === "continue_multi_file" && next_file) {
      return await get()._handleContinueMultiFile(next_file, message);
    }

    // Se nessuna azione corrisponde, interrompi per sicurezza
    console.warn("Unhandled action type:", action);
    return Promise.resolve(false);
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
          currentMultiFileState
        );

        // 🛡️ FILTRO API: Rimuove messaggi vuoti dalla history prima di inviare
        const messagesForLLM = [
          { role: "system", content: systemPromptWithContext },
          ...conversationHistory
            // 🛡️ FILTRO API: Rimuove messaggi di sistema e di stato
            .filter((m) => m.role !== "system" && m.role !== "status")
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

        if (!validateResponseStructure(jsonObject)) {
          throw new Error(`Invalid action: ${jsonObject.action}`);
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
