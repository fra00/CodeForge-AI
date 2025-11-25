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
      let stringJsonText = `{"action":"start_multi_file","plan":{"description":"Adding 'Prev' and 'Next' 
        buttons for session navigation, updating their visibility, and ensuring the turn timer resets upon 
        navigation.","files_to_modify":["timer-logic.js","styles.css","dom-handlers.js"]},"first_file":
        {"action":"update_files","file":{"path":"timer-logic.js","content":"window.App = window.App || {};
        \n\nwindow.App.timerLogic = (function(App) {\n let sessionTimerInterval = null;\n 
          let turnTimerInterval = null;\n\n function _startSessionTimer() {\n if (!sessionTimerInterval) 
            {\n sessionTimerInterval = setInterval(() => {\n App.state.sessionElapsedTime++;\n 
              App.domHandlers.updateSessionTimerDisplay(App.state.sessionElapsedTime);\n }, 1000);\n 
              console.log('TimerLogic: Session timer STARTED.');\n } else {\n console.log('TimerLogic: Session timer already running.');\n }
              \n }\n\n function startTurnTimer() {\n if (turnTimerInterval) clearInterval(turnTimerInterval); 
                // Clear any existing turn timer\n turnTimerInterval = setInterval(() => {\n if 
                // (App.state.currentTurnTimer > 0) {\n App.state.currentTurnTimer--;\n 
                // App.domHandlers.updateTurnTimerDisplay();\n } else {\n clearInterval(turnTimerInterval);\n 
                // turnTimerInterval = null;\n App.stateManager.setMessage('info', 'Time is up for the current participant!');\n 
                // App.domHandlers.updateTurnTimerDisplay(); // Ensure flashing state is applied\n }\n }, 1000);\n 
                // console.log('TimerLogic: Turn timer STARTED.');\n }\n\n function stopAllTimers() {\n 
                // if (sessionTimerInterval) {\n clearInterval(sessionTimerInterval);\n sessionTimerInterval = null;\n 
                // console.log('TimerLogic: Session timer STOPPED.');\n }\n if (turnTimerInterval) {\n 
                // clearInterval(turnTimerInterval);\n turnTimerInterval = null;\n 
                // console.log('TimerLogic: Turn timer STOPPED.');\n }\n }\n\n function startSession() 
                // {\n if (App.state.sessionStarted) {\n App.stateManager.setMessage('info', 'Session already active!');\n return;\n }\n 
                // console.log('TimerLogic: Attempting to start new session.');\n\n App.state.sessionStarted = true;\n 
                // App.state.sessionElapsedTime = 0; // Reset total time\n _startSessionTimer(); 
                // // Start the session timer (only once)\n\n const initialActiveSet = App.stateManager.setNextActiveName(); 
                // // This sets activeNameId and currentTurnTimer\n\n if (initialActiveSet) {\n startTurnTimer(); 
                // // Start the first turn timer\n App.stateManager.saveState();\n App.domHandlers.renderApp(); 
                // // Rerender to show active name, timers, and button states\n } else {\n 
                // // If no names are pending after setting up, immediately stop session\n App.state.sessionStarted = false;\n stopAllTimers(); 
                // // No active names, so no timers needed\n App.stateManager.setMessage('error', 'No pending names to start the session with.');\n 
                // App.domHandlers.renderApp();\n App.stateManager.saveState();\n }\n }\n\n function advanceTurn() 
                // {\n console.log('TimerLogic: Advancing turn.');\n // Only stop the turn timer, the session timer should 
                // continue\n if (turnTimerInterval) {\n clearInterval(turnTimerInterval);\n turnTimerInterval = null;\n 
                // console.log('TimerLogic: Current turn timer STOPPED.');\n }\n\n 
                // const currentActiveName = App.stateManager.getActiveName();\n if (currentActiveName) {\n 
                // // Mark the current active name as 'done' before advancing\n App.stateManager.updateNameStatus(currentActiveName.id, 'done');\n }\n\n 
                // const foundNext = App.stateManager.setNextActiveName();\n\n if (foundNext) {\n startTurnTimer(); 
                // // Start the new turn timer\n App.stateManager.saveState();\n App.domHandlers.renderApp(); 
                // // Rerender to update active name and timers\n } else {\n // No more pending names, session ends\n 
                // App.state.sessionStarted = false;\n App.state.activeNameId = null;\n stopAllTimers(); 
                // // Stop all timers (session and turn)\n App.stateManager.setMessage('success', 'All participants have had their turn! Session ended.');\n 
                // App.domHandlers.renderApp(); // Final render to show session ended state\n App.stateManager.saveState();\n }\n }\n\n 
                // return {\n startSession: startSession,\n stopAllTimers: stopAllTimers,\n advanceTurn: advanceTurn,\n startTurnTimer: startTurnTimer 
                // // Expose this for prev/next navigation\n };\n\n})(window.App);"},"message":"Exposing in for use by 
                // and fixing button labels/functionality."}}`;
      let exp = null;
      let stringSanitized = extractAndSanitizeJson(stringJsonText);
      exp = JSON.parse(stringSanitized);
      // expect(exp).toEqual(expectedJson);
    });
  });
});
