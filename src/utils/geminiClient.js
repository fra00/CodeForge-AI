// src/utils/geminiClient.js

import { GoogleGenAI } from "@google/genai";

const DEFAULT_MODEL_NAME = "gemini-2.5-flash";

/**
 * Converte il formato messaggi Anthropic in formato Gemini.
 * Anthropic: [{ role: 'user', content: '...' }, { role: 'assistant', content: '...' }]
 * Gemini: [{ role: 'user', parts: [{ text: '...' }] }, { role: 'model', parts: [{ text: '...' }] }]
 * @param {Array<Object>} messages - Messaggi in formato Anthropic.
 * @returns {Array<Object>} Messaggi in formato Gemini.
 */
const convertMessagesToGeminiFormat = (messages) => {
  return messages.map((msg) => ({
    role: msg.role === "assistant" ? "model" : "user",
    parts: [{ text: msg.content }],
  }));
};

/**
 * Testa la validità di una chiave API inviando una richiesta minima.
 * @param {string} apiKey - La chiave API da testare.
 * @param {string} modelName - Il nome del modello da usare per il test.
 * @returns {Promise<boolean>} True se la chiave è valida, False altrimenti.
 */
export async function testAPIKey(apiKey, modelName = DEFAULT_MODEL_NAME) {
  if (!apiKey) return false;

  try {
    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model: modelName,
      contents: [{ role: "user", parts: [{ text: "test" }] }],
      config: {
        maxOutputTokens: 1,
      },
    });

    // Se la risposta è OK e non ci sono errori, la chiave è valida.
    // La libreria gestisce gli errori di autenticazione lanciando un'eccezione.
    return !!response.text;
  } catch (error) {
    console.error("Gemini API key test failed:", error);
    return false;
  }
}

/**
 * Sends a request to the Gemini API for a chat completion.
 * @param {Array<Object>} messages - The conversation history in Anthropic format.
 * @param {string} apiKey - La chiave API di Gemini.
 * @param {string} modelName - Il nome del modello LLM da usare.
 * @param {boolean} stream - Whether to stream the response.
 * @param {function} onChunk - Callback for streaming text chunks: (text: string) => void.
 * @returns {Promise<Object|void>} The final response object for non-streaming, or void for streaming.
 */
export async function getChatCompletion({
  messages,
  apiKey,
  modelName,
  stream = false,
  onChunk = () => {},
}) {
  if (!apiKey) {
    throw new Error("Gemini API key is not set in settings.");
  }

  const ai = new GoogleGenAI({ apiKey });
  const geminiMessages = convertMessagesToGeminiFormat(messages);

  try {
    if (stream) {
      const responseStream = await ai.models.generateContentStream({
        model: modelName,
        contents: geminiMessages,
      });

      for await (const chunk of responseStream) {
        if (chunk.text) {
          onChunk(chunk.text);
        }
      }
    } else {
      // Non-streaming response
      const response = await ai.models.generateContent({
        model: modelName,
        contents: geminiMessages,
      });

      if (response.text) {
        return { text: response.text };
      }
      throw new Error("Gemini API response format error or empty response.");
    }
  } catch (error) {
    console.error("Gemini Client Error:", error);
    // La libreria ufficiale lancia errori più specifici, li rilanciamo.
    throw error;
  }
}
