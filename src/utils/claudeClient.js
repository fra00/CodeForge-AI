// src/utils/aiClient.js

const ANTHROPIC_API_URL = "https://api.anthropic.com/v1/messages";
const DEFAULT_MODEL_NAME = "claude-3-5-sonnet-20240620";

/**
 * Testa la validità di una chiave API inviando una richiesta minima.
 * @param {string} apiKey - La chiave API da testare.
 * @param {string} modelName - Il nome del modello da usare per il test.
 * @returns {Promise<boolean>} True se la chiave è valida, False altrimenti.
 */
export async function testAPIKey(apiKey, modelName = DEFAULT_MODEL_NAME) {
  if (!apiKey) return false;

  try {
    const response = await fetch(ANTHROPIC_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: DEFAULT_MODEL_NAME,
        max_tokens: 1,
        messages: [{ role: "user", content: "test" }],
      }),
    });

    // 401 (Unauthorized) è il codice tipico per chiave non valida
    if (response.status === 401) {
      return false;
    }
    // Qualsiasi altro codice 4xx/5xx è un errore, ma 200 è successo
    return response.ok;
  } catch (error) {
    // Errore di rete, non possiamo determinare la validità della chiave
    console.error("Network error during API key test:", error);
    return false;
  }
}

/**
 * Sends a request to the Anthropic API for a chat completion.
 * @param {Array<Object>} messages - The conversation history in Anthropic format (e.g., [{ role: 'user', content: '...' }]).
 * @param {string} apiKey - La chiave API di Anthropic.
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
  signal,
}) {
  if (!apiKey) {
    throw new Error("Anthropic API key is not set in settings.");
  }

  const headers = {
    "Content-Type": "application/json",
    "x-api-key": apiKey,
    "anthropic-version": "2023-06-01",
  };

  const body = {
    model: modelName,
    max_tokens: 4096,
    messages: messages,
    stream: stream,
    ...(responseSchema && {
      response_format: { type: "json", schema: responseSchema },
    }),
  };

  try {
    const response = await fetch(ANTHROPIC_API_URL, {
      method: "POST",
      headers: headers,
      body: JSON.stringify(body),
      signal: signal,
    });

    if (!response.ok) {
      let errorData = { error: { message: "Unknown error" } };
      try {
        errorData = await response.json();
      } catch (e) {
        // Ignore JSON parsing error if response body is not JSON
      }
      throw new Error(
        `Anthropic API error: ${response.status} - ${errorData.error.message}`
      );
    }

    if (stream) {
      const reader = response.body.getReader();
      const decoder = new TextDecoder("utf-8");
      let buffer = "";

      // eslint-disable-next-line no-constant-condition
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        // Process all complete lines in the buffer
        const lines = buffer.split("\n");
        buffer = lines.pop(); // Keep the last (potentially incomplete) line in the buffer

        for (const line of lines) {
          const trimmedLine = line.trim();
          if (trimmedLine.startsWith("data:")) {
            try {
              const json = JSON.parse(trimmedLine.substring(5).trim());

              if (
                json.type === "content_block_delta" &&
                json.delta.type === "text_delta"
              ) {
                onChunk(json.delta.text);
              } else if (json.type === "message_stop") {
                // Stream finished
                return;
              }
            } catch (e) {
              console.error(
                "Error parsing stream chunk:",
                e,
                "Line:",
                trimmedLine
              );
            }
          }
        }
      }
      // If the stream ends and there's still content in the buffer, it's an incomplete line.
      if (buffer.trim().length > 0) {
        console.warn("Incomplete stream buffer remaining:", buffer);
      }
    } else {
      // Non-streaming response
      return response.json();
    }
  } catch (error) {
    // Se l'errore è un annullamento, non è un vero errore.
    // Lo rilanciamo silenziosamente per farlo gestire dal chiamante (useAIStore).
    if (error.name === "AbortError") {
      throw error;
    }
    // Per tutti gli altri errori, li logghiamo e li rilanciamo.
    console.error("Claude Client Error:", error);
    throw error; // Rilancia l'errore per farlo gestire a un livello superiore
  }
}
