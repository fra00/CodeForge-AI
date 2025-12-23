import { getAll, put, remove } from "../../utils/indexedDB";
import { SYSTEM_PROMPT } from "../ai/systemPrompt";

const CONVERSATIONS_STORE_NAME = "aiConversations";

const initialMessages = [
  {
    id: "system-prompt",
    role: "system",
    content: SYSTEM_PROMPT,
    isSummarized: true,
  },
  {
    id: "initial-assistant",
    role: "assistant",
    content:
      "Hello! I am Code Assistant, your AI software engineer assistant. How can I help you with your code today?",
    isSummarized: true,
  },
];

const createNewChat = (id) => ({
  id: id || Date.now().toString(),
  title: "Nuova Chat",
  messages: initialMessages,
  timestamp: new Date().toISOString(),
  environment: "web",
  knowledgeSummary: "",
  isSummarizing: false,
});

export const createChatSlice = (set, get) => ({
  conversations: [],
  currentChatId: null,

  getMessages: () => {
    const { conversations, currentChatId } = get();
    const currentChat = conversations.find((c) => c.id === currentChatId);
    return currentChat ? currentChat.messages : initialMessages;
  },

  loadConversations: async () => {
    try {
      const dbConversations = await getAll(CONVERSATIONS_STORE_NAME);
      let conversations =
        dbConversations.length > 0 ? dbConversations : [createNewChat("1")];

      // Data migration
      conversations = conversations.map((chat) => {
        const defaults = createNewChat(chat.id);
        return {
          ...defaults,
          ...chat,
          isSummarizing: false,
          messages: chat.messages.map((msg) => ({
            ...msg,
            isSummarized: msg.isSummarized === false ? false : true,
          })),
        };
      });

      conversations.sort(
        (a, b) => new Date(a.timestamp) - new Date(b.timestamp)
      );
      const currentChatId = conversations[conversations.length - 1].id;
      set({ conversations, currentChatId });
    } catch (e) {
      console.error("Failed to load AI conversations from IndexedDB:", e);
      set({ conversations: [createNewChat("1")], currentChatId: "1" });
    }
  },

  saveConversation: async (chatId = null) => {
    const { conversations, currentChatId } = get();
    const targetId = chatId || currentChatId;
    const chatToSave = conversations.find((c) => c.id === targetId);
    if (!chatToSave) return;
    const messagesToSave = chatToSave.messages.filter(
      (m) => m.role !== "system"
    );
    if (messagesToSave.length === 0) return;
    try {
      if (chatToSave.title === "Nuova Chat" && messagesToSave.length > 0) {
        const firstUserMessage = messagesToSave.find((m) => m.role === "user");
        if (firstUserMessage) {
          chatToSave.title = firstUserMessage.content.substring(0, 30) + "...";
        }
      }
      const updatedChat = {
        ...chatToSave,
        messages: messagesToSave,
        timestamp: new Date().toISOString(),
      };

      const { isSummarizing, ...chatToPersist } = updatedChat;
      await put(CONVERSATIONS_STORE_NAME, chatToPersist);

      set((state) => ({
        conversations: state.conversations.map((c) =>
          c.id === updatedChat.id ? updatedChat : c
        ),
      }));
    } catch (e) {
      console.error("Failed to save AI conversation to IndexedDB:", e);
    }
  },

  newChat: () => {
    const newChat = createNewChat();
    get().clearContextFiles();
    set((state) => ({
      conversations: [...state.conversations, newChat],
      currentChatId: newChat.id,
      error: null,
    }));
  },

  selectChat: (chatId) => {
    set({ currentChatId: chatId, error: null });
  },

  deleteChat: async (chatId) => {
    const { conversations } = get();
    if (conversations.length === 1) {
      get().clearConversation();
      return;
    }
    try {
      await remove(CONVERSATIONS_STORE_NAME, chatId);
      set((state) => {
        const newConversations = state.conversations.filter(
          (c) => c.id !== chatId
        );
        let newCurrentChatId = state.currentChatId;
        if (state.currentChatId === chatId) {
          newCurrentChatId = newConversations[newConversations.length - 1].id;
        }
        return {
          conversations: newConversations,
          currentChatId: newCurrentChatId,
          error: null,
        };
      });
    } catch (e) {
      set({ error: e.message });
    }
  },

  clearConversation: () => {
    const { currentChatId } = get();
    get().clearContextFiles();
    set((state) => ({
      conversations: state.conversations.map((chat) => {
        if (chat.id === currentChatId) {
          return { ...chat, messages: initialMessages };
        }
        return chat;
      }),
      error: null,
    }));
  },

  deleteMessage: async (messageId) => {
    const messages = get().getMessages();
    if (messages.length <= 2 || messageId === "system-prompt") {
      console.warn("Cannot delete the last message or the system prompt.");
      return;
    }

    set((state) => ({
      conversations: state.conversations.map((chat) => {
        if (chat.id === state.currentChatId) {
          return {
            ...chat,
            messages: chat.messages.filter((m) => m.id !== messageId),
          };
        }
        return chat;
      }),
    }));

    await get().saveConversation();
  },

  addMessage: (message) => {
    const state = get();
    if (
      !message ||
      !message.content ||
      typeof message.content !== "string" ||
      message.content.toString().trim() === ""
    ) {
      console.warn("⚠️ [useAIStore] Messaggio vuoto scartato:", message);
      return;
    }

    const messageWithFlag = { ...message, isSummarized: false };
    const currentChatId = state.currentChatId;

    set((currentState) => {
      const newConversations = currentState.conversations.map((chat) => {
        if (chat.id === currentChatId) {
          return {
            ...chat,
            messages: [...chat.messages, messageWithFlag],
          };
        }
        return chat;
      });
      return { conversations: newConversations, error: null };
    });
  },

  setKnowledgeSummary: (chatId, summary) => {
    set((state) => ({
      conversations: state.conversations.map((c) =>
        c.id === chatId ? { ...c, knowledgeSummary: summary } : c
      ),
    }));
    get().saveConversation(chatId);
  },
});
