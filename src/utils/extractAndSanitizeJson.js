import JSON5 from "json5"; // Assicurati di importare JSON5

/**
 * Estrae e sanifica l'unico payload JSON significativo dal testo di input,
 * ignorando testo circostante e delimitatori Markdown interni.
 * * Presupposto: Esiste UN SOLO oggetto JSON significativo da estrarre.
 * * @param {string} text La stringa di input grezza.
 * @returns {string|null} La stringa JSON sanificata e rigorosa, o null se fallisce.
 */
export const extractAndSanitizeJson = (text) => {
  if (!text || typeof text !== "string") return null;
  const trimmed = text.trim();
  let rawJsonContent = null;

  // --- Strategia 1: Trova Parentesi Graffe Esterne (La più robusta) ---
  // Cerca il JSON più esteso. Questo gestisce sia i casi con testo libero
  // che il tuo edge case ('{"response":"```json{}```"}').

  const firstBrace = trimmed.indexOf("{");
  const lastBrace = trimmed.lastIndexOf("}");

  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    // Estrae dal primo '{' all'ultimo '}'
    rawJsonContent = trimmed.substring(firstBrace, lastBrace + 1).trim();
  } else if (trimmed.startsWith("[")) {
    // Controllo aggiuntivo per array JSON (che non usano graffe)
    const firstBracket = trimmed.indexOf("[");
    const lastBracket = trimmed.lastIndexOf("]");
    if (
      firstBracket !== -1 &&
      lastBracket !== -1 &&
      lastBracket > firstBracket
    ) {
      rawJsonContent = trimmed.substring(firstBracket, lastBracket + 1).trim();
    }
  }

  // var obj = JSON.parse(rawJsonContent); // Verifica che sia valido JSON
  // if (obj) {
  //   rawJsonContent = obj.text || rawJsonContent;
  // }

  // --- Strategia 2: Fallback Blocco Markdown (Per casi eccezionali) ---
  // Usato solo se le parentesi graffe/quadre non sono state trovate in S1.
  // Questo è un fallback per input mal formattati che sono *solo* un blocco di codice.
  if (!rawJsonContent) {
    const startDelimiter = "```";
    const endDelimiter = "```";
    const startIndex = trimmed.indexOf(startDelimiter);

    if (startIndex !== -1) {
      const contentStart = startIndex + startDelimiter.length;
      const contentEnd = trimmed.lastIndexOf(endDelimiter);

      if (contentEnd > contentStart) {
        // Estrae e verifica che assomigli a JSON
        const tempContent = trimmed.substring(contentStart, contentEnd).trim();
        if (tempContent.startsWith("{") || tempContent.startsWith("[")) {
          rawJsonContent = tempContent;
        }
      }
    }
  }

  // **************** VALIDAZIONE E SANIFICAZIONE FINALE ****************

  if (!rawJsonContent) {
    return null;
  }

  // Tentativo A: Standard JSON (più veloce)
  try {
    JSON.parse(rawJsonContent);
    return rawJsonContent; // Già valido
  } catch (e) {
    // Tentativo B: JSON5 (per correggere errori comuni di LLM)
    try {
      const parsedObject = JSON5.parse(rawJsonContent);
      // Normalizza e restituisce una stringa JSON rigorosa
      return JSON.stringify(parsedObject);
    } catch (e5) {
      // Se fallisce anche JSON5, si può provare un'ultima pulizia mirata
      // per rimuovere i delimitatori Markdown non escapati, che possono rompere JSON5.
      let aggressivelyCleaned = rawJsonContent
        .replace(/```json/g, "")
        .replace(/```/g, "");
      try {
        const parsedObject = JSON5.parse(aggressivelyCleaned);
        return JSON.stringify(parsedObject);
      } catch (eFinal) {
        // Fallimento definitivo
        return null;
      }
    }
  }
};
