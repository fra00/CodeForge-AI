# LLMForge AI 🚀

**LLMForge AI** è un ambiente di sviluppo integrato (IDE) basato su browser, potenziato dall'Intelligenza Artificiale. Permette di generare, modificare, testare ed eseguire applicazioni React interamente lato client, senza necessità di un backend Node.js attivo.

Il progetto integra un assistente AI avanzato capace di comprendere il contesto del progetto, eseguire refactoring su più file e gestire un ciclo di vita completo di sviluppo software (pianificazione, esecuzione, testing).

## ✨ Funzionalità Principali

### 🤖 AI Coding Assistant

- **Context-Aware:** L'AI ha accesso alla struttura del progetto e al contenuto dei file.
- **Multi-File Editing:** Capacità di pianificare ed eseguire modifiche complesse su più file simultaneamente.
- **Protocollo Strutturato:** Utilizza un protocollo di comunicazione robusto (basato su tag JSON e blocchi di testo) per garantire modifiche precise al codice.
- **Auto-Debugging:** Rilevamento automatico degli errori di runtime e suggerimento di fix immediati.

### 🛠️ Ambiente di Sviluppo

- **Virtual File System:** Gestione completa di file e cartelle in memoria.
- **Live Preview:** Rendering in tempo reale dell'applicazione React con hot-reloading simulato.
- **Import/Export:** Supporto completo per importare ed esportare progetti tramite archivi ZIP.
- **Responsive UI:** Layout flessibile con pannelli ridimensionabili (Editor, Preview, AI Chat, File Explorer).

### 🧪 In-Browser Testing Framework

Include un **Test Runner personalizzato** (`VitestCompatibleRunner`) che emula l'API di Vitest/Jest:

- Esecuzione dei test direttamente nel browser.
- Supporto per `describe`, `it`, `expect`, `beforeEach`, ecc.
- Matcher completi (es. `toBe`, `toEqual`, `toHaveBeenCalled`, `toBeInTheDocument`).
- Visualizzazione grafica dei risultati dei test.

## 🏗️ Stack Tecnologico

- **Core:** React 18, Vite.
- **State Management:** Zustand (per File System, AI, Settings).
- **Styling:** Tailwind CSS.
- **UI Components:** Lucide React (icone), React Resizable Panels.
- **Testing:** Custom Vitest-compatible runner (Vanilla JS implementation).

## 🚀 Installazione e Avvio

1.  **Clona il repository:**

    ```bash
    git clone https://github.com/tuo-username/llmforge-ai.git
    cd llmforge-ai
    ```

2.  **Installa le dipendenze:**

    ```bash
    npm install
    ```

3.  **Avvia il server di sviluppo:**

    ```bash
    npm run dev
    ```

4.  Apri il browser all'indirizzo `http://localhost:5173`.

## 📂 Struttura del Progetto

- `src/components/`: Componenti UI (Editor, AI Panel, FileSystem, ecc.).
- `src/stores/`: Gestione dello stato globale (Zustand).
  - `useFileStore.js`: Logica del file system virtuale.
  - `useAIStore.js`: Gestione della chat e del contesto AI.
  - `ai/systemPrompt.js`: Definizione delle regole e del comportamento dell'AI.
- `src/testing/`: Motore di testing personalizzato.
  - `VitestCompatibleRunner.js`: Implementazione del runner.
- `src/utils/`: Utility, incluso il parser delle risposte AI (`responseParser.js`).

## 🧠 Come Funziona l'AI

L'AI opera seguendo un **Decision Protocol** rigoroso definito nel `systemPrompt.js`:

1.  **COMPRENDI:** Analizza la richiesta (Spiegazione vs Modifica).
2.  **RECUPERA CONTESTO:** Legge i file necessari tramite `read_file`.
3.  **ESEGUI:** Pianifica le modifiche (`start_multi_file`) e le applica sequenzialmente.
4.  **RISPONDI:** Fornisce feedback all'utente.

Le risposte dell'AI vengono parsate da `responseParser.js` che converte i blocchi di testo strutturati (es. `#[json-data]`) in azioni eseguibili dall'applicazione.

## 📐 Architecture Decisions

### 1. In-Browser Testing vs WebContainers

La scelta di implementare un **Custom Test Runner** (`VitestCompatibleRunner`) invece di utilizzare soluzioni come WebContainers è stata guidata da:

- **Performance:** Boot istantaneo senza dover avviare un container Node.js completo.
- **Semplicità:** Nessun requisito di header di sicurezza complessi (`SharedArrayBuffer`), permettendo il deploy su qualsiasi host statico.
- **Integrazione:** Controllo totale sull'esecuzione e sulla cattura degli errori per l'auto-debugging dell'AI.

### 2. Hybrid AI Protocol

Il sistema utilizza un protocollo ibrido per la comunicazione con l'LLM:

- **JSON Strutturato:** Per azioni critiche (`start_multi_file`, `run_test`) dove la precisione dei dati è fondamentale.
- **Testo Libero:** Per le risposte discorsive, riducendo la fragilità del parsing e il consumo di token.
  Questo approccio ("Sweet Spot") garantisce robustezza operativa senza sacrificare la naturalezza della conversazione.

## 🤝 Contributing

Le Pull Request sono benvenute! Per modifiche importanti, apri prima una issue per discutere cosa vorresti cambiare.

1.  Fork del progetto
2.  Crea il tuo feature branch (`git checkout -b feature/AmazingFeature`)
3.  Commit delle modifiche (`git commit -m 'Add some AmazingFeature'`)
4.  Push al branch (`git push origin feature/AmazingFeature`)
5.  Apri una Pull Request

## 📄 Licenza

Distribuito sotto licenza MIT. Vedi `LICENSE` per maggiori informazioni.
