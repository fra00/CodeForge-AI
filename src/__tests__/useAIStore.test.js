import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { useAIStore } from "../stores/useAIStore";
import { useSettingsStore } from "../stores/useSettingsStore";

// Mock delle dipendenze esterne
vi.mock("../utils/indexedDB", () => ({
  getAll: vi.fn(() => Promise.resolve([])),
  put: vi.fn(() => Promise.resolve()),
  remove: vi.fn(() => Promise.resolve()),
}));

// Mock di KnowledgeService per evitare errori di importazione o esecuzione
vi.mock("../services/knowledgeService", () => ({
  KnowledgeService: {
    summarizeKnowledge: vi.fn(() => Promise.resolve("Mock Summary")),
  },
}));

describe("useAIStore - Knowledge Cache Trigger", () => {
  let originalFetch;

  beforeEach(() => {
    originalFetch = window.fetch;
    // Mock fetch per prevenire chiamate API reali e forzare un fallimento veloce
    // (la logica di trigger è nel finally, quindi viene eseguita anche se fetch fallisce)
    window.fetch = vi.fn(() =>
      Promise.reject(new Error("Network error (mocked)"))
    );

    // Reset AI Store
    useAIStore.setState({
      conversations: [],
      currentChatId: null,
      isStreaming: false,
      error: null,
    });
    // Inizializza una nuova chat
    useAIStore.getState().newChat();

    // Configura Settings Store per il test
    useSettingsStore.setState({
      isKnowledgeCacheEnabled: true,
      knowledgeCacheThreshold: 1, // Trigger dopo 1 solo messaggio
    });
  });

  afterEach(() => {
    window.fetch = originalFetch;
  });

  it("should call updateChatKnowledge when message count exceeds threshold", async () => {
    const store = useAIStore.getState();

    // Spy su updateChatKnowledge
    // Sostituiamo la funzione nello stato con un mock per verificare se viene chiamata
    const updateChatKnowledgeMock = vi.fn();
    useAIStore.setState({ updateChatKnowledge: updateChatKnowledgeMock });

    // Verifica stato iniziale
    const chat = store.conversations.find((c) => c.id === store.currentChatId);
    expect(chat).toBeDefined();

    // Invia un messaggio
    // Questo fallirà a livello di rete (fetch mockata), ma il blocco 'finally' dovrebbe eseguire il controllo cache
    await store.sendMessage(
      "Test message for cache trigger",
      {},
      "test-provider",
      "test-key",
      "test-model"
    );

    // Verifica aspettativa: updateChatKnowledge deve essere stato chiamato
    // perché threshold è 1 e abbiamo aggiunto 1 messaggio non sintetizzato
    expect(updateChatKnowledgeMock).toHaveBeenCalled();
    expect(updateChatKnowledgeMock).toHaveBeenCalledWith(store.currentChatId);
  });

  it("should NOT call updateChatKnowledge if threshold is not reached", async () => {
    // Imposta soglia alta
    useSettingsStore.setState({
      knowledgeCacheThreshold: 5,
    });

    const store = useAIStore.getState();
    const updateChatKnowledgeMock = vi.fn();
    useAIStore.setState({ updateChatKnowledge: updateChatKnowledgeMock });

    await store.sendMessage(
      "Test message",
      {},
      "test-provider",
      "test-key",
      "test-model"
    );

    expect(updateChatKnowledgeMock).not.toHaveBeenCalled();
  });

  it("should NOT call updateChatKnowledge if feature is disabled", async () => {
    useSettingsStore.setState({
      isKnowledgeCacheEnabled: false,
      knowledgeCacheThreshold: 1,
    });

    const store = useAIStore.getState();
    const updateChatKnowledgeMock = vi.fn();
    useAIStore.setState({ updateChatKnowledge: updateChatKnowledgeMock });

    await store.sendMessage(
      "Test message",
      {},
      "test-provider",
      "test-key",
      "test-model"
    );

    expect(updateChatKnowledgeMock).not.toHaveBeenCalled();
  });
});
