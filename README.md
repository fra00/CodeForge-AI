# AI-Powered Web IDE

## 🤖 Guida per lo Sviluppo Assistito da AI

Questa sezione contiene le istruzioni per assisterti nello sviluppo di questo progetto.

### La Tua Fonte di Verità

La tua unica e sola fonte di verità per tutte le conoscenze specifiche di questo progetto è la cartella:

```
.llm-project-context/
```

Questa cartella contiene le regole, le definizioni e la documentazione che **hanno la precedenza** su qualsiasi tua conoscenza generica.

### ⚠️ PROCEDURA OBBLIGATORIA DI INIZIALIZZAZIONE

**IMPORTANTE**: Non procedere con alcuna generazione di codice prima di aver completato questa procedura.

#### Step 1: Caricamento Contesto

Leggi nell'ordine:

1. `.ai-project-context/SYSTEM_PROMPT.md`
2. `.ai-project-context/1_CODING_RULES.md`
3. `.ai-project-context/2_TECH_STACK.md`
4. `.ai-project-context/3_INTERNAL_KNOWLEDGE/`

#### Step 2: Test di Comprensione (OBBLIGATORIO)

Prima di procedere, **devi rispondere** a queste domande per dimostrare di aver letto attentamente:

1. Qual è il componente UI predefinito per i bottoni in questo progetto?
2. Quale framework devo usare per task complessi prima di scrivere codice?
3. Elenca 3 anti-pattern da evitare secondo `1_CODING_RULES.md`
4. Quali sono le librerie di state management approvate?
5. Posso usare localStorage negli artifacts? Perché?

**Formato risposta richiesto:**

```
✅ INIZIALIZZAZIONE COMPLETATA

1. [risposta]
2. [risposta]
3. [risposta]
4. [risposta]
5. [risposta]

Sono pronto per ricevere task di sviluppo.
```

#### Step 3: Solo dopo il test

Una volta superato il test, puoi iniziare a sviluppare.

---

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
2.  **Costruzione del Prompt Dinamico**: `useAIStore` costruisce un prompt di sistema dettagliato che include le regole del protocollo, le specifiche JSON e il contesto del file attivo.
3.  **Ciclo di Interazione AI**: L'AI analizza la richiesta. Se ha bisogno di più contesto, usa lo strumento `read_file`. Una volta pronta, genera un JSON con un'azione (`update_files`, `start_multi_file`, etc.).
4.  **Esecuzione dell'Azione**: La risposta JSON viene sanitizzata e validata. `useFileStore` esegue le operazioni richieste sul file system virtuale.
5.  **Feedback all'Utente**: Il risultato dell'operazione viene mostrato nell'interfaccia di chat.

## 🛠️ Stack Tecnologico

- **Frontend**: React
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

## 🗺️ Roadmap Futura

- **Ottimizzazione dei Token**: Implementare una strategia di riassunto del contesto per ridurre l'uso dei token.
- **Miglioramenti UI/UX**: Aggiungere indicatori di caricamento, sezioni ridimensionabili e controlli per i messaggi.
- **Importazione Progetto**: Aggiungere la funzionalità per importare un intero progetto da un file `.zip`.
- **Supporto Multi-Linguaggio**: Specializzare i prompt per diversi linguaggi di programmazione.

## 🤝 Contributi

I contributi sono benvenuti! Se hai idee per nuove funzionalità o miglioramenti, sentiti libero di aprire una issue o una pull request.
