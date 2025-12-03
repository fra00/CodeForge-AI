// src/stores/ai/responseSchema.js

/**
 * Schema JSON per la validazione della risposta dell'AI.
 * Definisce la struttura che l'AI deve seguire per le sue risposte,
 * abilitando azioni strutturate come la manipolazione di file e l'uso di tool.
 * @returns {object} L'oggetto JSON Schema.
 */
export const getResponseSchema = () => ({
  type: "object",
  properties: {
    action: {
      type: "string",
      enum: [
        "create_file",
        "update_file",
        "delete_file",
        "text_response",
        "tool_call",
        "start_multi_file",
        "continue_multi_file",
      ],
    },
    files: {
      type: "array",
      items: {
        type: "object",
        properties: {
          path: { type: "string" },
          content: { type: "string" },
        },
        required: ["path"],
      },
    },
    file: {
      type: "object",
      properties: {
        path: { type: "string" },
        content: { type: "string" },
      },
      required: ["path"],
    },
    text_response: { type: "string" },
    message: { type: "string" },
    tool_call: {
      type: "object",
      properties: {
        function_name: {
          type: "string",
          enum: ["list_files", "read_file"],
        },
        args: {
          type: "object",
          properties: {
            path: { type: "string" },
            paths: { type: "array", items: { type: "string" } }, // Batch support
          },
        },
      },
      required: ["function_name", "args"],
    },
    plan: {
      type: "object",
      properties: {
        description: { type: "string" },
        files_to_modify: { type: "array", items: { type: "string" } },
      },
    },
  },
  required: ["action"],
});