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

  var splitted = trimmed.split("# [content-file]:");

  const textToJson = splitted[0].trim();
  const contentFile = splitted[1]?.trim();
  // --- Strategia 1: Trova Parentesi Graffe Esterne (La più robusta) ---
  // Cerca il JSON più esteso. Questo gestisce sia i casi con testo libero
  // che il tuo edge case ('{"response":"```json{}```"}').

  const firstBrace = textToJson.indexOf("{");
  const lastBrace = textToJson.lastIndexOf("}");

  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    // Estrae dal primo '{' all'ultimo '}'
    rawJsonContent = textToJson.substring(firstBrace, lastBrace + 1).trim();
  } else if (textToJson.startsWith("[")) {
    // Controllo aggiuntivo per array JSON (che non usano graffe)
    const firstBracket = textToJson.indexOf("[");
    const lastBracket = textToJson.lastIndexOf("]");
    if (
      firstBracket !== -1 &&
      lastBracket !== -1 &&
      lastBracket > firstBracket
    ) {
      rawJsonContent = textToJson
        .substring(firstBracket, lastBracket + 1)
        .trim();
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
    const startIndex = textToJson.indexOf(startDelimiter);

    if (startIndex !== -1) {
      const contentStart = startIndex + startDelimiter.length;
      const contentEnd = textToJson.lastIndexOf(endDelimiter);

      if (contentEnd > contentStart) {
        // Estrae e verifica che assomigli a JSON
        const tempContent = textToJson
          .substring(contentStart, contentEnd)
          .trim();
        if (tempContent.startsWith("{") || tempContent.startsWith("[")) {
          rawJsonContent = tempContent;
        }
      }
    }
  }

  // **************** VALIDAZIONE E SANIFICAZIONE FINALE ****************

  if (!rawJsonContent) {
    return { rawJsonContent: null, contentFile };
  }

  // Tentativo A: Standard JSON (più veloce)
  try {
    JSON.parse(rawJsonContent);
    return { rawJsonContent, contentFile }; // Già valido
  } catch (e) {
    // Tentativo B: JSON5 (per correggere errori comuni di LLM)
    try {
      const parsedObject = JSON5.parse(rawJsonContent);
      // Normalizza e restituisce una stringa JSON rigorosa
      return { rawJsonContent: JSON.stringify(parsedObject), contentFile };
    } catch (e5) {
      // Se fallisce anche JSON5, si può provare un'ultima pulizia mirata
      // per rimuovere i delimitatori Markdown non escapati, che possono rompere JSON5.
      let aggressivelyCleaned = rawJsonContent
        .replace(/```json/g, "")
        .replace(/```/g, "");
      try {
        const parsedObject = JSON5.parse(aggressivelyCleaned);
        return { rawJsonContent: JSON.stringify(parsedObject), contentFile };
      } catch (eFinal) {
        // Fallimento definitivo
        return { rawJsonContent: null, contentFile };
      }
    }
  }
};
