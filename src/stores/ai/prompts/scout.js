import { getProjectStructurePrompt } from "./projectContext";

/**
 * Generates the Scout Prompt.
 * The Scout's job is to identify which files are relevant to the user's request
 * based ONLY on the file structure, without reading the contents yet.
 *
 * @param {string} userMessage - The user's request.
 * @param {object} fileStore - The file store to generate the project structure.
 * @param {string} [knowledgeSummary] - The project's long-term memory/map.
 * @param {string} [userContext] - Information about active/pinned files.
 * @param {string} [environment] - The current environment (web, node, etc.).
 * @returns {string} The prompt for the Scout.
 */
export const getScoutPrompt = (userMessage, fileStore, knowledgeSummary = "", userContext = "", environment = "web") => {
  const projectStructure = getProjectStructurePrompt(fileStore);
  
  const knowledgeSection = knowledgeSummary 
    ? `\n--- PROJECT KNOWLEDGE (Long-term Memory) ---\n${knowledgeSummary}\n` 
    : "";
    
  const contextSection = userContext 
    ? `\n--- CURRENT CONTEXT ---\n${userContext}\n` 
    : "";

  return `You are the "Scout" for a software engineering team.
Your goal is to identify which files from the project structure are relevant to the user's request.
Environment: ${environment}

${knowledgeSection}${contextSection}${projectStructure}

USER REQUEST: "${userMessage}"

INSTRUCTIONS:
1. Analyze the user request and the project structure.
2. Identify files that likely need to be read, modified, or analyzed to fulfill the request.
3. Look for direct mentions (e.g., "fix App.jsx") and indirect dependencies (e.g., "fix the header" -> Header.jsx, Header.css).
4. Return a JSON object with an array of "files".

EXAMPLE OUTPUT:
{
  "files": ["src/components/Header.jsx", "src/styles/header.css"]
}

If no specific files are relevant (e.g., a general question), return an empty array.

RESPONSE (JSON ONLY):`;
};
