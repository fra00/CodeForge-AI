# AI-Powered Web IDE

Questo progetto è un ambiente di sviluppo web (IDE) sperimentale che integra un assistente AI avanzato. A differenza dei tradizionali chatbot, l'AI in questo ambiente può comprendere le richieste, analizzare il codice esistente e **agire direttamente sul file system del progetto** per creare, modificare ed eliminare file.

L'assistente è progettato per funzionare con diversi modelli di linguaggio di grandi dimensioni (LLM) come **Gemini** e **Claude**, rendendolo flessibile e potente.

## ✨ Caratteristiche Principali

- **🤖 Agente AI Attivo**: L'AI non si limita a rispondere. Può eseguire azioni concrete come:
  - `create_files`: Creare nuovi file con il contenuto specificato.
  - `update_files`: Modificare file esistenti, fornendo il contenuto completo aggiornato.
  - `delete_files`: Rimuovere file dal progetto.
- **🧠 Analisi del Contesto**: L'AI può richiedere di leggere il contenuto di uno o più file (`read_file`) per raccogliere il contesto necessario prima di formulare un piano d'azione.
- **⚙️ Refactoring Multi-File**: Gestisce attività complesse che coinvolgono più file (es. refactoring di un'API) attraverso un protocollo `start_multi_file` e `continue_multi_file`, garantendo che il task venga completato in modo sequenziale e controllato.
- **🔌 Provider AI Configurabile**: Supporta nativamente diversi provider di AI. L'utente può scegliere il modello e fornire la propria chiave API.
- **💬 Chat Persistente**: Le conversazioni con l'AI vengono salvate localmente utilizzando IndexedDB, permettendo di riprendere il lavoro in sessioni successive.
- **🛡️ Parsing JSON Robusto**: Utilizza un sistema di sanitizzazione a più stadi (`extractAndSanitizeJson`) che impiega anche `JSON5` per interpretare correttamente le risposte dell'LLM, anche se non sono in formato JSON perfettamente standard.

## 🚀 Architettura

Il cuore del progetto è un sistema **Agente-Strumento** dove l'AI agisce come un "agente" che decide quale "strumento" utilizzare per portare a termine una richiesta.

1.  **Input Utente**: L'utente invia una richiesta tramite l'interfaccia di chat.
2.  **Costruzione del Prompt Dinamico**: `useAIStore` costruisce un prompt di sistema dettagliato che include:
    - Le regole del "protocollo decisionale" (analizza -> esegui).
    - Le specifiche rigorose per il formato di output JSON.
    - Il contesto del file attualmente aperto.
    - Lo stato di eventuali task multi-file in corso.
3.  **Ciclo di Interazione AI**:
    - L'AI riceve il prompt e decide l'azione.
    - Se ha bisogno di più contesto, usa lo strumento `read_file`. Il sistema esegue la lettura, aggiunge il risultato alla conversazione e interroga di nuovo l'AI.
    - Se è pronta ad agire, genera un JSON con un'azione (`update_files`, `start_multi_file`, etc.).
4.  **Esecuzione dell'Azione**:
    - La risposta JSON viene sanitizzata e validata.
    - `useFileStore` (non mostrato, ma dedotto) esegue le operazioni richieste sul file system virtuale.
5.  **Feedback all'Utente**: Il risultato dell'operazione viene mostrato nell'interfaccia di chat.

## 🛠️ Stack Tecnologico

- **Frontend**: React (presunto)
- **State Management**: Zustand
- **Storage Locale**: IndexedDB
- **Interazione AI**: Chiamate API dirette a provider come Google (Gemini) o Anthropic (Claude).
- **Parsing Avanzato**: JSON5

## 📦 Installazione e Avvio

1.  **Clona il repository:**

    ```bash
    git clone https://github.com/tuo-utente/tuo-repo.git
    cd tuo-repo
    ```

2.  **Installa le dipendenze:**

    ```bash
    npm install
    ```

3.  **Configura le chiavi API:**
    Il progetto richiede una chiave API per il provider AI che desideri utilizzare. Configura le variabili d'ambiente o inserisci la chiave direttamente nell'interfaccia utente dell'applicazione.

4.  **Avvia il server di sviluppo:**
    ```bash
    npm run dev
    ```

Apri il browser all'indirizzo `http://localhost:5173` (o quello indicato dal tuo tool di build).

## 🗺️ Roadmap Futura

Basato sul file `todo.md`, ecco alcune delle direzioni future per il progetto:

- **Ottimizzazione dei Token**: Implementare una strategia di riassunto del contesto per ridurre l'uso dei token nelle chiamate API.
- **Miglioramenti UI/UX**:
  - Aggiungere indicatori di caricamento (`loader`) durante l'elaborazione dell'AI.
  - Rendere le sezioni dell'editor ridimensionabili.
  - Aggiungere controlli per messaggio (es. copia, elimina da contesto).
- **Importazione Progetto**: Aggiungere la funzionalità per importare un intero progetto da un file `.zip`.
- **Supporto Multi-Linguaggio**: Addestrare e specializzare i prompt per diversi linguaggi di programmazione (es. C#, Arduino).

## 🤝 Contributi

I contributi sono benvenuti! Se hai idee per nuove funzionalità o miglioramenti, sentiti libero di aprire una issue o una pull request.
