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
}) {
  if (provider === "claude") {
    return claudeClient.getChatCompletion({
      messages,
      apiKey,
      modelName,
      stream,
      onChunk,
    });
  }
  if (provider === "gemini") {
    return geminiClient.getChatCompletion({
      messages,
      apiKey,
      modelName,
      stream,
      onChunk,
      maxTokens,
    });
  }
  throw new Error(`AI Provider non supportato: ${provider}`);
}
