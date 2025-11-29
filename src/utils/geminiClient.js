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
 * @param {Object} [responseSchema] - Schema JSON per forzare l'output strutturato.
 * @returns {Promise<Object|void>} The final response object for non-streaming, or void for streaming.
 */
export async function getChatCompletion({
  messages,
  apiKey,
  modelName,
  stream = false,
  onChunk = () => {},
  responseSchema,
  maxTokens = 8192,
  signal, // Riceve il signal
}) {
  if (!apiKey) {
    throw new Error("Gemini API key is not set in settings.");
  }

  const ai = new GoogleGenAI({ apiKey });
  const geminiMessages = convertMessagesToGeminiFormat(messages);

  const config = {
    maxOutputTokens: maxTokens,
    ...(responseSchema && {
      responseMimeType: "application/json",
      responseSchema,
    }),
  };

  try {
    if (stream) {
      const responseStream = await ai.models.generateContentStream({
        model: modelName,
        contents: geminiMessages,
        config,
        signal,
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
        config,
        signal,
      });

      if (response.candidates[0].finishReason.toLowerCase() === "max_tokens") {
        console.warn("Gemini response truncated due to max tokens limit.");
        return { text: response.text, truncated: true };
      }

      if (response.text) {
        // Se è richiesto JSON, il testo è il JSON stesso
        return { text: response.text };
      }
      throw new Error("Gemini API response format error or empty response.");
    }
  } catch (error) {
    // Se l'errore è un annullamento, non è un vero errore.
    // Lo rilanciamo silenziosamente per farlo gestire dal chiamante (useAIStore).
    if (error.name === "AbortError") {
      throw error;
    }
    // Per tutti gli altri errori, li logghiamo e li rilanciamo.
    console.error("Gemini Client Error:", error);
    throw error; // Rilancia l'errore per farlo gestire a un livello superiore
  }
}
