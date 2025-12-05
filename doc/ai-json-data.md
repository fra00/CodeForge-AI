# Documentazione Ufficiale: Strutture JSON per l'Interazione AI

Questo documento descrive le strutture JSON che l'agente AI deve produrre per interagire con il file system e l'ambiente dell'IDE. Ogni azione ha un formato specifico che deve essere rispettato per garantire un'esecuzione corretta.

## Indice delle Azioni

1.  [Risposta Testuale (`text_response`)](#1-risposta-testuale-text_response)
2.  Chiamata a Strumenti (`tool_call`)
    - Elencare File (`list_files`)
    - Leggere File (`read_file`)
3.  Inizio Task Multi-File (`start_multi_file`)
4.  Continuazione Task Multi-File (`continue_multi_file`)

---

## 1. Risposta Testuale (`text_response`)

**Scopo**: Fornire una risposta testuale semplice all'utente, senza eseguire alcuna operazione sul file system. Utile per rispondere a domande, confermare il completamento di un'azione o fornire spiegazioni.

### Struttura

```json
{
  "action": "text_response",
  "text_response": "Il testo della risposta da mostrare all'utente."
}
```

### Esempio

```json
{
  "action": "text_response",
  "text_response": "Certo, posso aiutarti a refactorizzare il componente `Header`."
}
```

---

## 2. Chiamata a Strumenti (`tool_call`)

**Scopo**: Richiedere informazioni sull'ambiente di sviluppo prima di procedere con una modifica. Questo permette all'AI di raccogliere il contesto necessario.

### Struttura Generale

```json
{
  "action": "tool_call",
  "tool_call": {
    "function_name": "nome_della_funzione",
    "args": { ... }
  }
}
```

### Sotto-Azioni

#### Elencare File (`list_files`)

**Scopo**: Ottenere un elenco di tutti i percorsi dei file e delle cartelle nel progetto.

**Struttura**:

```json
{
  "action": "tool_call",
  "tool_call": {
    "function_name": "list_files",
    "args": {}
  }
}
```

#### Leggere File (`read_file`)

**Scopo**: Leggere il contenuto di uno o più file specifici.

**Struttura (File Singolo)**:

```json
{
  "action": "tool_call",
  "tool_call": {
    "function_name": "read_file",
    "args": {
      "path": "/src/components/Layout/Header.jsx"
    }
  }
}
```

**Struttura (File Multipli - Batch)**:

```json
{
  "action": "tool_call",
  "tool_call": {
    "function_name": "read_file",
    "args": {
      "paths": ["/src/App.jsx", "/src/stores/useFileStore.js"]
    }
  }
}
```

---

## 3. Inizio Task Multi-File (`start_multi_file`)

**Scopo**: Iniziare un'operazione complessa che richiede la modifica di uno o più file. Questo è il punto di partenza per qualsiasi modifica al codice. Include un piano d'azione e la modifica del primo file.

### Struttura

```json
{
  "action": "start_multi_file",
  "plan": {
    "description": "Descrizione sintetica del task complessivo.",
    "files_to_modify": ["/percorso/file1.js", "/percorso/file2.css"]
  },
  "first_file": {
    "action": "create_file" | "update_file",
    "file": {
      "path": "/percorso/file1.js",
      "content": "/* ... nuovo contenuto del file ... */"
    }
  },
  "message": "Messaggio di stato da mostrare all'utente, es: 'Inizio il refactoring...'"
}
```

---

## 4. Continuazione Task Multi-File (`continue_multi_file`)

**Scopo**: Proseguire con un task multi-file già iniziato, modificando il file successivo nel piano.

### Struttura

```json
{
  "action": "continue_multi_file",
  "next_file": {
    "action": "create_file" | "update_file" | "delete_file",
    "file": {
      "path": "/percorso/file2.css",
      "content": "/* ... contenuto per create/update, può essere omesso per delete ... */"
    }
  },
  "message": "Messaggio di stato, es: 'Ora aggiorno il file CSS...'"
}
```

### Nota su `delete_file`

L'azione `delete_file` è valida solo all'interno di `continue_multi_file` (o `start_multi_file`). Il campo `content` può essere omesso.

**Esempio con `delete_file`**:

```json
{
  "action": "continue_multi_file",
  "next_file": {
    "action": "delete_file",
    "file": {
      "path": "/src/components/OldComponent.jsx"
    }
  },
  "message": "Rimuovo il componente obsoleto OldComponent.jsx."
}
```
