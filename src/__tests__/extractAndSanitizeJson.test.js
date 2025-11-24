import { describe, it, expect } from "vitest";
import {
  removePreJsonText,
  removePostJsonText,
  extractJsonFromMarkdown,
} from "../stores/useAIStore";
import { extractAndSanitizeJson } from "../utils/extractAndSanitizeJson";

describe("response elaboration", () => {
  describe("extractAndSanitizeJson", () => {
    it("clean text before markdown json shuffler.js", () => {
      let stringJsonText = `{
        \"text\": "Now updating shuffler.js to integrate with the new state management functions and provide 
        an improved shuffle process.
        \`\`\`json\n{\n  \"action\": \"continue_multi_file\",\n  \"next_file\": {\n    
          \"action\": \"update_files\",\n    \"file\": {\n      \"path\": \"shuffler.js\",\n      
            \"content\": \"/**\n * shuffler.js\n * Handles the logic for shuffling names using the 
            Fisher-Yates algorithm\n * and providing a copy functionality for the shuffled list.\n */\n\n
            (function () {\n  const SHUFFLE_DELAY_MS = 600;\n\n  /**\n   * Implements the Fisher-Yates shuffle 
              algorithm.\n   * @param {Array<string>} array The array to shuffle.\n   * @returns {Array<string>}
               A new shuffled array.\n   */\n  function fisherYatesShuffle(array) 
               {\n    const shuffledArray = [...array];\n    let currentIndex = shuffledArray.length,\n      
                randomIndex;\n\n    // While there remain elements to shuffle.\n    
                // while (currentIndex !== 0) {\n      // Pick a remaining element.\n      
                // randomIndex = Math.floor(Math.random() * currentIndex);\n      currentIndex--;\n\n      
                // // And swap it with the current element.\n      
                // [shuffledArray[currentIndex], shuffledArray[randomIndex]] = 
                // [\n        shuffledArray[randomIndex],\n        shuffledArray[currentIndex],\n      ];\n    }\n
                //     return shuffledArray;\n  }\n\n  /**\n   * Initiates the shuffle process with a delay.\n   
                // * Updates the global state with the shuffled names.\n   * This function is now responsible for 
                // getting names from state, shuffling,\n   * and updating the state through \`window.App.setShuffledNames\`.
                // \n   * @returns {Promise<void>} A promise that resolves when shuffling is complete.\n   */\n  
                // async function shuffleAndSetNames() {\n    return new Promise(resolve => {\n      
                // const namesToShuffle = window.App.getValidNamesForShuffle();\n      
                // if (namesToShuffle.length === 0) {\n        // No names to shuffle, just resolve\n        
                // window.App.setShuffledNames([]);\n        resolve();\n        return;\n      }\n\n      
                // setTimeout(() => {\n        const shuffled = fisherYatesShuffle(namesToShuffle);\n        
                // const newShuffledState = shuffled.map((name) => ({\n          id: 'shuffled-' + Date.now() + '-' + 
                // Math.random().toString(36).substr(2, 9), // Unique ID for shuffled item\n          name: name,\n          
                // disabled: false, // Initially not disabled\n        }));\n        \n        
                // window.App.setShuffledNames(newShuffledState); // Update global state\n        resolve();\n      }, 
                // SHUFFLE_DELAY_MS);\n    });\n  }\n\n  /**\n   * Copies the shuffled and formatted names to the clipboard.\n
                //    * @returns {Promise<boolean>} A promise that resolves to true if copy was successful, false otherwise.\n
                //    */\n  async function copyShuffledNames() {\n    const shuffledNames = window.App.state.shuffledNames;\n 
                //    if (!shuffledNames || shuffledNames.length === 0) {\n      
                // // dom-handlers.js already checks this and shows message, but good to have here too.\n      
                // return false; \n    }\n\n    const formattedNames = shuffledNames\n      .map((item, index) => {\n       
                //  const status = item.disabled ? \" [Escluso]\" : \"\";\n        return \`index + 1 item.name status\`;\n
                //       })\n      .join(\"\\n\");\n\n    try {\n      await navigator.clipboard.writeText(formattedNames);\n 
                //      return true;\n    } catch (err) {\n      console.error(\"Errore durante la copia: \", err);\n      
                // return false;\n    }\n  }\n\n  // Expose shuffle functionality globally\n  if (!window.App) 
                // {\n    window.App = {};\n  }\n  window.App.shuffleNames = shuffleAndSetNames;\n  window.App.copyShuffledNames = copyShuffledNames;\n})();\n\"\n    }\n  },\n  \"message\": \"Now updating shuffler.js to integrate with the new state management 
                // functions and provide an improved shuffle process.\"\n}\n\`\`\`"
      }`;
      let exp = null;
      let stringSanitized = extractAndSanitizeJson(stringJsonText);
      exp = JSON.parse(stringSanitized);
      // expect(exp).toEqual(expectedJson);
    });
  });
});
