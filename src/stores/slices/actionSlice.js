import { useFileStore } from "../useFileStore";
import { useTestRunner } from "../../hooks/useTestRunner";
import { normalizePath } from "../logic/aiLoopLogic";

export const createActionSlice = (set, get) => ({
  multiFileTaskState: null,

  _handleTextResponse: (text_response) => {
    const { addMessage } = get();
    const finalContent = text_response || "✅ Done.";
    addMessage({
      id: Date.now().toString(),
      role: "assistant",
      content: finalContent,
    });
    return Promise.resolve(false);
  },

  _handleToolCall: (tool_call) => {
    const { addMessage } = get();
    const fileStore = useFileStore.getState();

    const isBatchRead =
      tool_call.function_name === "read_file" &&
      Array.isArray(tool_call.args.paths);
    const logArgs = isBatchRead
      ? `(Batch: ${tool_call.args.paths.length} files)`
      : `(Args: ${JSON.stringify(tool_call.args)})`;

    addMessage({
      id: `${Date.now()}-tool-status`,
      role: "status",
      content: `Executing: ${tool_call.function_name} ${logArgs}`,
    });

    let toolResult = "";
    try {
      if (isBatchRead) {
        const paths = tool_call.args.paths;
        const results = paths.map((path) => {
          try {
            const singleResult = fileStore.executeToolCall({
              function_name: "read_file",
              args: { path },
            });
            return `--- FILE: ${path} ---\n${singleResult || "(Empty File)"}`;
          } catch (err) {
            return `--- ERROR READING FILE: ${path} ---\n${err.message}`;
          }
        });
        toolResult = results.join("\n\n");
      } else {
        toolResult = fileStore.executeToolCall(tool_call);
      }
    } catch (e) {
      toolResult = `Error executing tool: ${e.message}`;
    }

    if (!toolResult || toolResult.trim() === "") {
      toolResult = "[Action executed successfully, but returned no content]";
    }

    addMessage({
      id: `${Date.now()}-tool-res`,
      role: "user",
      content: `[Tool Result]\n${toolResult}`,
    });

    return Promise.resolve(true);
  },

  _handleStartMultiFile: async (plan, first_file, message) => {
    const { addMessage } = get();
    const fileStore = useFileStore.getState();

    set({
      multiFileTaskState: {
        plan: plan.description,
        allFiles: plan.files_to_modify,
        completedFiles: [],
        remainingFiles: plan.files_to_modify,
      },
    });
    addMessage({
      id: Date.now().toString(),
      role: "assistant",
      content: `Start Task: ${plan.description} + \n ${message}`,
    });

    try {
      const result = fileStore.applyFileActions(
        first_file.action,
        first_file.file,
        first_file.tags
      );
      addMessage({
        id: `${Date.now()}-res`,
        role: "file-status",
        content: result || "First file action completed.",
      });

      const currentPath = first_file.file.path;
      set((state) => ({
        multiFileTaskState: {
          ...state.multiFileTaskState,
          completedFiles: [currentPath],
          remainingFiles: state.multiFileTaskState.remainingFiles.filter(
            (f) => normalizePath(f) !== normalizePath(currentPath)
          ),
        },
      }));

      return true;
    } catch (e) {
      addMessage({
        id: Date.now().toString(),
        role: "assistant",
        content: `Error: ${e.message}`,
      });
      set({ multiFileTaskState: null });
      return false;
    }
  },

  _handleContinueMultiFile: async (next_file, message) => {
    const { addMessage } = get();
    const fileStore = useFileStore.getState();
    const taskState = get().multiFileTaskState;

    if (!taskState) {
      addMessage({
        id: `${Date.now()}-err`,
        role: "status",
        content: "⚠️ No active task state found.",
      });
      return false;
    }

    if (next_file.action === "noop" && next_file.is_last_file) {
      addMessage({
        id: `${Date.now()}-res`,
        role: "status",
        content: "Task marked as complete by AI.",
      });
      set({ multiFileTaskState: null });
      return false;
    }

    addMessage({
      id: `${Date.now()}-msg`,
      role: "assistant",
      content: `Continuing with ${next_file.file.path} \n ${message}`,
    });

    try {
      const result = fileStore.applyFileActions(
        next_file.action,
        next_file.file,
        next_file.tags
      );
      addMessage({
        id: `${Date.now()}-res`,
        role: "file-status",
        content: result || "Action completed.",
      });

      const currentPath = next_file.file.path;
      set((state) => ({
        multiFileTaskState: {
          ...state.multiFileTaskState,
          completedFiles: [
            ...state.multiFileTaskState.completedFiles,
            currentPath,
          ],
          remainingFiles: state.multiFileTaskState.remainingFiles.filter(
            (f) => normalizePath(f) !== normalizePath(currentPath)
          ),
        },
      }));
      return true;
    } catch (e) {
      addMessage({
        id: Date.now().toString(),
        role: "assistant",
        content: `Error: ${e.message}`,
      });
      set({ multiFileTaskState: null });
      return false;
    }
  },

  _handleRunTest: async (file) => {
    const { addMessage } = get();
    const runner = useTestRunner.getState();

    addMessage({
      id: `${Date.now()}-test-status`,
      role: "test-status",
      content: `Running tests${file ? ` on ${file}` : "..."}`,
    });

    try {
      const results = await runner.runTests(file);

      let output = `Test Results:\n`;
      output += `Status: ${results.numFailedTests === 0 ? "PASSED" : "FAILED"}\n`;
      output += `Passed: ${results.numPassedTests}, Failed: ${results.numFailedTests}, Total: ${results.numTotalTests}\n`;

      if (results.numFailedTests > 0) {
        output += `\nFailures:\n`;
        results.testResults.forEach((suite) => {
          suite.assertionResults.forEach((assertion) => {
            if (assertion.status === "fail") {
              output += `- ${assertion.fullName}: ${assertion.failureMessages.join(", ")}\n`;
            }
          });
        });
      }

      addMessage({
        id: `${Date.now()}-test-res`,
        role: "test-status",
        content: output,
      });

      return true;
    } catch (e) {
      addMessage({
        id: `${Date.now()}-test-err`,
        role: "test-status",
        content: `Error running tests: ${e.message}`,
      });
      return true;
    }
  },

  _handleParsedResponse: async (jsonObject) => {
    const {
      action,
      file,
      text_response,
      tool_call,
      plan,
      first_file,
      next_file,
      message,
    } = jsonObject;

    let shouldContinue = false;
    if (action === "text_response") {
      shouldContinue = await get()._handleTextResponse(text_response);
    } else if (action === "tool_call" && tool_call) {
      shouldContinue = await get()._handleToolCall(tool_call);
    } else if (action === "start_multi_file" && plan && first_file) {
      shouldContinue = await get()._handleStartMultiFile(
        plan,
        first_file,
        message
      );
    } else if (action === "continue_multi_file" && next_file) {
      shouldContinue = await get()._handleContinueMultiFile(next_file, message);
    } else if (action === "run_test") {
      const filePath =
        file?.path || (typeof file === "string" ? file : undefined);
      shouldContinue = await get()._handleRunTest(filePath);
    } else {
      console.warn("Unhandled action type:", action, jsonObject);
      get().addMessage({
        id: Date.now().toString(),
        role: "user",
        content: `[SYSTEM-ERROR] The action '${action}' is not a valid or recognized action. Please review the available actions and correct your response.`,
      });
      shouldContinue = false;
    }
    return shouldContinue;
  },
});
