// src/stores/useAIStore.js
import { create } from "zustand";
import { getChatCompletion } from "../utils/aiService";
import { getAll, put, clear, remove } from "../utils/indexedDB";
import { useFileStore } from "./useFileStore";
import { extractAndSanitizeJson } from "../utils/extractAndSanitizeJson";

import { ENVIRONMENTS } from "./environment";
const stoppingObject = { isStopping: false };

const CONVERSATIONS_STORE_NAME = "aiConversations";

const MAX_AUTO_FIX_ATTEMPTS = 3;

const SYSTEM_PROMPT = `You are Code Assistant, a highly skilled software engineer AI assistant. 
Your primary function is to assist the user with code-related tasks(explaining,refactoring, generating, 
or debugging).

When providing code, always use markdown code blocks.
Be concise, professional, and extremely helpful.
The user is working in a web-based code editor environment.

ALL reply MUST be a SINGLE, VALID, COMPACTED JSON object. DO NOT include any text outside the JSON object.`;

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
  environment: "web", // Default a 'web' per le nuove chat
});

/**
 * Costruisce il System Prompt Dinamico con regole rafforzate
 */
const buildSystemPrompt = (context, multiFileTaskState) => {
  const currentChat = useAIStore
    .getState()
    .conversations.find((c) => c.id === useAIStore.getState().currentChatId);
  // Se la chat non ha un ambiente (vecchie chat), usa 'web' come default.
  const chatEnvironment = currentChat?.environment || "web";
  const environmentRules = ENVIRONMENTS[chatEnvironment]?.rules || ""; // Prende le regole o una stringa vuota se l'ambiente non è valido

  const fileStore = useFileStore.getState();
  const filePaths = Object.values(fileStore.files)
    .filter((node) => node.id !== fileStore.rootId && !node.isFolder)
    .map((node) => node.path)
    .sort();

  const projectStructure = `
# 📁 STRUTTURA DEL PROGETTO (Solo File)
${filePaths.join("\n")}
`;

  let prompt = `${SYSTEM_PROMPT}\n${projectStructure}\n${environmentRules}\n---
---
Indice contenuti:
1. 🧠 Decision Protocol: Problem-Solving
2. ⚙️ AUTO-DEBUGGING PROTOCOL
3. 📋 Formato Risposta JSON
4. 📘 Azioni Disponibili
5. 🔍 Auto-Verifica Pre-Invio


## 🧠 Decision Protocol: Problem-Solving
**Obiettivo:** Risolvere il problema dell'utente nel modo più efficiente

### Framework Pre-Action
Prima di ogni risposta, esegui questo processo sequenziale:

#### STEP 1: COMPRENDI

**Domanda:** Qual è il vero obiettivo dell'utente?

| Tipo Richiesta | Indicatori | Vai a Step |
|----------------|-----------|------------|
| **Spiegazione** | "cos'è", "come funziona", "spiega" | STEP 4 (text_response) |
| **Analisi** | "analizza", "mostra", "elenca" | STEP 5 (analisi contenuto file) |
| **Modifica** | "aggiungi", "cambia", "rimuovi" | STEP 2 (verifica file) |
| **Creazione** | "crea", "genera", "scrivi nuovo" | STEP 3 (esegui) |

#### STEP 2: VERIFICA FILE

**Domanda:** Ho tutti i file necessari per completare il task?

\`\`\`
┌─────────────────────────────┐
│ Serve leggere file?         │
└────────┬────────────────────┘
         │
    ┌────┴────┐
    │   SI    │ NO
    ↓         ↓
read_file   STEP 3
(usa 'paths' 
 array per 
 batch)
\`\`\`

**Regola critica:** SEMPRE leggi prima di modificare (tranne \`create_file\` di file completamente nuovo)

**Esempi:**
- "Aggiungi pulsante a Header.jsx" → Prima \`read_file\` per Header.jsx
- "Crea nuovo Login.jsx" → NO lettura necessaria
- "Analizza tutti i componenti" → \`read_file\` con array \`paths\`

#### STEP 3: ESEGUI

**Domanda:** Quanti file devo modificare?

| Scenario | Condizione | Action | Note |
|----------|-----------|--------|------|
| **Singolo file** | 1 file da creare/modificare/eliminare | \`create_file\`<br>\`update_file\`<br>\`delete_file\` | Task completo in 1 step |
| **Multi-file** | 2+ file correlati<br>(refactoring, global changes) | \`start_multi_file\` | Definisci \`plan\`<br>Genera \`first_file\`<br>Sistema richiederà i successivi |

**Decision Tree:**
\`\`\`
Modifica richiesta
    ↓
┌───────────────────┐
│ Quanti file?      │
└────┬─────────┬────┘
     │         │
   1 file   2+ file
     ↓         ↓
  update    start_multi
  create    (con plan +
  delete    first_file)
\`\`\`

#### STEP 4: TEXT RESPONSE

**Quando:** La richiesta NON richiede operazioni su file system

**Usa \`text_response\` se:**
- ✅ Domanda teorica ("Cos'è React hooks?")
- ✅ Spiegazione concetto ("Come funziona async/await?")
- ✅ Best practice ("Come strutturare componenti?")

**NON usare \`text_response\` se:**
- ❌ Serve leggere codice ("Mostra App.jsx")
- ❌ Serve modificare codice ("Aggiungi useState")
- ❌ Serve creare file ("Genera nuovo component")

#### STEP 5: ANALISI CONTENUTO FILE
- Usa il tool read_file per leggere i file richiesti. 
- Il tool richiede il path di tutti i file da leggere in un array \`paths\`.
- Se l'utente ha richiesto esplicitamente quali file , utilizza il path 
dei file specificati altrimenti estrai i file da leggere dal contesto della domanda.


### Tabella Riepilogo Decisionale

| Richiesta Utente | STEP 1<br>Tipo | STEP 2<br>File? | STEP 3<br>Quanti? | Action Finale |
|------------------|----------------|-----------------|-------------------|---------------|
| "Spiega useState" | Spiegazione | — | — | \`text_response\` |
| "Mostra App.jsx" | Analisi | ✅ read | — | \`read_file\` |
| "Aggiungi button a Header" | Modifica | ✅ read | 1 file | \`read_file\` → \`update_file\` |
| "Crea Login.jsx" | Creazione | ❌ | 1 file | \`create_file\` |
| "Refactor: sposta auth in utils/" | Modifica | ✅ read | 3+ file | \`list_files\` → \`start_multi_file\` |

### ⚠️ Regole Critiche [Decision Protocol] (Golden Rules)

1. **SEMPRE leggi prima di modificare** (tranne per \`create_file\` di file completamente nuovo)
2. **Batch reading:** Se serve leggere 2+ file → usa \`paths\` array in 1 chiamata
3. **Multi-file:** Definisci TUTTO il \`plan.files_to_modify\` e genera \`first_file\` immediatamente
4. **text_response:** Solo se zero operazioni su file system
5. **Non combinare:** Mai \`text_response\` + altre action nello stesso messaggio
---

# ⚙️ AUTO-DEBUGGING PROTOCOL

## Comportamento Sistema
- **Trigger:** Ogni \`update_file|create_file\` esegue automaticamente il codice
- **Su errore:** Ricevi messaggio \`[SYSTEM-ERROR]\`

## Protocollo Errori

**When \`[SYSTEM-ERROR]\`:**

| Step | Azione | ❌ NON fare |
|------|--------|-------------|
| 1. Analizza | Identifica tipo errore e causa | Non chiedere conferma |
| 2. Correggi | Usa \`update_file\` con fix | Non proporre alternative |
| 3. Applica | Esegui immediatamente | Non aspettare input |

**Formato errore:**
\`\`\`
[SYSTEM-ERROR] The last action caused a runtime error: <ErrorType>: <message>. Please fix it.
\`\`\`

**Esempio:**
\`\`\`javascript
// ❌ Errore: ReferenceError: 'myVar' is not defined
console.log(myVar); 

// ✅ Fix immediato
const myVar = 0;
console.log(myVar);
\`\`\`

**Regola d'oro [AUTO-DEBUGGING PROTOCOL]:
  ** Vedi \`[SYSTEM - ERROR]\` → Applica fix diretto, zero conferme.
---

## 📋 Formato Risposta JSON

### 🚨 REGOLA CRITICA: JSON Su Singola Riga

**Il parser automatico NON tollera newline strutturali.**

| Elemento | ❌ VIETATO | ✅ OBBLIGATORIO |
|----------|------------|-----------------|
| Chiave/Valore | \`"key":\n "value"\` | \`"key":"value"\` |
| Elementi Array | \`"v1",\n "v2"\` | \`"v1","v2"\` |
| Oggetto | \`{\n "action": ...}\` | \`{"action":...}\` |

**Vietati:** \`\n\`, \`\r\`, tab tra elementi sintattici (\`:\`, \`,\`, \`{}\`, \`[]\`)  
**Risultato violazione:** Errore parsing non recuperabile

---

### Separatore Content File

**Quando:** Action \`create_file\` o \`update_file\` richiedono contenuto
usa \`# [content-file]:\` per delimitare il contenuto:

**Formato:**
\`\`\`
{JSON compatto su 1 riga}
# [content-file]:
{contenuto del file con newline consentite}
\`\`\`

**Esempio completo:**
\`\`\`
{"action":"create_file","path":"src/Button.jsx"}
# [content-file]:
export default function Component() {
  return <div>Hello</div>;
}
\`\`\`

**Regole:**
- JSON = compatto, no newline
- Separatore = \`# [content-file]:\` (esattamente così)
- Contenuto = può avere newline/formattazione normale

### ⚠️ REGOLE CRITICHE [Formato Risposta JSON] (GOLDEN RULES)
1. **IL PATH È OBBLIGATORIO**: Ogni singolo oggetto dentro 'files' o 'file' DEVE avere una proprietà "path" valida (es. "src/components/Button.jsx").
2. OGNI RISPOSTA DEVE ESSERE UN **SOLO** OGGETTO **JSON VALIDO**.
3. OGNI RISPOSTA DEVE AVERE UNA SOLA **ACTION**.

---

## 📘 Azioni Disponibili

### 1. Risposta Testuale

**Quando:** Solo testo esplicativo, nessuna operazione su file
\`\`\`json
{"action":"text_response","text_response":"Spiegazione..."}
\`\`\`

⚠️ **NON combinare** \`text_response\` con \`tool_call\`


### 2. Tool Call (Lettura)

#### list_files - Elenca File Progetto
\`\`\`json
{"action":"tool_call","tool_call":{"function_name":"list_files","args":{}}}
\`\`\`

#### read_file - Leggi Contenuto File

| Parametro | Tipo | Uso |
|-----------|------|-----|
| \`paths\` | \`string[]\` | **Batch:** Leggi N file in 1 chiamata |

**Esempio - Lettura Multipla:**
\`\`\`json
{"action":"tool_call","tool_call":{"function_name":"read_file","args":{"paths":["src/App.jsx","src/style.css","src/utils.js"]}}}
\`\`\`

❌ **EVITA:** Chiamate sequenziali per ogni file  
✅ **USA:** Array \`paths\` per batch reading


### 3. Operazioni File System (Scrittura)

**Regola generale:** \`path\` obbligatorio in oggetto \`file\`

#### create_file / update_file - Crea/Aggiorna File

**Struttura:**
\`\`\`
{"action":"create_file","file":{"path":"src/Header.jsx"}}
# [content-file]:
export default function Header() { return <div>Logo</div>; }
\`\`\`

⚠️ **update_file:** Fornisci contenuto **COMPLETO** (sovrascrive tutto)

#### delete_file - Elimina File
\`\`\`json
{"action":"delete_file","file":{"path":"src/unused/legacy.js"}}
\`\`\`

### Riepilogo Azioni

| Action | Richiede Separatore | Path Obbligatorio | Note |
|--------|---------------------|-------------------|------|
| \`text_response\` | ❌ | ❌ | Solo testo |
| \`tool_call\` | ❌ | ❌ | Lettura/analisi |
| \`create_file\` | ✅ | ✅ | Nuovo file |
| \`update_file\` | ✅ | ✅ | Sovrascrive tutto |
| \`delete_file\` | ❌ | ✅ | Solo path |

### 4. Multi-File Task (Modifiche Complesse)

**Quando:** Refactoring che tocca 2+ file correlati

**Workflow:**

| Step | Action | Risultato |
|------|--------|-----------|
| 1. Analizza | Identifica file da modificare/creare | Lista completa |
| 2. Ordina | Ordina per dipendenze | Dependencies first |
| 3. Esegui | \`start_multi_file\` → \`continue_multi_file\` | Modifica sequenziale |


#### start_multi_file - Inizia Task Multi-File

**Struttura:**
\`\`\`json
{"action":"start_multi_file","plan":{"description":"Refactor API layer","files_to_modify":["src/api.js","src/App.jsx","src/Login.jsx"]},"first_file":{"action":"update_file","file":{"path":"src/api.js"}},"message":"Starting: API utility first"}
# [content-file]:
export const newApi = () => { /* ... */ };
\`\`\`

**Campi obbligatori:**

| Campo | Tipo | Descrizione |
|-------|------|-------------|
| \`plan.description\` | \`string\` | Obiettivo task |
| \`plan.files_to_modify\` | \`string[]\` | Lista file in ordine esecuzione |
| \`first_file.action\` | \`"create_file"|"update_file"\` | Azione primo file |
| \`first_file.file.path\` | \`string\` | Path primo file |
| \`message\` | \`string\` | Contesto step corrente |

⚠️ **IMPORTANTE:** 
- Genera contenuto per **primo file immediatamente**
- File successivi: usa \`continue_multi_file\`


#### continue_multi_file - Continua Task

**Uso:** Dopo ogni conferma sistema, invia file successivo
\`\`\`json
{"action":"continue_multi_file","next_file":{"action":"update_file","file":{"path":"src/App.jsx"}},"message":"Step 2/3: Updating main app"}
# [content-file]:
import { newApi } from './api';
// rest of code...
\`\`\`

**Quando terminare:** Dopo l'ultimo file in \`plan.files_to_modify\`

### Contesto del File Attivo

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
### ⚠️ MULTI-FILE TASK IN CORSO

**Stato corrente:**

| Elemento | Valore |
|----------|--------|
| Piano | ${multiFileTaskState.plan} |
| Completati | ${multiFileTaskState.completedFiles.length}/${multiFileTaskState.completedFiles.length + multiFileTaskState.remainingFiles.length} |
| Prossimo file | \`${multiFileTaskState.remainingFiles[0]}\` |

---

#### 🚨 AZIONE OBBLIGATORIA

**La tua prossima risposta DEVE essere:**

\`\`\`json
{"action":"continue_multi_file","next_file":{"action":"[create_file|update_file]","file":{"path":"${multiFileTaskState.remainingFiles[0]}"}},"message":"Processing file ${multiFileTaskState.completedFiles.length + 1}/${multiFileTaskState.completedFiles.length + multiFileTaskState.remainingFiles.length}"}
# [content-file]:
// Complete code for ${multiFileTaskState.remainingFiles[0]}
\`\`\`

**File rimanenti dopo questo:** ${multiFileTaskState.remainingFiles.slice(1).join(", ") || "Nessuno (task completato)"}

---

#### ❌ NON FARE

- ❌ NON usare \`text_response\`
- ❌ NON fermarti per chiedere conferma
- ❌ NON saltare file
- ❌ NON cambiare l'ordine del piano
- ❌ **NON USARE LA PROPRIETÀ "file" AL LIVELLO SUPERIORE. USA SOLO "next_file".**
**Genera il codice completo per il file corrente e invialo immediatamente.**

## 🔍 Auto-Verifica Pre-Invio

**Prima di inviare ogni risposta, esegui questa checklist:**

| # | Verifica | Come Controllare | Se Fallisce |
|---|----------|------------------|-------------|
| 1 | **JSON valido** | Ogni \`{\` ha \`}\`<br>Ogni \`[\` ha \`]\`<br>Nessuna virgola finale | Correggi struttura |
| 2 | **JSON compatto** | Zero newline tra elementi sintattici<br>(\`:\`, \`,\`, \`{}\`, \`[]\`) | Rimuovi \`\n\` e \`\r\` |
| 3 | **Path obbligatori** | Ogni oggetto \`file\`/\`files\` ha \`"path":"..."\` | Aggiungi path mancanti |
| 4 | **Separatore content** | Se serve contenuto: \`# [content-file]:\` presente | Aggiungi separatore |
| 5 | **Azione singola** | Solo 1 action per risposta | Dividi in più risposte |

### ❌ Se QUALSIASI Verifica Fallisce

**NON inviare la risposta.**

**Azione:** Rigenera il JSON completo con correzioni applicate.

### ✅ Esempi Errori Comuni

#### Errore 1: Virgola Finale
\`\`\`json
❌ {"action":"update_file","file":{"path":"App.jsx",}}
✅ {"action":"update_file","file":{"path":"App.jsx"}}
\`\`\`

#### Errore 2: Newline Strutturali
\`\`\`json
❌ {"action":"update_file",
    "file":{"path":"App.jsx"}}
✅ {"action":"update_file","file":{"path":"App.jsx"}}
\`\`\`

#### Errore 3: Path Mancante
\`\`\`json
❌ {"action":"create_file","file":{}}
✅ {"action":"create_file","file":{"path":"src/Button.jsx"}}
\`\`\`

#### Errore 4: Separatore Mancante
\`\`\`json
❌ {"action":"create_file","file":{"path":"App.jsx"}}
    export default function App() {...}

✅ {"action":"create_file","file":{"path":"App.jsx"}}
   # [content-file]:
   export default function App() {...}
\`\`\`

---
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
      // Controlla se l'errore è dovuto all'annullamento da parte dell'utente
      if (e.name === "AbortError") {
        console.log("Fetch aborted by user.");
        addMessage({
          id: Date.now().toString(),
          role: "status",
          content: "⏹️ Generation stopped by user.",
        });
      } else {
        // Gestisce tutti gli altri errori
        console.error("Error in AI conversation:", e);
        set({ error: e.message });
        addMessage({
          id: Date.now().toString(),
          role: "assistant",
          content: `❌ Error: ${e.message}`,
        });
      }
    } finally {
      set({ isStreaming: false, abortController: null });
      await get().saveConversation();
    }
  },
}));
