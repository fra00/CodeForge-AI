export const createContextSlice = (set, get) => ({
  contextFiles: [],
  initialPrompt: null,

  addContextFile: (path) =>
    set((state) => {
      if (!state.contextFiles.includes(path)) {
        return { contextFiles: [...state.contextFiles, path] };
      }
      return state;
    }),

  removeContextFile: (path) =>
    set((state) => ({
      contextFiles: state.contextFiles.filter((p) => p !== path),
    })),

  clearContextFiles: () => set({ contextFiles: [] }),

  setInitialPrompt: (prompt) => set({ initialPrompt: prompt }),
  
  consumeInitialPrompt: () => {
    const prompt = get().initialPrompt;
    if (prompt) {
      set({ initialPrompt: null });
    }
    return prompt;
  },

  setChatEnvironment: (environment) => {
    set((state) => ({
      conversations: state.conversations.map((chat) =>
        chat.id === state.currentChatId ? { ...chat, environment } : chat
      ),
    }));
    get().saveConversation();
  },
});