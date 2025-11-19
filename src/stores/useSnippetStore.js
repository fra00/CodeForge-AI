import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { get, put, remove } from '../utils/indexedDB';
import { allSnippets } from '../data/snippets';

const SNIPPET_STORE_NAME = 'snippets';
const SNIPPET_KEY = 'custom-snippets';

/**
 * Middleware per caricare e salvare gli snippet custom su IndexedDB.
 */
const indexedDBStorage = {
  getItem: async (name) => {
    try {
      const data = await get(SNIPPET_STORE_NAME, SNIPPET_KEY);
      return data ? JSON.stringify(data.value) : null;
    } catch (error) {
      console.error('Error loading custom snippets from IndexedDB:', error);
      return null;
    }
  },
  setItem: async (name, value) => {
    try {
      const data = { id: SNIPPET_KEY, value: JSON.parse(value) };
      await put(SNIPPET_STORE_NAME, data);
    } catch (error) {
      console.error('Error saving custom snippets to IndexedDB:', error);
    }
  },
  removeItem: async (name) => {
    try {
      await remove(SNIPPET_STORE_NAME, SNIPPET_KEY);
    } catch (error) {
      console.error('Error removing custom snippets from IndexedDB:', error);
    }
  },
};

export const useSnippetStore = create(
  persist(
    (set, get) => ({
      customSnippets: [],

      /**
       * Restituisce tutti gli snippet (predefiniti + custom).
       */
      getAllSnippets: () => {
        return [...allSnippets, ...get().customSnippets];
      },

      /**
       * Aggiunge un nuovo snippet custom.
       */
      addSnippet: (snippet) => {
        const newSnippet = {
          ...snippet,
          id: `custom-${Date.now()}`,
          isCustom: true,
        };
        set(state => ({
          customSnippets: [...state.customSnippets, newSnippet],
        }));
      },

      /**
       * Elimina uno snippet custom per ID.
       */
      deleteSnippet: (id) => {
        set(state => ({
          customSnippets: state.customSnippets.filter(s => s.id !== id),
        }));
      },
    }),
    {
      name: 'codeforge-snippets-storage',
      storage: indexedDBStorage,
      partialize: (state) => ({ customSnippets: state.customSnippets }),
    }
  )
);