// src/utils/aiService.js

import * as claudeClient from "./claudeClient";
import * as geminiClient from "./geminiClient";

/**
 * Testa la validità della chiave API per il provider selezionato.
 * @param {'claude'|'gemini'} provider - Il provider AI selezionato.
 * @param {string} apiKey - La chiave API da testare.
 * @param {string} modelName - Il nome del modello da usare per il test.
 * @returns {Promise<boolean>} True se la chiave è valida, False altrimenti.
 */
export async function testAPIKey(provider, apiKey, modelName) {
  if (provider === "claude") {
    return claudeClient.testAPIKey(apiKey, modelName);
  }
  if (provider === "gemini") {
    return geminiClient.testAPIKey(apiKey, modelName);
  }
  return false;
}

/**
 * Sends a request to the selected AI provider for a chat completion.
 * @param {'claude'|'gemini'} provider - Il provider AI selezionato.
 * @param {Array<Object>} messages - The conversation history in Anthropic format.
 * @param {string} apiKey - La chiave API del provider.
 * @param {string} modelName - Il nome del modello LLM da usare.
 * @param {boolean} stream - Whether to stream the response.
 * @param {function} onChunk - Callback for streaming text chunks: (text: string) => void.
 * @returns {Promise<Object|void>} The final response object for non-streaming, or void for streaming.
 */
export async function getChatCompletion({
  provider,
  messages,
  apiKey,
  modelName,
  stream = false,
  onChunk = () => {},
  maxTokens = 8192,
  signal, // Aggiunto il parametro signal
}) {
  try {
    if (provider === "claude") {
      // Anthropic non accetta messaggi con role: 'system' nell'array messages.
      // Estraiamo il system prompt e lo passiamo separatamente.
      let systemPrompt = undefined;
      const cleanMessages = messages.filter((m) => {
        if (m.role === "system") {
          systemPrompt = m.content;
          return false;
        }
        return true;
      });

      return await claudeClient.getChatCompletion({
        messages: cleanMessages,
        apiKey,
        modelName,
        stream,
        onChunk,
        system: systemPrompt,
        signal, // Passato al client Claude
      });
    }
    if (provider === "gemini") {
      return await geminiClient.getChatCompletion({
        messages,
        apiKey,
        modelName,
        stream,
        onChunk,
        maxTokens,
        signal, // Passato al client Gemini
      });
    }
    throw new Error(`AI Provider non supportato: ${provider}`);
  } catch (error) {
    // Questo è il punto cruciale. Qualsiasi errore catturato dai client
    // (incluso AbortError) viene intercettato qui e rilanciato.
    // Questo garantisce che la Promise restituita da questa funzione sia
    // correttamente rifiutata, permettendo al catch in useAIStore di funzionare.
    throw error;
  }
}
