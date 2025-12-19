import { Parser } from "acorn";
import { simple } from "acorn-walk";
import jsx from "acorn-jsx";
// Importiamo il codice del runner come testo grezzo
import vitestRunnerCode from './VitestCompatibleRunner.js?raw';

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
    // Se il codice contiene la stringa `</script>`, il parser HTML interromperà lo script prematuramente.
    // Sostituiamo la sequenza per evitare questo problema.
    const sanitizeForInjection = (code) => code.replace(/<\/script>/g, '<\\/script>');

    const sanitizedVitestRunner = sanitizeForInjection(vitestRunnerCode);
    const sanitizedBundledCode = sanitizeForInjection(this.bundledCode);

    // Includiamo il codice del runner e delle librerie necessarie nel bundle finale
    // e avviamo l'esecuzione.
    return `
      // --- Imports from CDN ---
      // Usiamo versioni ES Module compatibili dal CDN per evitare problemi di bundling locale
      import React, { useState, useEffect, useContext, useReducer, useCallback, useMemo, useRef, useImperativeHandle, useLayoutEffect, useDebugValue } from 'https://esm.sh/react@18.2.0?dev';
      import { render, renderHook, screen, fireEvent, waitFor, act } from 'https://esm.sh/@testing-library/react@14.0.0?dev&deps=react@18.2.0,react-dom@18.2.0';
      
      window.React = React; // Fallback globale

      // --- Iniezione di VitestCompatibleRunner ---
      ${sanitizedVitestRunner.replace(/export\s+/g, '')}

      // --- Codice del Test dell'Utente ---
      (async () => {
        try {
          ${sanitizedBundledCode}
          const results = await runner.run();
          // Serializziamo i risultati per rimuovere eventuali funzioni non clonabili
          const cleanResults = JSON.parse(JSON.stringify(results));
          window.parent.postMessage({ type: 'results', payload: cleanResults }, '*');
        } catch (e) {
          console.error("[Test Error]", e);
          window.parent.postMessage({ type: 'error', payload: { message: e.message, stack: e.stack } }, '*');
        }
      })();
    `;
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

    const dependencies = [];
    const codeWithoutImports = [];
    let lastIndex = 0;

    // Usiamo Acorn per il parsing. È più leggero e browser-friendly.
    const JsxParser = Parser.extend(jsx());
    const ast = JsxParser.parse(file.content, {
      ecmaVersion: "latest",
      sourceType: "module",
    });
    
    // Usiamo acorn-walk per attraversare l'AST
    simple(ast, {
      // Gestisce `import ... from '...'`
      ImportDeclaration: (node) => {
        const source = node.source.value;
        // Se è un import relativo (inizia con ./ o ../), lo processiamo.
        if (source.startsWith("./") || source.startsWith("../")) {
          const dependencyPath = this.resolvePath(file.path, source);
          const dependencyFile = this.findFile(dependencyPath);
          if (dependencyFile) {
            dependencies.push(dependencyFile);
          } else {
            throw new Error(`Module not found: '${source}' imported from '${file.path}'`);
          }
        }
        // Rimuoviamo l'import dal codice
        codeWithoutImports.push(file.content.substring(lastIndex, node.start));
        lastIndex = node.end;
      },
      // Gestisce `export const ...` o `export { ... }`
      ExportNamedDeclaration: (node) => {
        // Aggiunge il codice prima dell'export
        codeWithoutImports.push(file.content.substring(lastIndex, node.start));
        
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
        codeWithoutImports.push(file.content.substring(lastIndex, node.start));
        codeWithoutImports.push("const defaultExport = ");
        lastIndex = node.declaration.start;
      }
    });

    codeWithoutImports.push(file.content.substring(lastIndex));
    let transformedCode = codeWithoutImports.join('');

    // Processa prima le dipendenze (post-ordine)
    for (const dep of dependencies) {
      this.bundleFile(dep);
    }

    // Aggiunge il codice del file corrente al bundle.
    // Le dipendenze sono già state aggiunte, quindi questo codice può usarle.
    this.bundledCode += transformedCode + "\n\n";
  }

  findFile(path) {
    // Prova a trovare il file con corrispondenza esatta o aggiungendo estensioni comuni
    const extensions = ['', '.js', '.jsx', '.ts', '.tsx', '/index.js', '/index.jsx', '/index.ts', '/index.tsx'];
    for (const ext of extensions) {
      const found = Object.values(this.allFiles).find(f => !f.isFolder && f.path === path + ext);
      if (found) return found;
    }
    return null;
  }

  resolvePath(basePath, relativePath) {
    const pathParts = basePath.split('/');
    pathParts.pop(); // Rimuove il nome del file corrente
    const relativeParts = relativePath.split('/');
    for (const part of relativeParts) {
      if (part === '..') pathParts.pop();
      else if (part !== '.') pathParts.push(part);
    }
    return pathParts.join('/');
  }
}