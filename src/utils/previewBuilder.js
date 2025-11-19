/**
 * Costruisce il contenuto HTML completo per l'iframe di Live Preview.
 * @param {Object} files - La mappa dei file dallo store (id -> file object).
 * @param {string} rootId - L'ID del nodo radice.
 * @returns {string} Il codice HTML completo per il rendering nell'iframe.
 */
export function buildPreviewHTML(files, rootId) {
  const rootChildren = files[rootId]?.children || [];

  /**
   * Trova un file nel VFS dato il suo percorso relativo alla radice.
   * @param {string} path - Il percorso del file (es. 'style.css' o './js/script.js').
   * @returns {Object|null} L'oggetto file o null.
   */
  const findFileByPath = (path) => {
    // Rimuove il './' iniziale se presente
    const normalizedPath = path.startsWith("./") ? path.substring(2) : path;

    const findRecursive = (childrenIds, currentPath) => {
      for (const id of childrenIds) {
        const file = files[id];
        const fullPath = currentPath
          ? `${currentPath}/${file.name}`
          : file.name;

        if (fullPath === normalizedPath) {
          return file;
        }

        if (file.isFolder && file.children) {
          const found = findRecursive(file.children, fullPath);
          if (found) return found;
        }
      }
      return null;
    };

    return findRecursive(files[rootId]?.children || [], "");
  };

  const htmlFile = rootChildren.find(
    (id) => files[id]?.name === "index.html" && files[id]?.language === "html"
  );
  let htmlContent = files[htmlFile]?.content || "";

  // Logica per intercettare la console e inviare i messaggi al parent (l'applicazione principale)
  const consoleInterceptor = `
    <script>
      const originalConsole = {
        log: console.log,
        error: console.error,
        warn: console.warn,
      };

      window.console = {
        log: (...args) => {
          originalConsole.log(...args);
          parent.postMessage({ type: 'log', data: args.map(a => String(a)) }, '*');
        },
        error: (...args) => {
          originalConsole.error(...args);
          parent.postMessage({ type: 'error', data: args.map(a => String(a)) }, '*');
        },
        warn: (...args) => {
          originalConsole.warn(...args);
          parent.postMessage({ type: 'warn', data: args.map(a => String(a)) }, '*');
        },
      };

      // Intercetta gli errori non gestiti
      window.onerror = function(message, source, lineno, colno, error) {
        parent.postMessage({ 
          type: 'error', 
          data: [\`Uncaught Error: \${message}\`],
          source: source,
          lineno: lineno,
        }, '*');
        return true; // Impedisce la visualizzazione dell'errore nella console del browser
      };
    </script>
  `;

  // 1. Sostituzione dei tag <link> CSS
  // Cerca <link ... href="path/to/file.css" ...>
  const cssLinkRegex = /<link\s+[^>]*?href=["']([^"']+\.css)["'][^>]*?>/gi;
  htmlContent = htmlContent.replace(cssLinkRegex, (match, cssPath) => {
    const cssFile = findFileByPath(cssPath);
    if (cssFile) {
      return `<style>\n${cssFile.content || ""}\n</style>`;
    }
    // Logga un errore nella console di preview se il file non viene trovato
    const errorScript = `<script>console.error('VFS Error: CSS file not found at path: ${cssPath}');</script>`;
    return `<!-- CSS file not found: ${cssPath} -->${errorScript}`;
  });

  // 2. Sostituzione dei tag <script> JS
  // Cerca <script src="path/to/file.js"></script> o <script src="..." />
  const jsScriptRegex =
    /<script\s+(?:[^>]*?\s+)?src=["']([^"']+\.js)["'](?:\s+[^>]*?)?><\/script>|<script\s+(?:[^>]*?\s+)?src=["']([^"']+\.js)["'](?:\s+[^>]*?)?\/>/gi;
  htmlContent = htmlContent.replace(
    jsScriptRegex,
    (match, jsPath1, jsPath2) => {
      const jsPath = jsPath1 || jsPath2;
      const jsFile = findFileByPath(jsPath);
      if (jsFile) {
        // Avvolgo il codice in un try/catch per intercettare gli errori
        return `<script type="text/javascript">
        try {
          ${jsFile.content || ""}
        } catch (e) {
          window.onerror(e.message, '${jsPath}', 0, 0, e);
        }
      </script>`;
      }
      return `<!-- JS file not found: ${jsPath} -->`;
    }
  );

  // 3. Estrai il contenuto del body e dell'head per iniettarlo nel template finale

  // Estrai il contenuto dell'head (inclusi i tag <style> sostituiti)
  const headContentMatch = htmlContent.match(/<head[^>]*>([\s\S]*?)<\/head>/i);
  // CORREZIONE: Estrai il gruppo di cattura per evitare la virgola
  const headContent = headContentMatch ? headContentMatch[0] : "";

  // Estrai il contenuto del body
  const bodyContentMatch = htmlContent.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
  // CORREZIONE: Estrai il gruppo di cattura per evitare la virgola
  const bodyContent = bodyContentMatch ? bodyContentMatch[0] : htmlContent; // Fallback all'intero contenuto

  // 4. Ritorno l'HTML completo, iniettando il contenuto elaborato.
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <title>Live Preview</title>
        ${headContent}
        ${consoleInterceptor}
      </head>
      <body>
        ${bodyContent}
      </body>
    </html>
  `;
}
