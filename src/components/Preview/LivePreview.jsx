import React, {
  useState,
  useRef,
  useEffect,
  useCallback,
  useMemo,
} from "react";
import PropTypes from "prop-types";
import { useFileStore } from "../../stores/useFileStore";
import { buildPreviewHTML } from "../../utils/previewBuilder";
import { PreviewToolbar } from "./PreviewToolbar";
import { ConsolePanel } from "./Console";

/**
 * Script da iniettare nell'iframe per catturare gli errori della console
 * e inviarli alla finestra principale tramite una funzione di callback.
 */
const errorCaptureScript = `
  (function() {
    function report(type, data) {
      if (typeof window.parent.handleIframeLog === 'function') {
        window.parent.handleIframeLog({ type, data, timestamp: new Date().toISOString() });
      }
    }

    const originalConsole = {
      log: console.log,
      error: console.error,
      warn: console.warn,
    };

    console.log = (...args) => { report('log', args); originalConsole.log.apply(console, args); };
    console.error = (...args) => { report('error', args); originalConsole.error.apply(console, args); };
    console.warn = (...args) => { report('warn', args); originalConsole.warn.apply(console, args); };

    window.addEventListener('error', (event) => {
      // Gli errori globali sono stringhe, quindi li mettiamo in un array per coerenza
      report('error', [event.message]);
    });
  })();
  `;

/**
 * Componente principale per la Live Preview.
 * Gestisce il rendering dell'iframe, l'auto-refresh e la console.
 */
export function LivePreview({ className = "" }) {
  const files = useFileStore((state) => state.files);
  const rootId = useFileStore((state) => state.rootId);
  const [logs, setLogs] = useState([]);
  const iframeRef = useRef(null);

  const handleClearConsole = useCallback(() => {
    setLogs([]);
  }, []);

  const srcDoc = useMemo(() => {
    const htmlContent = buildPreviewHTML(files, rootId);
    const headEndIndex = htmlContent.indexOf("</head>");
    if (headEndIndex !== -1) {
      return `${htmlContent.slice(0, headEndIndex)}<script>${errorCaptureScript}</script>${htmlContent.slice(headEndIndex)}`;
    }
    return `<html><head><script>${errorCaptureScript}</script></head><body>${htmlContent}</body></html>`;
  }, [files, rootId]);

  // Listener per i log e gli errori dall'iframe
  useEffect(() => {
    window.handleIframeLog = (log) => {
      if (log.type === "error") {
        // Invia l'errore anche al gestore globale in App.jsx
        if (typeof window.handleIframeError === "function") {
          window.handleIframeError(
            Array.isArray(log.data) ? log.data.join(" ") : log.data
          );
        }
      }
      setLogs((prevLogs) => [...prevLogs, log]);
    };
    return () => {
      delete window.handleIframeLog;
    };
  }, []);

  return (
    <div className={`flex flex-col h-full w-full bg-editor-bg ${className}`}>
      <PreviewToolbar onRefresh={() => (iframeRef.current.srcdoc = srcDoc)} srcDoc={srcDoc} />
      <iframe
        ref={iframeRef}
        srcDoc={srcDoc}
        title="Live Preview"
        className="w-full flex-1 border-none bg-white"
        sandbox="allow-scripts allow-same-origin"
      />
      <ConsolePanel logs={logs} onClear={handleClearConsole} />
    </div>
  );
}
