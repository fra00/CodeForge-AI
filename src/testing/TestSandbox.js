const TIMEOUT_MS = 30000;

export class TestSandbox {
  constructor() {
    this.iframe = document.createElement('iframe');
    this.iframe.style.display = 'none';
    // Sandbox attribute per maggiore sicurezza (opzionale)
    this.iframe.setAttribute('sandbox', 'allow-scripts allow-same-origin');
    document.body.appendChild(this.iframe);
  }

  executeTest(testCode, onStatusUpdate = () => {}) {
    return new Promise((resolve, reject) => {
      let timeoutId;
      let handleMessage;

      const cleanup = () => {
        if (timeoutId) clearTimeout(timeoutId);
        if (handleMessage) {
          window.removeEventListener('message', handleMessage);
        }
      };

      const executeInIframe = () => {
        
        timeoutId = setTimeout(() => {
          cleanup();
          this.terminate();
          reject(new Error(`Esecuzione test scaduta dopo ${TIMEOUT_MS / 1000} secondi.`));
        }, TIMEOUT_MS);

        handleMessage = (event) => {
          if (event.source !== this.iframe.contentWindow) return;
          if (!event.data || typeof event.data !== 'object') return;

          const { type, payload } = event.data;

          if (type === "status") {
            onStatusUpdate(payload);
            return;
          }

          if (!['results', 'error'].includes(type)) return;

          cleanup();
          this.terminate();

          if (type === "results") {
            resolve(payload);
          } else if (type === "error") {
            const err = new Error(payload.message || 'Errore durante esecuzione test');
            err.stack = payload.stack;
            reject(err);
          }
        };

        window.addEventListener('message', handleMessage);

        const iframeDoc = this.iframe.contentDocument;
        // Cattura gli errori dell'iframe
        this.iframe.contentWindow.addEventListener('error', (e) => {
          console.error('[Iframe Error]:', e.error);
          cleanup();
          this.terminate();
          reject(new Error(`Errore nell'iframe: ${e.error?.message || 'Unknown'}`));
        });

        // Log per debug
        console.log('[TestSandbox] Esecuzione iniziata');

        const blob = new Blob([testCode], { type: 'application/javascript' });
        const url = URL.createObjectURL(blob);

        const scriptElement = iframeDoc.createElement('script');
        scriptElement.type = 'module';
        scriptElement.src = url;
        
        scriptElement.onload = () => {
          URL.revokeObjectURL(url);
        };
        
        scriptElement.onerror = () => {
          cleanup();
          this.terminate();
          URL.revokeObjectURL(url);
          reject(new Error('Errore durante il caricamento del codice di test'));
        };
        
        iframeDoc.body.appendChild(scriptElement);
      };

      if (this.iframe.contentDocument?.readyState === 'complete') {
        executeInIframe();
      } else {
        this.iframe.onload = executeInIframe;
      }
    });
  }

  terminate() {
    if (this.iframe && this.iframe.parentNode) {
      this.iframe.parentNode.removeChild(this.iframe);
      this.iframe = null;
    }
  }
}