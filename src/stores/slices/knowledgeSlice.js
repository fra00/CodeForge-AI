import { KnowledgeService } from "../../services/knowledgeService";
import { getValidMessages, normalizePath } from "../logic/aiLoopLogic";
import { useFileStore } from "../useFileStore";

export const createKnowledgeSlice = (set, get) => ({
  updateChatKnowledge: async (chatId) => {
    const state = get();
    const chat = state.conversations.find((c) => c.id === chatId);

    if (!chat || chat.isSummarizing) return;

    set((s) => ({
      conversations: s.conversations.map((c) =>
        c.id === chatId ? { ...c, isSummarizing: true } : c
      ),
    }));

    try {
      const validMessages = getValidMessages(chat.messages);
      const messagesToSummarize = validMessages.filter((m) => !m.isSummarized);
      const messageIdsToSummarize = messagesToSummarize.map((m) => m.id);

      if (messagesToSummarize.length === 0) {
        set((s) => ({
          conversations: s.conversations.map((c) =>
            c.id === chatId ? { ...c, isSummarizing: false } : c
          ),
        }));
        return;
      }

      const newSummary = await KnowledgeService.summarizeKnowledge(
        chat.knowledgeSummary,
        messagesToSummarize
      );

      set((s) => ({
        conversations: s.conversations.map((c) => {
          if (c.id === chatId) {
            const updatedMessages = c.messages.map((m) =>
              messageIdsToSummarize.includes(m.id)
                ? { ...m, isSummarized: true }
                : m
            );

            let lastSummarizedIndex = -1;
            updatedMessages.forEach((m, idx) => {
              if (messageIdsToSummarize.includes(m.id)) {
                lastSummarizedIndex = idx;
              }
            });

            let finalMessages = [...updatedMessages];
            if (lastSummarizedIndex !== -1) {
              const summaryMarker = {
                id: `summary-marker-${Date.now()}`,
                role: "status",
                content: "🧠 Knowledge Cache Updated",
                isSummarized: true,
              };
              finalMessages.splice(lastSummarizedIndex + 1, 0, summaryMarker);
            }

            return {
              ...c,
              knowledgeSummary: newSummary,
              messages: finalMessages,
              isSummarizing: false,
            };
          }
          return c;
        }),
      }));

      // Importante: Persistiamo immediatamente le modifiche (sommario e marker) nel DB
      await get().saveConversation(chatId);

      // --- VFS PERSISTENCE (CACHE) ---
      // Salviamo il knowledge e i tag nel VFS per rendere il progetto portabile (zip)
      try {
        const fileStore = useFileStore.getState();

        // 1. Save Knowledge Summary (.md)
        const knowledgePath = ".llmContext/cache/knowledge.md";

        if (fileStore.applyFileActions) {
          const knowledgeExists = Object.values(fileStore.files).some(
            (f) => normalizePath(f.path) === normalizePath(knowledgePath)
          );
          const kAction = knowledgeExists ? "update_file" : "create_file";

          fileStore.applyFileActions(
            kAction,
            {
              path: knowledgePath,
              content: newSummary,
            },
            { primary: ["system"] }
          );

          // 2. Save Tags (.json)
          const tagsPath = ".llmContext/cache/tags.json";
          const tagsExists = Object.values(fileStore.files).some(
            (f) => normalizePath(f.path) === normalizePath(tagsPath)
          );
          const tAction = tagsExists ? "update_file" : "create_file";

          const allFiles = fileStore.files;
          const tagsMap = {};
          Object.values(allFiles).forEach((f) => {
            if (f.tags && Object.keys(f.tags).length > 0) {
              tagsMap[f.path] = f.tags;
            }
          });

          fileStore.applyFileActions(
            tAction,
            {
              path: tagsPath,
              content: JSON.stringify(tagsMap, null, 2),
            },
            { primary: ["system"] }
          );
        }
      } catch (vfsError) {
        console.warn("[Knowledge] Failed to persist to VFS:", vfsError);
      }
    } catch (error) {
      console.error("Failed to update chat knowledge:", error);
      set((s) => ({
        conversations: s.conversations.map((c) =>
          c.id === chatId ? { ...c, isSummarizing: false } : c
        ),
      }));
    }
  },
});
