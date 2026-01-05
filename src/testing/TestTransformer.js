import { Parser } from "acorn";
import { simple, base } from "acorn-walk";
import jsx from "acorn-jsx";
// Importiamo il codice del runner come testo grezzo
import vitestRunnerCode from "./VitestCompatibleRunner.js?raw";

/**
 * Trasforma il codice di test per risolvere gli import e renderlo eseguibile
 * in un ambiente che non supporta i moduli nativamente (come il nostro worker).
 */
export class TestTransformer {
  constructor(allFiles) {
    this.allFiles = allFiles; // L'intero file system virtuale
    this.bundledCode = "";
    this.processedFiles = new Set(); // Per evitare import circolari e duplicati
  }

  /**
   * Punto di ingresso principale. Trasforma il file di test principale.
   * @param {string} entryFilePath - Il percorso del file di test da eseguire.
   * @returns {string} - Il codice "impacchettato" e pronto per l'esecuzione.
   */
  transform(entryFilePath) {
    const entryFile = this.findFile(entryFilePath);
    if (!entryFile) {
      throw new Error(`File di ingresso non trovato: ${entryFilePath}`);
    }
    this.bundleFile(entryFile);

    // --- SANIFICAZIONE PER INIEZIONE IN HTML ---
    return this.generateFinalCode();
  }

  /**
   * Trasforma un codice virtuale (non salvato su file) come entry point.
   * Utile per "Run All Tests" che crea un file che importa tutti gli altri.
   */
  transformVirtual(code) {
    // Creiamo un oggetto file fittizio per il bundleFile
    const virtualFile = { path: "/__virtual_entry__.js", content: code };
    this.bundleFile(virtualFile);
    return this.generateFinalCode();
  }

  generateFinalCode() {
    // Se il codice contiene la stringa `</script>`, il parser HTML interromperà lo script prematuramente.
    // Sostituiamo la sequenza per evitare questo problema.
    const sanitize = (code) => code.replace(/<\/script>/g, "<\\/script>");

    // Helper per rendere sicuro il codice JSON all'interno di stringhe JS
    // Gestisce i separatori di linea Unicode che rompono le stringhe JS
    const safeStringify = (str) => 
      JSON.stringify(str).replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029');

    // Preparazione del codice del runner per l'importazione dinamica via Blob
    // Sostituiamo gli import locali con quelli CDN per far funzionare il modulo nel browser
    const runnerCodeWithCDN = vitestRunnerCode
      .replace(
        /from\s+['"]react['"]/g,
        'from "https://esm.sh/react@18.2.0?dev"'
      )
      .replace(
        /from\s+['"]react-dom\/client['"]/g,
        'from "https://esm.sh/react-dom@18.2.0/client?dev&deps=react@18.2.0"'
      )
      .replace(
        /from\s+['"]react-dom\/test-utils['"]/g,
        'from "https://esm.sh/react-dom@18.2.0/test-utils?dev&deps=react@18.2.0"'
      );

    const runnerCodeSafe = sanitize(runnerCodeWithCDN);
    const bundledCodeSafe = sanitize(this.bundledCode);

    // Includiamo il codice del runner e delle librerie necessarie nel bundle finale
    // e avviamo l'esecuzione.
    return `
      // --- Imports from CDN ---
      // Usiamo versioni ES Module compatibili dal CDN per evitare problemi di bundling locale
      import React, { useState, useEffect, useContext, useReducer, useCallback, useMemo, useRef, useImperativeHandle, useLayoutEffect, useDebugValue, createContext } from 'https://esm.sh/react@18.2.0?dev';
      import { createRoot } from 'https://esm.sh/react-dom@18.2.0/client?dev&deps=react@18.2.0';
      import { render, screen, fireEvent, waitFor, act } from 'https://esm.sh/@testing-library/react@14.0.0?dev&deps=react@18.2.0,react-dom@18.2.0';
      import { transform } from 'https://esm.sh/@babel/standalone@7.23.10';
      
      window.React = React; // Fallback globale
      window.useState = useState;
      window.useEffect = useEffect;
      window.useContext = useContext;
      window.useReducer = useReducer;
      window.useCallback = useCallback;
      window.useMemo = useMemo;
      window.useRef = useRef;
      window.useImperativeHandle = useImperativeHandle;
      window.useLayoutEffect = useLayoutEffect;
      window.useDebugValue = useDebugValue;
      window.createContext = createContext;

      window.render = render;
      window.screen = screen;
      window.fireEvent = fireEvent;
      window.waitFor = waitFor;
      window.act = act;

      // Polyfill per 'global' per compatibilità con librerie che si aspettano l'ambiente Node
      window.global = window;

      // --- Environment Setup ---
      // Assicuriamo che esista un elemento 'root' nel DOM, poiché molto codice React
      // (es. main.jsx) tenta di accedervi globalmente per il mounting immediato.
      // Aggiungiamo anche 'app' che è un altro ID comune per i container principali.
      ['root', 'app'].forEach(id => {
        if (!document.getElementById(id)) {
          const div = document.createElement('div');
          div.id = id;
          document.body.appendChild(div);
        }
      });

      // --- Codice del Test dell'Utente ---
      (async () => {
        let debugInfo = { step: 'start' };
        try {
          // --- Caricamento VitestCompatibleRunner ---
          debugInfo.step = 'loading_runner';
          // Carichiamo il runner come un vero modulo ES tramite Blob URL
          const runnerBlob = new Blob([${safeStringify(runnerCodeSafe)}], { type: 'text/javascript' });
          const runnerUrl = URL.createObjectURL(runnerBlob);
          const runnerModule = await import(runnerUrl);
          
          // Esponiamo le API del runner globalmente (describe, it, renderHook, act, etc.)
          // Assegnazione esplicita per evitare problemi con i moduli ES
          window.describe = runnerModule.describe;
          window.it = runnerModule.it;
          window.test = runnerModule.test;
          window.expect = runnerModule.expect;
          window.beforeEach = runnerModule.beforeEach;
          window.afterEach = runnerModule.afterEach;
          window.beforeAll = runnerModule.beforeAll;
          window.afterAll = runnerModule.afterAll;
          window.vi = runnerModule.vi;
          window.renderHook = runnerModule.renderHook;
          window.cleanup = runnerModule.cleanup;
          
          URL.revokeObjectURL(runnerUrl);

          // Transpilazione JSX a Runtime
          debugInfo.step = 'transpiling';
          const rawCode = ${safeStringify(bundledCodeSafe)};
          const transpiled = transform(rawCode, {
            presets: [['react', { runtime: 'classic' }]],
            filename: 'test.jsx',
          }).code;
          debugInfo.transpiledCode = transpiled;

          // --- FIX SCOPE ---
          // Creiamo alias locali per le funzioni globali.
          // Questo è necessario perché l'eval crea uno scope in cui le proprietà di window
          // non sono automaticamente visibili come variabili locali (es. renderHook) in certi contesti.
          const aliases = [
            'describe', 'it', 'test', 'expect', 'vi',
            'beforeEach', 'afterEach', 'beforeAll', 'afterAll',
            'renderHook', 'cleanup', 'act',
            'render', 'screen', 'fireEvent', 'waitFor',
            'React', 'useState', 'useEffect', 'useContext', 'useReducer', 'createContext',
            'useCallback', 'useMemo', 'useRef', 'useImperativeHandle', 
            'useLayoutEffect', 'useDebugValue'
          ].map(name => \`const \${name} = window.\${name};\`).join(' ');

          // Pulizia preventiva del localStorage per evitare che lo stato persista tra le esecuzioni dei test
          window.localStorage.clear();

          debugInfo.step = 'evaluating';
          await eval('(async () => {' + aliases + '\\n' + transpiled + '})()');

          debugInfo.step = 'running_tests';
          const results = await runnerModule.runner.run();
          // Serializziamo i risultati per rimuovere eventuali funzioni non clonabili
          const cleanResults = JSON.parse(JSON.stringify(results));
          window.parent.postMessage({ type: 'results', payload: cleanResults }, '*');
        } catch (e) {
          console.error("[Test Error]", e);
          const enhancedMessage = e.message + '\\n\\n[Debug Info]\\nStep: ' + debugInfo.step + '\\nCode Snippet: ' + (debugInfo.transpiledCode ? debugInfo.transpiledCode.substring(0, 500) : 'N/A');
          window.parent.postMessage({ type: 'error', payload: { message: enhancedMessage, stack: e.stack } }, '*');
        }
      })();
    `;
  }

  // Helper per generare ID univoci per le variabili basati sul percorso del file
  getFileId(path) {
    return path.replace(/[^a-zA-Z0-9]/g, "_");
  }

  /**
   * Funzione ricorsiva che analizza un file, risolve i suoi import e lo aggiunge al bundle.
   * @param {object} file - L'oggetto file da processare.
   */
  bundleFile(file) {
    if (!file || this.processedFiles.has(file.path)) {
      return;
    }

    this.processedFiles.add(file.path);
    console.log(`[TestTransformer] Processing file: ${file.path}`);
    const currentFileId = this.getFileId(file.path);

    let hasExports = false; // Flag per tracciare se il file esporta qualcosa
    let hasDefaultExport = false; // Flag per tracciare se c'è un export default
    const dependencies = [];
    const codeWithoutImports = [];
    let lastIndex = 0;

    // Usiamo Acorn per il parsing. È più leggero e browser-friendly.
    const JsxParser = Parser.extend(jsx());
    const ast = JsxParser.parse(file.content, {
      ecmaVersion: "latest",
      sourceType: "module",
    });

    // Estendiamo il base visitor per gestire (ignorare) i nodi JSX
    // acorn-walk non conosce i nodi JSX e fallirebbe se provasse ad attraversarli.
    // Poiché import ed export sono solo top-level, non serve attraversare il JSX.
    const jsxBase = { ...base };
    const jsxTypes = [
      "JSXElement",
      "JSXFragment",
      "JSXExpressionContainer",
      "JSXText",
      "JSXAttribute",
      "JSXSpreadAttribute",
      "JSXOpeningElement",
      "JSXClosingElement",
      "JSXOpeningFragment",
      "JSXClosingFragment",
      "JSXIdentifier",
      "JSXMemberExpression",
      "JSXNamespacedName",
      "JSXEmptyExpression",
    ];
    jsxTypes.forEach((type) => {
      jsxBase[type] = () => {};
    });

    // Usiamo acorn-walk per attraversare l'AST
    simple(
      ast,
      {
        // Gestisce `import ... from '...'`
        ImportDeclaration: (node) => {
          const source = node.source.value;
          let replacements = [];

          // Se è un import relativo (inizia con ./ o ../), lo processiamo.
          if (source.startsWith("./") || source.startsWith("../")) {
            const dependencyPath = this.resolvePath(file.path, source);
            const dependencyFile = this.findFile(dependencyPath);
            if (dependencyFile) {
              const depFileId = this.getFileId(dependencyFile.path);
              dependencies.push(dependencyFile);

              // Generiamo alias per collegare i nomi importati agli export locali
              if (node.specifiers) {
                node.specifiers.forEach((spec) => {
                  if (spec.type === "ImportDefaultSpecifier") {
                    // import App from './App' -> const App = defaultExport_src_App_jsx;
                    replacements.push(
                      `const ${spec.local.name} = defaultExport_${depFileId};`
                    );
                  } else if (spec.type === "ImportSpecifier") {
                    // import { foo as bar } from './utils' -> const bar = foo;
                    if (spec.imported.name !== spec.local.name) {
                      replacements.push(
                        `const ${spec.local.name} = ${spec.imported.name};`
                      );
                    }
                  }
                });
              }
            } else {
              throw new Error(
                `Module not found: '${source}' imported from '${file.path}'`
              );
            }
          }
          // Rimuoviamo l'import dal codice e inseriamo gli alias se presenti
          codeWithoutImports.push(
            file.content.substring(lastIndex, node.start)
          );
          if (replacements.length > 0) {
            codeWithoutImports.push(replacements.join(" "));
          }
          lastIndex = node.end;
        },
        // Gestisce `export const ...` o `export { ... }`
        ExportNamedDeclaration: (node) => {
          hasExports = true;
          // Aggiunge il codice prima dell'export
          codeWithoutImports.push(
            file.content.substring(lastIndex, node.start)
          );

          if (node.declaration) {
            // Se è `export const foo = ...`, manteniamo `const foo = ...`
            // Saltiamo solo la parola "export " (e spazi)
            lastIndex = node.declaration.start;
          } else {
            // Se è `export { foo }`, rimuoviamo tutto perché foo è già definito
            lastIndex = node.end;
          }
        },
        // Gestisce `export default ...`
        ExportDefaultDeclaration: (node) => {
          hasExports = true;
          hasDefaultExport = true;
          // Se è `export default function App() {}` o `export default class App {}`
          // Vogliamo preservare il nome 'App' nello scope.
          if (
            (node.declaration.type === "FunctionDeclaration" ||
              node.declaration.type === "ClassDeclaration") &&
            node.declaration.id
          ) {
            // Rimuoviamo 'export default ' ma manteniamo la dichiarazione
            codeWithoutImports.push(
              file.content.substring(lastIndex, node.start)
            );
            // Aggiungiamo la dichiarazione originale
            codeWithoutImports.push(
              file.content.substring(
                node.declaration.start,
                node.declaration.end
              )
            );
            // Aggiungiamo l'assegnazione al defaultExport
            codeWithoutImports.push(
              `\nconst defaultExport_${currentFileId} = ${node.declaration.id.name};\n`
            );
            lastIndex = node.end;
          } else {
            codeWithoutImports.push(
              file.content.substring(lastIndex, node.start)
            );
            codeWithoutImports.push(`const defaultExport_${currentFileId} = `);
            lastIndex = node.declaration.start;
          }
        },
      },
      jsxBase
    );

    codeWithoutImports.push(file.content.substring(lastIndex));
    let transformedCode = codeWithoutImports.join("");

    // Se il file non ha export (è probabilmente un test o un side-effect file),
    // lo avvolgiamo in un blocco per isolare lo scope delle variabili (es. mockLocalStorage).
    if (!hasExports) {
      transformedCode = `{\n${transformedCode}\n}`;
    }

    // Se non è stato trovato un export default, definiamo la variabile come undefined
    // per evitare ReferenceError nei file che provano a importarlo (es. import App from './App').
    if (!hasDefaultExport) {
      transformedCode += `\nconst defaultExport_${currentFileId} = undefined;\n`;
    }

    // Processa prima le dipendenze (post-ordine)
    for (const dep of dependencies) {
      this.bundleFile(dep);
    }

    // Aggiunge il codice del file corrente al bundle.
    // Le dipendenze sono già state aggiunte, quindi questo codice può usarle.
    this.bundledCode += transformedCode + "\n\n";
  }

  findFile(path) {
    // Helper per normalizzare i percorsi rimuovendo lo slash iniziale per il confronto
    const normalize = (p) => p.replace(/^\/+/, "");

    // Prova a trovare il file con corrispondenza esatta o aggiungendo estensioni comuni
    const extensions = [
      "",
      ".js",
      ".jsx",
      ".ts",
      ".tsx",
      "/index.js",
      "/index.jsx",
      "/index.ts",
      "/index.tsx",
    ];
    for (const ext of extensions) {
      const targetPath = normalize(path + ext);
      const found = Object.values(this.allFiles).find(
        (f) => !f.isFolder && normalize(f.path) === targetPath
      );
      if (found) return found;
    }
    return null;
  }

  resolvePath(basePath, relativePath) {
    const pathParts = basePath.split("/");
    pathParts.pop(); // Rimuove il nome del file corrente
    const relativeParts = relativePath.split("/");
    for (const part of relativeParts) {
      if (part === "..") pathParts.pop();
      else if (part !== ".") pathParts.push(part);
    }
    return pathParts.join("/");
  }
}
