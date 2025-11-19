/**
 * Prompt Templates per l'AI Assistant.
 * Usare {code} come placeholder per il codice selezionato o il contenuto del file.
 */
export const promptTemplates = {
  explain: {
    title: "Spiega Codice",
    description: "Spiega il codice selezionato o il contenuto del file attivo in dettaglio.",
    template: "Spiega il seguente codice in dettaglio, evidenziando la sua funzione, i pattern utilizzati e le potenziali aree di miglioramento:\n\n{code}",
  },
  refactor: {
    title: "Refactor",
    description: "Refactora il codice selezionato seguendo le best practice (DRY, SRP, nomi espliciti).",
    template: "Refactora il seguente codice seguendo le best practice (DRY, SRP, nomi espliciti). Genera SOLO il codice refactorizzato:\n\n{code}",
  },
  fix: {
    title: "Trova e Correggi Bug",
    description: "Analizza il codice selezionato per trovare e correggere bug o problemi logici.",
    template: "Analizza il seguente codice per trovare e correggere bug o problemi logici. Genera SOLO il codice corretto:\n\n{code}",
  },
  optimize: {
    title: "Ottimizza Performance",
    description: "Ottimizza le performance del codice selezionato.",
    template: "Ottimizza le performance del seguente codice. Genera SOLO il codice ottimizzato:\n\n{code}",
  },
  test: {
    title: "Genera Unit Test",
    description: "Genera unit test completi per il codice selezionato (usando Vitest e React Testing Library).",
    template: "Genera unit test completi per il seguente codice, utilizzando Vitest e React Testing Library (se è un componente React). Genera SOLO il codice del test:\n\n{code}",
  },
  document: {
    title: "Aggiungi Documentazione",
    description: "Aggiungi documentazione JSDoc o commenti significativi al codice selezionato.",
    template: "Aggiungi documentazione JSDoc o commenti significativi al seguente codice. Genera SOLO il codice con la documentazione aggiunta:\n\n{code}",
  },
};