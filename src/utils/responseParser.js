/**
 * Analizza una risposta testuale multi-parte dell'AI, strutturata con marcatori.
 * Estrae i dati da ogni blocco (es. #[json-data]...#[end-json-data]) e
 * li assembla in un unico oggetto JSON strutturato.
 *
 * @param {string} rawResponse - La stringa di testo completa ricevuta dall'AI.
 * @returns {object | null} Un oggetto JSON completo e "idratato" con i dati
 *                          dalle varie sezioni, o null se il parsing fallisce.
 */
export function parseMultiPartResponse(rawResponse) {
  if (!rawResponse || typeof rawResponse !== "string") {
    console.error(
      "Invalid input to parseMultiPartResponse: not a string or empty."
    );
    return null;
  }

  const sections = {};
  const regex = /#\[([a-z-]+)\]([\s\S]*?)#\[end-\1\]/g;
  let match;

  // 1. Estrai tutte le sezioni delimitate dai marcatori
  while ((match = regex.exec(rawResponse)) !== null) {
    // Converti nomi come 'json-data' in 'jsonData' per coerenza con le convenzioni JS
    const key = match[1].replace(/-(\w)/g, (_, c) => c.toUpperCase());
    const value = match[2].trim();
    sections[key] = value;
  }

  // 2. Verifica che la sezione JSON esista e sia valida
  if (!sections.jsonData) {
    // Fallback: se non ci sono marcatori JSON, controlliamo se è un JSON puro o testo libero.
    try {
      // Tentativo 1: È un JSON puro senza tag?
      return JSON.parse(rawResponse);
    } catch {
      // Tentativo 2: È testo libero. Lo incapsuliamo in una struttura text_response.
      // Questo rende il parser tollerante alle risposte "chat" dell'AI che non seguono il protocollo rigoroso.
      return {
        action: "text_response",
        text_response: rawResponse,
      };
    }
  }

  let jsonObject;
  try {
    jsonObject = JSON.parse(sections.jsonData);
  } catch (error) {
    console.error("JSON Parsing Error in #[json-data] block:", error);
    console.error("Invalid JSON string:", sections.jsonData);
    return null;
  }

  // 3. "Idrata" l'oggetto JSON con il contenuto delle altre sezioni
  if (sections.planDescription && jsonObject.plan) {
    jsonObject.plan.description = sections.planDescription;
  }

  if (sections.fileMessage) {
    jsonObject.message = sections.fileMessage;
  }

  if (sections.contentFile) {
    const target = jsonObject.first_file || jsonObject.next_file;
    if (target && target.file) {
      target.file.content = sections.contentFile;
    }
  }

  return jsonObject;
}