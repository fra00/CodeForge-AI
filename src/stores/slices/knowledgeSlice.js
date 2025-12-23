import { KnowledgeService } from "../../services/knowledgeService";
import { getValidMessages } from "../logic/aiLoopLogic";

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
