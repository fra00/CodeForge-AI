import { vi } from 'vitest';

// Mock per simulare il comportamento di idb/openDB e delle funzioni CRUD
export const mockDB = {
  projects: {},
  files: {},
  conversations: {},
  snippets: {},
  settings: {},
};

let nextId = 1;

// Funzione di utilità per simulare la transazione
const mockTransaction = (storeName, mode, callback) => {
  const store = mockDB[storeName];
  if (!store) {
    // Simula l'errore NotFoundError
    throw new Error("NotFoundError: The specified object store was not found.");
  }
  
  const mockStore = {
    get: vi.fn((id) => store[id]),
    getAll: vi.fn(() => Object.values(store)),
    add: vi.fn((value) => {
      const id = nextId++;
      store[id] = { ...value, id };
      return id;
    }),
    put: vi.fn((value) => {
      const id = value.id || nextId++;
      store[id] = { ...value, id };
      return id;
    }),
    delete: vi.fn((id) => {
      delete store[id];
    }),
    clear: vi.fn(() => {
      mockDB[storeName] = {};
    }),
  };

  // Esegui la callback con il mockStore
  const result = callback(mockStore);

  // Simula la fine della transazione
  return Promise.resolve(result);
};

// Mock per openDB
const mockOpenDB = vi.fn(() => ({
  transaction: vi.fn((storeName, mode) => ({
    objectStore: vi.fn(() => ({
      // Le operazioni reali saranno gestite dal mockTransaction
    })),
    done: Promise.resolve(),
  })),
}));

// Mock per le funzioni esportate da indexedDB.js
export const initDB = vi.fn(() => Promise.resolve(mockOpenDB()));
export const getAll = vi.fn((storeName) => mockTransaction(storeName, 'readonly', (store) => store.getAll()));
export const get = vi.fn((storeName, id) => mockTransaction(storeName, 'readonly', (store) => store.get(id)));
export const add = vi.fn((storeName, value) => mockTransaction(storeName, 'readwrite', (store) => store.add(value)));
export const put = vi.fn((storeName, value) => mockTransaction(storeName, 'readwrite', (store) => store.put(value)));
export const remove = vi.fn((storeName, id) => mockTransaction(storeName, 'readwrite', (store) => store.delete(id)));
export const clear = vi.fn((storeName) => mockTransaction(storeName, 'readwrite', (store) => store.clear()));
export const STORES = ['projects', 'files', 'conversations', 'snippets', 'settings'];

// Funzione per resettare lo stato del mock tra i test
export const resetMockDB = () => {
  Object.keys(mockDB).forEach(key => {
    mockDB[key] = {};
  });
  nextId = 1;
};

// Funzione per iniettare dati iniziali
export const injectMockData = (storeName, data) => {
  data.forEach(item => {
    const id = item.id || nextId++;
    mockDB[storeName][id] = { ...item, id };
  });
};

// Mocka il modulo reale di indexedDB.js
vi.mock('../../utils/indexedDB', () => ({
  initDB,
  getAll,
  get,
  add,
  put,
  remove,
  clear,
  STORES,
}));