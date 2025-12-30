import { getChatCompletion } from "../../utils/aiService";
import { parseMultiPartResponse } from "../../utils/responseParser";
import {
  buildSystemPrompt,
  getProjectStructurePrompt,
} from "../ai/systemPromptCompact";
import { getResponseSchema } from "../ai/responseSchema";
import { FRAMEWORK_2WHAV_PROMPT } from "../ai/2whavPrompt";
import { useFileStore } from "../useFileStore";
import { useSettingsStore } from "../useSettingsStore";
import { getValidMessages, normalizePath } from "../logic/aiLoopLogic";
import Ajv from "ajv";

const ajv = new Ajv();
const schema = getResponseSchema();
const validateResponse = ajv.compile(schema);

const stoppingObject = { isStopping: false };

export const createInteractionSlice = (set, get) => ({
  isStreaming: false,
  error: null,
  abortController: null,

  stopGeneration: () => {
    console.log("[AIStore] Stop generation requested.");
    get().abortController?.abort();
    stoppingObject.isStopping = true;
  },

  sendMessage: async (
    userMessage,
    context,
    provider,
    apiKey,
    modelName,
    maxToolCalls = 20
  ) => {
    const { addMessage, currentChatId, contextFiles } = get();
    const fileStore = useFileStore.getState();

    if (!provider || !apiKey || !modelName) {
      set({
        error: "Missing required parameters: provider, apiKey, or modelName",
      });
      return;
    }

    if (!context || !context.currentFile || context.currentFile === "none") {
      const activePath = fileStore.activeFilePath;
      const activeFile = activePath
        ? fileStore.files.find((f) => f.path === activePath)
        : null;

      context = {
        language: activeFile?.language || "text",
        currentFile: activeFile?.path || "none",
        content: activeFile?.content || "",
      };
    }

    let toolCallCount = 0;

    try {
      if (userMessage && userMessage.trim()) {
        const newUserMessage = {
          id: Date.now().toString(),
          role: "user",
          content: userMessage.trim(),
        };

        set((state) => {
          const newConversations = state.conversations.map((chat) => {
            if (chat.id === currentChatId) {
              return {
                ...chat,
                messages: chat.messages.filter(
                  (m) => m.id !== "initial-assistant"
                ),
              };
            }
            return chat;
          });
          return { conversations: newConversations };
        });
        addMessage(newUserMessage);
      }

      const controller = new AbortController();
      set({
        isStreaming: true,
        error: null,
        abortController: controller,
      });
      const responseSchema = getResponseSchema();

      const startFilePath = context.currentFile;
      stoppingObject.isStopping = false;
      while (toolCallCount < maxToolCalls) {
        if (stoppingObject.isStopping) {
          console.log("[AIStore] Generation stopped by user.");
          addMessage({
            id: Date.now().toString(),
            role: "status",
            content: "⚠️ Generation stopped by user.",
          });
          break;
        }

        if (startFilePath && startFilePath !== "none") {
          const freshFile = Object.values(useFileStore.getState().files).find(
            (f) => f && normalizePath(f.path) === normalizePath(startFilePath)
          );

          if (freshFile) {
            context.content = freshFile.content;
          } else {
            context.content =
              "(File no longer exists at this path - possibly renamed or deleted)";
          }
        }

        const currentChat = get().conversations.find(
          (c) => c.id === currentChatId
        );
        const conversationHistory = currentChat ? currentChat.messages : []; // Fallback empty if no chat
        const knowledgeSummary = currentChat?.knowledgeSummary || "";
        const currentMultiFileState = get().multiFileTaskState;

        const allFiles = Object.values(useFileStore.getState().files);
        const userProvidedContext = contextFiles
          .map((path) => {
            const file = allFiles.find((f) => f && f.path === path);
            if (file) {
              return `--- ${path} ---\n${file.content}`;
            }
            return `--- ${path} ---\n(File not found)`;
          })
          .join("\n\n");

        const systemPromptWithContext = buildSystemPrompt(
          context,
          currentMultiFileState,
          { getState: get }, // Mock aiStore for buildSystemPrompt
          fileStore,
          userProvidedContext
        );

        const { knowledgeCacheThreshold } = useSettingsStore.getState();
        const historyLimit = knowledgeCacheThreshold || 10;

        const recentHistory =
          getValidMessages(conversationHistory).slice(-historyLimit);

        const messagesForLLM = [
          { role: "system", content: systemPromptWithContext },
        ];

        if (knowledgeSummary && knowledgeSummary.trim() !== "") {
          messagesForLLM.push({
            role: "user",
            content: `[CONTEXT] This is the project's conceptual map (our long-term memory). Use it as the primary source of truth for architectural decisions.\n\n--- CONCEPTUAL MAP ---\n${knowledgeSummary}`,
          });
        }

        messagesForLLM.push(...recentHistory);

        const response = await getChatCompletion({
          provider,
          apiKey,
          modelName,
          messages: messagesForLLM,
          stream: false,
          responseSchema,
          signal: controller.signal,
          maxTokens: 8192,
        });

        if (response.truncated || response.stop_reason === "max_tokens") {
          addMessage({
            id: Date.now().toString(),
            role: "status",
            content: "⚠️ Risposta troncata (limite token).",
          });
          set({ isStreaming: false });
          await get().saveConversation();
          return;
        }

        let rawText;
        // Gestisce la risposta del client Gemini: { text: '...' }
        if (response.text) {
          rawText = response.text;
          // Gestisce la risposta del client Claude: { content: [{ type: 'text', text: '...' }] }
        } else if (
          Array.isArray(response.content) &&
          response.content[0]?.type === "text"
        ) {
          rawText = response.content[0].text;
        } else {
          console.warn(
            "Unrecognized AI response structure. Stringifying.",
            response
          );
          rawText = JSON.stringify(response, null, 2);
        }

        const jsonObject = parseMultiPartResponse(rawText);

        if (!jsonObject) {
          console.error("Failed to parse AI response.", rawText);
          addMessage({
            id: Date.now().toString(),
            role: "status",
            content:
              "⚠️ Error: Could not parse the response structure. Raw response:\n" +
              rawText,
          });
          break;
        }

        console.log("Parsed AI Response JSON:", jsonObject);

        const isValid = validateResponse(jsonObject);
        if (!isValid) {
          const validationErrors = JSON.stringify(
            validateResponse.errors,
            null,
            2
          );
          console.error(
            "AI Response failed schema validation:",
            validationErrors
          );
          addMessage({
            id: Date.now().toString(),
            role: "user",
            content: `[SYSTEM-ERROR] Your response does not conform to the required JSON schema. Please correct it. Errors:\n${validationErrors}`,
          });
          break;
        }

        toolCallCount++;
        const shouldContinue = await get()._handleParsedResponse(jsonObject);

        if (shouldContinue) {
          continue;
        } else {
          break;
        }
      }

      if (toolCallCount >= maxToolCalls) {
        addMessage({
          id: Date.now().toString(),
          role: "status",
          content: `⚠️ Operation count limit reached ${maxToolCalls} calls.`,
        });
      }
    } catch (e) {
      console.error("Error in AI conversation:", e);
      set({ error: e.message });
      addMessage({
        id: Date.now().toString(),
        role: "assistant",
        content: `❌ Error: ${e.message}`,
      });
    } finally {
      set((state) => {
        const newConversations = state.conversations.map((chat) => {
          if (chat.id === state.currentChatId) {
            const updatedMessages = chat.messages.map((msg) => {
              if (
                ["file-status", "test-status", "content"].includes(msg.role)
              ) {
                return { ...msg, role: "status" };
              }
              if (
                msg.role === "user" &&
                msg.content.startsWith("[Tool Result]")
              ) {
                return { ...msg, role: "status" };
              }
              return msg;
            });
            return { ...chat, messages: updatedMessages };
          }
          return chat;
        });
        return { conversations: newConversations };
      });
      set({ isStreaming: false, abortController: null });
      addMessage({
        id: Date.now().toString(),
        role: "status",
        content: `✓ Task completed. Total tool calls: ${toolCallCount}.`,
      });
      await get().saveConversation();

      // --- TRIGGER KNOWLEDGE CACHE UPDATE ---
      const { isKnowledgeCacheEnabled, knowledgeCacheThreshold } =
        useSettingsStore.getState();
      const finalChat = get().conversations.find((c) => c.id === currentChatId);

      if (finalChat && isKnowledgeCacheEnabled && !finalChat.isSummarizing) {
        const validMessages = getValidMessages(finalChat.messages);
        const unsummarizedCount = validMessages.filter(
          (m) => !m.isSummarized
        ).length;

        if (unsummarizedCount >= knowledgeCacheThreshold) {
          get().updateChatKnowledge(currentChatId);
        }
      }
    }
  },

  extendPromptWith2WHAV: async (userPrompt, settings, mode = "[FULL]") => {
    const fileStore = useFileStore.getState();
    const { provider, apiKey, modelName, environment } = settings;

    if (!provider || !apiKey || !modelName) {
      const errorMsg = "Error: AI provider settings are not configured.";
      console.error(errorMsg);
      return errorMsg;
    }

    const projectStructure = getProjectStructurePrompt(fileStore);

    const specificationSystemPrompt = `You are a prompt engineering expert specializing in the 2WHAV framework. The current project environment is "${environment}".
Your task is to take a user's request and expand it into a detailed, structured prompt using the 2WHAV framework provided below.
Analyze the user's request and the provided project structure, identify the implicit requirements, and populate all relevant phases of the framework with specific file paths and details.
The final output should be ONLY the generated markdown prompt, ready to be used.`;

    const messages = [
      {
        role: "system",
        content: `${specificationSystemPrompt}\n\n${projectStructure}\n\n${FRAMEWORK_2WHAV_PROMPT}`,
      },
      {
        role: "user",
        content: `Apply 2WHAV ${mode} to: "${userPrompt}"`,
      },
    ];

    set({ isStreaming: true, error: null });

    try {
      const response = await getChatCompletion({
        provider,
        apiKey,
        modelName,
        messages,
        stream: false,
        maxTokens: 4096,
      });

      let extendedPrompt = "";
      if (response.text) {
        extendedPrompt = response.text;
      } else if (
        Array.isArray(response.content) &&
        response.content[0]?.type === "text"
      ) {
        extendedPrompt = response.content[0].text;
      } else if (response?.candidates?.[0]?.content?.parts?.[0]?.text) {
        extendedPrompt = response.candidates[0].content.parts[0].text;
      } else {
        extendedPrompt = typeof response === "string" ? response : "";
      }

      return extendedPrompt.trim();
    } catch (error) {
      console.error("Error extending prompt with 2WHAV:", error);
      return `Error during prompt extension: ${error.message}`;
    } finally {
      set({ isStreaming: false });
    }
  },
});
