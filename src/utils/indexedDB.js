import { openDB } from 'idb';

const DB_NAME = 'CodeForgeAI';
const DB_VERSION = 2;

// Object Stores
const STORES = [
  'projects',
  'files',
  'aiConversations',
  'snippets',
  'settings',
];

/**
 * Inizializza il database IndexedDB.
 * @returns {Promise<IDBDatabase>} L'istanza del database.
 */
export async function initDB() {
  return openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      for (const storeName of STORES) {
        if (!db.objectStoreNames.contains(storeName)) {
          db.createObjectStore(storeName, { keyPath: 'id', autoIncrement: true });
        }
      }
    },
  });
}

/**
 * Esegue una transazione sul database.
 * @param {string} storeName - Il nome dell'Object Store.
 * @param {string} mode - La modalità della transazione ('readonly' o 'readwrite').
 * @param {function(IDBObjectStore): Promise<any>} callback - La funzione da eseguire all'interno della transazione.
 * @returns {Promise<any>} Il risultato della callback.
 */
async function transaction(storeName, mode, callback) {
  const db = await initDB();
  const tx = db.transaction(storeName, mode);
  const store = tx.objectStore(storeName);
  try {
    const result = await callback(store);
    await tx.done;
    return result;
  } catch (error) {
    console.error(`IndexedDB transaction failed for store ${storeName}:`, error);
    throw error;
  }
}

/**
 * Legge un elemento per ID.
 * @param {string} storeName - Il nome dell'Object Store.
 * @param {number|string} id - L'ID dell'elemento.
 * @returns {Promise<any>} L'elemento letto.
 */
export async function get(storeName, id) {
  return transaction(storeName, 'readonly', (store) => store.get(id));
}

/**
 * Legge tutti gli elementi da un Object Store.
 * @param {string} storeName - Il nome dell'Object Store.
 * @returns {Promise<Array<any>>} L'array di tutti gli elementi.
 */
export async function getAll(storeName) {
  return transaction(storeName, 'readonly', (store) => store.getAll());
}

/**
 * Aggiunge un nuovo elemento.
 * @param {string} storeName - Il nome dell'Object Store.
 * @param {object} value - L'elemento da aggiungere.
 * @returns {Promise<number|string>} La chiave generata per l'elemento.
 */
export async function add(storeName, value) {
  return transaction(storeName, 'readwrite', (store) => store.add(value));
}

/**
 * Aggiorna un elemento esistente.
 * @param {string} storeName - Il nome dell'Object Store.
 * @param {object} value - L'elemento aggiornato (deve contenere la keyPath).
 * @returns {Promise<number|string>} La chiave dell'elemento aggiornato.
 */
export async function put(storeName, value) {
  return transaction(storeName, 'readwrite', (store) => store.put(value));
}

/**
 * Elimina un elemento per ID.
 * @param {string} storeName - Il nome dell'Object Store.
 * @param {number|string} id - L'ID dell'elemento da eliminare.
 * @returns {Promise<void>}
 */
export async function remove(storeName, id) {
  return transaction(storeName, 'readwrite', (store) => store.delete(id));
}

/**
 * Svuota un intero Object Store.
 * @param {string} storeName - Il nome dell'Object Store.
 * @returns {Promise<void>}
 */
export async function clear(storeName) {
  return transaction(storeName, 'readwrite', (store) => store.clear());
}

// Esporto anche i nomi degli store per un uso più pulito
export { STORES };