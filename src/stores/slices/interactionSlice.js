import { getChatCompletion } from "../../utils/aiService";
import { parseMultiPartResponse } from "../../utils/responseParser";
import {
  buildSystemPrompt,
  getProjectStructurePrompt,
} from "../ai/systemPromptCompact";
import { getRouterPrompt } from "../ai/prompts/intent";
import { getScoutPrompt } from "../ai/prompts/scout";
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

      // --- 0. INTENT CLASSIFICATION (ROUTER LAYER) ---
      // Facciamo una chiamata leggera per capire se serve l'Executor o basta una risposta chat.
      // Saltiamo questo step se c'è un task multi-file in corso (l'utente potrebbe dare feedback sul task).
      const isMultiFileInProgress = get().multiFileTaskState != null;

      let detectedIntent = "project"; // Default
      if (!isMultiFileInProgress && userMessage && userMessage.trim()) {
        try {
          const routerPrompt = getRouterPrompt(userMessage);
          // Usiamo una chiamata non-streaming per il router
          const routerResponse = await getChatCompletion({
            provider,
            apiKey,
            modelName, // Nota: Si potrebbe usare un modello "Flash" qui se disponibile nelle settings
            messages: [{ role: "user", content: routerPrompt }],
            stream: false,
            maxTokens: 8192, // Risposta breve
            responseSchema: null, // Schema libero
          });

          let routerResult = null;
          try {
            // Tentativo di parsing JSON dalla risposta del router
            const text = routerResponse.text || (routerResponse.content && routerResponse.content[0]?.text) || "";
            // Robust JSON extraction: find the first { ... } block
            const jsonMatch = text.match(/\{[\s\S]*\}/);
            const jsonString = jsonMatch ? jsonMatch[0] : text.replace(/```json|```/g, "").trim();
            routerResult = JSON.parse(jsonString);
          } catch (e) {
            console.warn("[Router] Failed to parse router response, defaulting to project intent.", e);
          }

          // Se l'intento è "general", rispondiamo subito e chiudiamo.
          // Se è "project", proseguiamo al prossimo step (Scout -> Executor)
          if (routerResult && routerResult.intent === "general" && routerResult.reply) {
            addMessage({
              id: Date.now().toString(),
              role: "assistant",
              content: routerResult.reply,
            });
            set({ isStreaming: false, abortController: null });
            await get().saveConversation();
            return; // STOP HERE - Non attivare l'Executor
          }
          if (routerResult?.intent) detectedIntent = routerResult.intent;

          // Se l'intento è "project" o il parsing fallisce, proseguiamo con il flusso standard.
        } catch (routerError) {
          console.error("[Router] Error during classification:", routerError);
          // In caso di errore del router, proseguiamo col flusso standard per sicurezza
        }
      }

      // --- 1. SCOUTING PHASE (FILE SELECTION) ---
      // Se l'intento è relativo al progetto, identifichiamo i file rilevanti PRIMA di chiamare l'Executor.
      // Questo evita il round-trip "read_file" iniziale.
      let scoutedFilesContent = "";
      
      if (detectedIntent === "project" && !isMultiFileInProgress && userMessage) {
        try {
          addMessage({ id: "scout-status", role: "status", content: "🔍 Scouting relevant files..." });
          
          // Prepare context for Scout
          const currentChat = get().conversations.find(c => c.id === currentChatId);
          const knowledgeSummary = currentChat?.knowledgeSummary || "";
          const environment = currentChat?.environment || "web";
          
          // Construct lightweight context hint
          let contextHint = "";
          if (context?.currentFile && context.currentFile !== "none") {
            contextHint += `Active file in editor: ${context.currentFile}\n`;
          }
          const pinnedFiles = get().contextFiles || [];
          if (pinnedFiles.length > 0) {
            contextHint += `Pinned files: ${pinnedFiles.join(", ")}\n`;
          }

          const scoutPrompt = getScoutPrompt(userMessage, fileStore, knowledgeSummary, contextHint, environment);
          const scoutResponse = await getChatCompletion({
            provider,
            apiKey,
            modelName, // Possiamo usare un modello veloce qui
            messages: [{ role: "user", content: scoutPrompt }],
            stream: false,
            maxTokens: 8192,
          });

          const text = scoutResponse.text || (scoutResponse.content && scoutResponse.content[0]?.text) || "";
          // Robust JSON extraction for Scout
          const scoutJsonMatch = text.match(/\{[\s\S]*\}/);
          const scoutJsonString = scoutJsonMatch ? scoutJsonMatch[0] : text.replace(/```json|```/g, "").trim();
          const scoutResult = JSON.parse(scoutJsonString);

          if (scoutResult && Array.isArray(scoutResult.files) && scoutResult.files.length > 0) {
            const foundFiles = [];
            const allFiles = Object.values(fileStore.files);
            
            scoutResult.files.forEach(path => {
              const fileNode = allFiles.find(f => normalizePath(f.path) === normalizePath(path));
              if (fileNode && !fileNode.isFolder) {
                foundFiles.push(`--- ${fileNode.path} ---\n${fileNode.content}`);
              }
            });

            if (foundFiles.length > 0) {
              scoutedFilesContent = foundFiles.join("\n\n");
              // Aggiorniamo lo status per l'utente
              set((state) => ({
                conversations: state.conversations.map(c => c.id === currentChatId ? {
                  ...c,
                  messages: c.messages.filter(m => m.id !== "scout-status") // Rimuovi status temporaneo
                } : c)
              }));
              addMessage({ 
                id: Date.now().toString(), 
                role: "status", 
                content: `📂 Context loaded: ${scoutResult.files.join(", ")}` 
              });
            }
          }
        } catch (scoutError) {
          console.warn("[Scout] Failed to identify files:", scoutError);
          // Fallback: procediamo senza file pre-caricati, l'Executor userà read_file se necessario
        }
      }

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
        let userProvidedContext = contextFiles
          .map((path) => {
            const file = allFiles.find((f) => f && f.path === path);
            if (file) {
              return `--- ${path} ---\n${file.content}`;
            }
            return `--- ${path} ---\n(File not found)`;
          })
          .join("\n\n");

        // Aggiungiamo i file trovati dallo Scout al contesto utente
        if (scoutedFilesContent) {
          userProvidedContext = (userProvidedContext ? userProvidedContext + "\n\n" : "") + scoutedFilesContent;
        }

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

        // --- ROBUST AUTO-CONTINUE STRATEGY ---
        let fullRawText = "";
        let isTruncated = false;
        let continueCount = 0;
        const MAX_CONTINUES = 5; // Circuit breaker

        do {
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

          let rawChunk = "";
          // Robust text extraction
          if (response.text) {
            rawChunk = response.text;
          } else if (
            Array.isArray(response.content) &&
            response.content[0]?.type === "text"
          ) {
            rawChunk = response.content[0].text;
          } else {
            rawChunk = JSON.stringify(response, null, 2);
          }

          isTruncated =
            response.truncated || response.stop_reason === "max_tokens";

          if (isTruncated) {
            if (continueCount >= MAX_CONTINUES) {
              addMessage({
                id: Date.now().toString(),
                role: "status",
                content:
                  "⚠️ Max continuation limit reached. File is too large.",
              });
              fullRawText += rawChunk; // Append what we have
              break;
            }

            // 1. SAFE POINT TRIMMING
            // Find the last newline to ensure we don't cut in the middle of a token/syntax
            const lastNewlineIndex = rawChunk.lastIndexOf("\n");
            let safeChunk = rawChunk;

            // Only trim if we found a newline and it's not the very end
            if (
              lastNewlineIndex > 0 &&
              lastNewlineIndex < rawChunk.length - 1
            ) {
              safeChunk = rawChunk.substring(0, lastNewlineIndex + 1);
            }

            fullRawText += safeChunk;

            // 2. CONTEXT TAIL INJECTION
            // Don't inject the whole file, just the tail to give context
            const TAIL_SIZE = 2000;
            const tail = safeChunk.slice(-TAIL_SIZE);

            messagesForLLM.push({ role: "assistant", content: tail });
            messagesForLLM.push({
              role: "user",
              content:
                "The previous assistant message ends EXACTLY with the text above.\nContinue writing from the NEXT character.\nDO NOT repeat any existing text.\nDO NOT restart or summarize.\nDO NOT modify previous content.",
            });

            continueCount++;
          } else {
            // Not truncated, append everything
            fullRawText += rawChunk;
          }
        } while (isTruncated);

        const jsonObject = parseMultiPartResponse(fullRawText);

        if (!jsonObject) {
          console.error("Failed to parse AI response.", fullRawText);
          addMessage({
            id: Date.now().toString(),
            role: "status",
            content:
              "⚠️ Error: Could not parse the response structure. Raw response:\n" +
              fullRawText,
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
