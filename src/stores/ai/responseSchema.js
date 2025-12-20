// src/stores/ai/responseSchema.js

/**
 * Schema JSON per la validazione della risposta dell'AI.
 * Definisce la struttura che l'AI deve seguire per le sue risposte,
 * abilitando azioni strutturate come la manipolazione di file e l'uso di tool.
 * @returns {object} L'oggetto JSON Schema.
 */
export const getResponseSchema = () => ({
  $schema: "http://json-schema.org/draft-07/schema#",
  title: "AI Response Schema",
  description: "Schema for validating the JSON response from the AI assistant.",

  definitions: {
    tagsObject: {
      type: "object",
      properties: {
        primary: { type: "array", items: { type: "string" } },
        technical: { type: "array", items: { type: "string" } },
        domain: { type: "array", items: { type: "string" } },
        patterns: { type: "array", items: { type: "string" } },
      },
      additionalProperties: false,
    },
    fileAction: {
      type: "object",
      properties: {
        action: { enum: ["create_file", "update_file", "delete_file", "noop"] },
        file: { $ref: "#/properties/file" },
        tags: { $ref: "#/definitions/tagsObject" }, // Riferimento ai tag
      },
      required: ["action", "file"],
    },
  },

  type: "object",
  properties: {
    action: {
      type: "string",
      enum: [
        "text_response",
        "tool_call",
        "start_multi_file",
        "continue_multi_file",
        "run_test",
      ],
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
    // message: { type: "string" },
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
        // description: { type: "string" },
        files_to_modify: {
          type: "array",
          items: { type: "string" },
          minItems: 1,
        },
      },
      required: ["description", "files_to_modify"],
    },
    first_file: { $ref: "#/definitions/fileAction" },
    next_file: { $ref: "#/definitions/fileAction" },
  },
  required: ["action"],

  // Aggiungiamo 'allOf' per una validazione condizionale più robusta
  allOf: [
    {
      if: { properties: { action: { const: "start_multi_file" } } },
      then: {
        properties: {
          action: { const: "start_multi_file" },
          plan: { $ref: "#/properties/plan" },
          first_file: { $ref: "#/definitions/fileAction" },
        },
        required: ["action", "plan", "first_file"],
      },
    },
    {
      if: { properties: { action: { const: "continue_multi_file" } } },
      then: {
        properties: {
          action: { const: "continue_multi_file" },
          next_file: { $ref: "#/definitions/fileAction" },
        },
        required: ["action", "next_file"],
      },
    },
  ],
});
