import { describe, it, expect, beforeEach, vi } from "vitest";
import { useAIStore } from "../stores/useAIStore";
import { KnowledgeService } from "../services/knowledgeService";

// Mock delle dipendenze esterne per l'ambiente di test
vi.mock("../utils/indexedDB", () => ({
  getAll: vi.fn(() => Promise.resolve([])),
  put: vi.fn(() => Promise.resolve()),
  remove: vi.fn(() => Promise.resolve()),
}));

vi.mock("../services/knowledgeService", () => ({
  KnowledgeService: {
    summarizeKnowledge: vi.fn(() => Promise.resolve("Mock Summary")),
  },
}));

describe("useAIStore Refactor Integration Tests", () => {
  beforeEach(() => {
    // Reset completo dello store prima di ogni test
    useAIStore.setState({
      conversations: [],
      currentChatId: null,
      contextFiles: [],
      isStreaming: false,
      error: null,
      multiFileTaskState: null,
      initialPrompt: null,
    });

    // Inizializza una chat di default per i test che ne hanno bisogno
    useAIStore.getState().newChat();
  });

  describe("Chat Slice", () => {
    it("should create a new chat and set it as current", () => {
      const store = useAIStore.getState();
      const initialChatId = store.currentChatId;

      store.newChat();

      const newChatId = useAIStore.getState().currentChatId;
      expect(newChatId).not.toBe(initialChatId);
      expect(useAIStore.getState().conversations.length).toBe(2);
    });

    it("should add a message to the current chat", () => {
      const store = useAIStore.getState();
      const msg = { role: "user", content: "Hello World" };

      store.addMessage(msg);

      const messages = store.getMessages();
      const lastMsg = messages[messages.length - 1];
      expect(lastMsg.content).toBe("Hello World");
      expect(lastMsg.role).toBe("user");
    });

    it("should delete a message", async () => {
      const store = useAIStore.getState();
      // Aggiungiamo un messaggio con ID specifico
      store.addMessage({
        id: "test-msg-1",
        role: "user",
        content: "Delete me",
      });

      let messages = store.getMessages();
      expect(messages.find((m) => m.id === "test-msg-1")).toBeDefined();

      await store.deleteMessage("test-msg-1");

      messages = store.getMessages();
      expect(messages.find((m) => m.id === "test-msg-1")).toBeUndefined();
    });

    it("should clear conversation (reset to initial state)", () => {
      const store = useAIStore.getState();
      store.addMessage({ role: "user", content: "User msg" });
      store.addMessage({ role: "assistant", content: "AI msg" });

      store.clearConversation();

      const messages = store.getMessages();
      // Dovrebbe rimanere solo il system prompt e il messaggio di benvenuto
      expect(messages.length).toBe(2);
      expect(messages[0].role).toBe("system");
    });
  });

  describe("Context Slice", () => {
    it("should manage context files correctly", () => {
      // Azione
      useAIStore.getState().addContextFile("/src/main.jsx");

      // Verifica sullo stato aggiornato
      expect(useAIStore.getState().contextFiles).toContain("/src/main.jsx");

      // Verifica prevenzione duplicati
      useAIStore.getState().addContextFile("/src/main.jsx");
      expect(useAIStore.getState().contextFiles.length).toBe(1);

      useAIStore.getState().removeContextFile("/src/main.jsx");
      expect(useAIStore.getState().contextFiles.length).toBe(0);
    });

    it("should clear all context files", () => {
      useAIStore.getState().addContextFile("a.js");
      useAIStore.getState().addContextFile("b.js");

      useAIStore.getState().clearContextFiles();
      expect(useAIStore.getState().contextFiles.length).toBe(0);
    });

    it("should handle initial prompt correctly", () => {
      const store = useAIStore.getState();

      store.setInitialPrompt("Start with this");
      expect(useAIStore.getState().initialPrompt).toBe("Start with this");

      const consumed = store.consumeInitialPrompt();
      expect(consumed).toBe("Start with this");
      expect(useAIStore.getState().initialPrompt).toBe(null);
    });
  });

  describe("Knowledge Slice", () => {
    it("should trigger knowledge synthesis and update chat state", async () => {
      const store = useAIStore.getState();

      // 1. Setup: Add messages that need summarization
      store.addMessage({
        id: "m1",
        role: "user",
        content: "User message 1",
        isSummarized: false,
      });
      store.addMessage({
        id: "m2",
        role: "assistant",
        content: "AI response 1",
        isSummarized: false,
      });

      // 2. Action: Call updateChatKnowledge directly
      await store.updateChatKnowledge(store.currentChatId);

      // 3. Assertions
      expect(KnowledgeService.summarizeKnowledge).toHaveBeenCalled();

      const updatedStore = useAIStore.getState();
      const chat = updatedStore.conversations.find(
        (c) => c.id === updatedStore.currentChatId
      );
      expect(chat.knowledgeSummary).toBe("Mock Summary");

      // Verify messages are marked as summarized
      const msg1 = chat.messages.find((m) => m.id === "m1");
      expect(msg1.isSummarized).toBe(true);

      // Verify marker insertion
      const marker = chat.messages.find(
        (m) =>
          m.role === "status" && m.content.includes("Knowledge Cache Updated")
      );
      expect(marker).toBeDefined();
    });

    it("should handle service errors gracefully (reset state without marking messages)", async () => {
      const store = useAIStore.getState();
      
      // 1. Setup: Add messages
      store.addMessage({ id: 'm-fail', role: 'user', content: 'Fail me', isSummarized: false });
      
      // 2. Mock failure
      KnowledgeService.summarizeKnowledge.mockRejectedValueOnce(new Error("Service Failure"));
      
      // 3. Action
      await store.updateChatKnowledge(store.currentChatId);
      
      // 4. Assertions
      const updatedStore = useAIStore.getState();
      const chat = updatedStore.conversations.find(c => c.id === updatedStore.currentChatId);
      
      // Should be false (reset)
      expect(chat.isSummarizing).toBe(false);
      
      // Messages should NOT be summarized (so they can be retried later)
      const msg = chat.messages.find(m => m.id === 'm-fail');
      expect(msg.isSummarized).toBe(false);
    });
  });

  describe("Action Slice (Internal Handlers)", () => {
    it("should handle text response correctly", async () => {
      const store = useAIStore.getState();

      // Simuliamo una risposta testuale dall'AI
      await store._handleTextResponse("AI says hello");

      const messages = store.getMessages();
      const lastMsg = messages[messages.length - 1];
      expect(lastMsg.role).toBe("assistant");
      expect(lastMsg.content).toBe("AI says hello");
    });
  });

  // Nota: Interaction Slice (sendMessage) è testato separatamente in useAIStore.test.js
  // con mock di fetch per verificare i trigger della cache.
});
