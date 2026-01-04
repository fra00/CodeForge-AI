/**
 * Generates the Router Prompt for intent classification.
 * This lightweight prompt decides if the user needs the full coding assistant or just a chat response.
 * @param {string} userMessage - The user's input message.
 * @returns {string} The router prompt.
 */
export const getRouterPrompt = (userMessage) => {
  return `You are a semantic router for a coding assistant. Analyze the user's input and classify the intent.

RULES:
1. If the input is a greeting, small talk, or a general question NOT related to coding, the project, or technology -> Return JSON: {"intent": "general", "reply": "Your friendly response here"}
2. If the input is about coding, the project, files, debugging, refactoring, or technical concepts -> Return JSON: {"intent": "project"}

USER INPUT: "${userMessage}"

RESPONSE (JSON ONLY):`;
};
