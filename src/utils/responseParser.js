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
    console.error("Parsing Error: Block #[json-data]...#[end-json-data] not found.");
    // Fallback: se non ci sono marcatori, prova a trattare l'intera risposta come JSON
    try {
      return JSON.parse(rawResponse);
    } catch {
      return null;
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