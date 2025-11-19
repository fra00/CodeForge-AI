// src/stores/useAIStore.js
import { create } from 'zustand';
import { getChatCompletion } from '../utils/aiService';
import { getAll, put, clear, remove } from '../utils/indexedDB';

const CONVERSATIONS_STORE_NAME = 'aiConversations';

const SYSTEM_PROMPT = `You are Kilo Code, a highly skilled software engineer AI assistant. Your primary function is to assist the user with code-related tasks, such as explaining code, refactoring, generating new code, or debugging.

When providing code, always use markdown code blocks.
Be concise, professional, and extremely helpful.
The user is working in a web-based code editor environment.`;

const initialMessages = [
  {
    id: 'system-prompt',
    role: 'system',
    content: SYSTEM_PROMPT,
  },
  {
    id: 'initial-assistant',
    role: 'assistant',
    content: 'Hello! I am Kilo Code, your AI software engineer assistant. How can I help you with your code today?',
  },
];

// Funzione helper per creare una nuova chat
const createNewChat = (id) => ({
  id: id || Date.now().toString(),
  title: 'Nuova Chat',
  messages: initialMessages,
  timestamp: new Date().toISOString(),
});

export const useAIStore = create((set, get) => ({
  // Stato per la gestione di più chat
  conversations: [], // Array di { id, title, messages, timestamp }
  currentChatId: null,
  isStreaming: false,
  error: null,

  // Funzione per ottenere i messaggi della chat corrente
  getMessages: () => {
    const { conversations, currentChatId } = get();
    const currentChat = conversations.find(c => c.id === currentChatId);
    return currentChat ? currentChat.messages : initialMessages;
  },

  /**
   * Carica tutte le conversazioni persistenti da IndexedDB.
   */
  loadConversations: async () => {
    try {
      const dbConversations = await getAll(CONVERSATIONS_STORE_NAME);
      let conversations = dbConversations.length > 0 ? dbConversations : [createNewChat('1')];
      
      // Ordina per timestamp e imposta l'ultima come attiva
      conversations.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
      const currentChatId = conversations[conversations.length - 1].id;

      set({ conversations, currentChatId });
    } catch (e) {
      console.error("Failed to load AI conversations from IndexedDB:", e);
      set({ conversations: [createNewChat('1')], currentChatId: '1' });
    }
  },

  /**
   * Salva la conversazione corrente su IndexedDB.
   */
  saveConversation: async () => {
    const { conversations, currentChatId } = get();
    const chatToSave = conversations.find(c => c.id === currentChatId);
    
    if (!chatToSave) return;

    // Non salvare il system prompt
    const messagesToSave = chatToSave.messages.filter(m => m.role !== 'system');
    
    if (messagesToSave.length === 0) return;

    try {
      // Aggiorna il titolo della chat se è ancora 'Nuova Chat' e ha messaggi
      if (chatToSave.title === 'Nuova Chat' && messagesToSave.length > 0) {
        const firstUserMessage = messagesToSave.find(m => m.role === 'user');
        if (firstUserMessage) {
          chatToSave.title = firstUserMessage.content.substring(0, 30) + '...';
        }
      }

      const updatedChat = {
        ...chatToSave,
        messages: messagesToSave,
        timestamp: new Date().toISOString(),
      };

      await put(CONVERSATIONS_STORE_NAME, updatedChat);
      
      // Aggiorna lo stato locale con la chat salvata
      set((state) => ({
        conversations: state.conversations.map(c =>
          c.id === updatedChat.id ? updatedChat : c
        ),
      }));

    } catch (e) {
      console.error("Failed to save AI conversation to IndexedDB:", e);
    }
  },

  /**
   * Crea una nuova chat e la imposta come attiva.
   */
  newChat: () => {
    const newChat = createNewChat();
    set((state) => ({
      conversations: [...state.conversations, newChat],
      currentChatId: newChat.id,
      error: null,
    }));
  },

  /**
   * Seleziona una chat esistente per renderla attiva.
   * @param {string} chatId - L'ID della chat da selezionare.
   */
  selectChat: (chatId) => {
    set({ currentChatId: chatId, error: null });
  },

  /**
   * Elimina una chat per ID.
   * @param {string} chatId - L'ID della chat da eliminare.
   */
  deleteChat: async (chatId) => {
    const { conversations, currentChatId } = get();
    
    if (conversations.length === 1) {
      // Non permettere l'eliminazione dell'ultima chat, resettala
      get().clearConversation();
      return;
    }

    try {
      await remove(CONVERSATIONS_STORE_NAME, chatId);
      
      set((state) => {
        const newConversations = state.conversations.filter(c => c.id !== chatId);
        let newCurrentChatId = state.currentChatId;

        if (state.currentChatId === chatId) {
          // Se la chat eliminata era quella attiva, selezionane un'altra
          newCurrentChatId = newConversations[newConversations.length - 1].id;
        }

        return {
          conversations: newConversations,
          currentChatId: newCurrentChatId,
          error: null,
        };
      });
    } catch (e) {
      console.error("Failed to delete AI conversation from IndexedDB:", e);
      set({ error: e.message });
    }
  },

  /**
   * Adds a message to the conversation history of the current chat.
   * @param {{role: 'user'|'assistant'|'system', content: string}} message
   */
  addMessage: (message) => set((state) => {
    const { currentChatId, conversations } = state;
    const newConversations = conversations.map(chat => {
      if (chat.id === currentChatId) {
        return {
          ...chat,
          messages: [...chat.messages, message],
        };
      }
      return chat;
    });

    return {
      conversations: newConversations,
      error: null,
    };
  }),

  /**
   * Resets the current conversation to the initial state.
   */
  clearConversation: () => {
    const { currentChatId } = get();
    set((state) => ({
      conversations: state.conversations.map(chat => {
        if (chat.id === currentChatId) {
          return {
            ...chat,
            messages: initialMessages,
          };
        }
        return chat;
      }),
      error: null,
    }));
    // La chat vuota verrà salvata al prossimo saveConversation
  },

  /**
   * Sends a user message to the AI provider and streams the response.
   * @param {string} userMessage - The content of the user's message.
   * @param {Object} context - Contesto del file attivo (language, currentFile, content).
   * @param {'claude'|'gemini'} provider - Il provider AI selezionato.
   * @param {string} apiKey - La chiave API del provider.
   * @param {string} modelName - Il nome del modello LLM da usare.
   */
  sendMessage: async (userMessage, context, provider, apiKey, modelName) => {
    const { addMessage, currentChatId, conversations } = get();

    // 1. Add user message to state
    const newUserMessage = { id: Date.now().toString(), role: 'user', content: userMessage };
    
    // Rimuovi il messaggio iniziale dell'assistente se presente, per iniziare la vera conversazione
    set((state) => {
      const { currentChatId, conversations } = state;
      const newConversations = conversations.map(chat => {
        if (chat.id === currentChatId) {
          return {
            ...chat,
            messages: chat.messages.filter(m => m.id !== 'initial-assistant'),
          };
        }
        return chat;
      });
      return { conversations: newConversations };
    });
    
    addMessage(newUserMessage);

    // 2. Start streaming and add a placeholder for the assistant's response
    set({ isStreaming: true, error: null });
    const assistantPlaceholder = { id: Date.now().toString(), role: 'assistant', content: '' };
    addMessage(assistantPlaceholder); // Usa addMessage per aggiungere il placeholder alla chat corrente

    try {
      // Costruisci la cronologia della conversazione in modo esplicito per garantire che includa i messaggi appena aggiunti
      const currentChat = conversations.find(c => c.id === currentChatId);
      const baseMessages = currentChat ? currentChat.messages : initialMessages;
      
      // La cronologia per l'API è la base + i due messaggi appena aggiunti
      const conversationHistory = [...baseMessages, newUserMessage, assistantPlaceholder];
      
      // Aggiungi il contesto del file al system prompt per la singola richiesta
      const systemPromptWithContext = `${SYSTEM_PROMPT}
      
      File Context:
      - Language: ${context.language}
      - File Name: ${context.currentFile}
      - Content:
      \`\`\`${context.language}
      ${context.content}
      \`\`\`
      `;
      
      // Sostituisci il system prompt con quello aggiornato per la singola richiesta
      const messagesWithContext = [
        { role: 'system', content: systemPromptWithContext },
        ...conversationHistory.filter(m => m.role !== 'system'),
      ];

      await getChatCompletion({
        provider,
        apiKey,
        modelName,
        messages: messagesWithContext,
        stream: true,
        onChunk: (text) => {
          set((state) => {
            const { currentChatId, conversations } = state;
            const newConversations = conversations.map(chat => {
              if (chat.id === currentChatId) {
                const newMessages = [...chat.messages];
                const lastMessageIndex = newMessages.length - 1;
                
                // Update the content of the last message (the assistant's streaming response)
                newMessages[lastMessageIndex] = {
                  ...newMessages[lastMessageIndex],
                  content: newMessages[lastMessageIndex].content + text,
                };

                return { ...chat, messages: newMessages };
              }
              return chat;
            });

            return { conversations: newConversations };
          });
        },
      });

    } catch (e) {
      console.error('Error sending message to AI:', e);
      set({
        error: e.message || 'An unknown error occurred during AI communication.',
        isStreaming: false,
      });
      // Rimuovi l'ultimo messaggio (incompleto) dell'assistente in caso di errore
      set((state) => {
        const { currentChatId, conversations } = state;
        const newConversations = conversations.map(chat => {
          if (chat.id === currentChatId) {
            return {
              ...chat,
              messages: chat.messages.slice(0, -1),
            };
          }
          return chat;
        });
        return { conversations: newConversations };
      });
    } finally {
      set({ isStreaming: false });
      // 3. Salva la conversazione dopo il completamento
      get().saveConversation();
    }
  },
}));