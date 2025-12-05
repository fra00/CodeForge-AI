/**
 * Questo script viene iniettato come primo script nell'ambiente Sandpack.
 * Il suo scopo è catturare qualsiasi eccezione JavaScript non gestita (uncaught exceptions)
 * e comunicarla alla finestra genitore (la nostra app React) tramite postMessage.
 * Questo è necessario per errori critici (es. ReferenceError) che bloccano l'esecuzione
 * prima che i meccanismi di logging interni di Sandpack possano intercettarli.
 */
window.onerror = function (message, source, lineno, colno, error) {
  // Invia un messaggio strutturato alla finestra genitore.
  window.parent.postMessage(
    {
      type: "custom-sandpack-error", // Usiamo un tipo custom per non entrare in conflitto.
      payload: {
        message: message,
        source: source, // L'URL dello script che ha causato l'errore.
        lineno: lineno,
        colno: colno,
        stack: error ? error.stack : null,
      },
    },
    "*" // In un'app di produzione, si dovrebbe specificare l'origine esatta.
  );
  // Restituire true impedisce al browser di mostrare l'errore nella sua console.
  // Lo lasciamo a false per poter comunque ispezionare l'errore negli strumenti di sviluppo.
  return false;
};
