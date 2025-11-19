# React + JavaScript + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.io/) (or [oxc](https://oxc.rs) when used in [rolldown-vite](https://vite.dev/guide/rolldown)) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

---

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

# CodeForge AI

Un IDE intelligente completamente client-side con supporto AI integrato.

## Features

- 🤖 AI Code Generation (Anthropic Claude)
- 📁 Virtual File System con persistenza (IndexedDB)
- 💻 Monaco Editor (VS Code)
- 📚 Snippet Library
- 🎨 Project Templates
- 👁️ Live Preview HTML/CSS/JS
- 💾 Export/Import progetti (ZIP)
- 🎯 Multi-language support (JS, C++, Kotlin, Arduino)

## Tech Stack

- React 18
- Vite
- Zustand (State Management)
- Monaco Editor
- IndexedDB (idb)
- Anthropic API
- TailwindCSS

## Getting Started

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
```

## License

MIT
