import { create } from "zustand";
import { initDB, getAll, put, remove } from "../utils/indexedDB";

// --- Initial State & Constants ---
const FILES_STORE_NAME = "files";
const ROOT_ID = "root";
const INITIAL_STATE = {
  isInitialized: false,
  files: {
    [ROOT_ID]: {
      id: ROOT_ID,
      name: "root",
      path: "/",
      isFolder: true,
      children: [],
      parentId: null,
      isDirty: false,
      isNew: false,
    },
  },
  rootId: ROOT_ID,
  openFileIds: [],
  activeFileId: null,
  nextTempId: 1, // For new files not yet in DB
};

// --- Helper Functions ---

/**
 * Genera un ID temporaneo per i nuovi nodi.
 */
const generateTempId = (nextTempId) => {
  return `new-${nextTempId}`;
};

/**
 * Ricostruisce il percorso completo di un nodo.
 */
const buildPath = (files, id) => {
  let path = "";
  let currentId = id;
  while (currentId && currentId !== ROOT_ID) {
    const node = files[currentId];
    if (!node) break;
    path = "/" + node.name + path;
    currentId = node.parentId;
  }
  return path || "/";
};

// --- Store Definition ---

export const useFileStore = create((set, get) => ({
  ...INITIAL_STATE,

  // Funzione interna per aggiornare lo stato
  set: (updater) => set(updater),

  // --- Async Operations (DB) ---

  /**
   * Carica tutti i file da IndexedDB e inizializza lo store.
   */
  loadFiles: async () => {
    if (get().isInitialized) return;

    try {
      await initDB();
      const dbFiles = await getAll(FILES_STORE_NAME);

      const filesMap = { ...INITIAL_STATE.files };
      let openFileIds = [];
      let activeFileId = null;

      dbFiles.forEach((file) => {
        // Assicurati che l'ID sia una stringa per coerenza con ROOT_ID
        const id = String(file.id);
        filesMap[id] = {
          ...file,
          id,
          isDirty: false, // Assumiamo che i file caricati siano puliti
          isNew: false,
        };

        // Ricostruisci lo stato della sessione
        // openFileIds è solo per i file aperti nell'editor (non cartelle)
        if (file.isOpen && !file.isFolder) {
          openFileIds.push(id);
        }
        if (file.isActive) {
          activeFileId = id;
        }
      });

      // 1. Inizializza l'array children per tutte le cartelle
      Object.values(filesMap).forEach((node) => {
        if (node.isFolder) {
          node.children = [];
        }
      });

      // 2. Popola l'array children di ogni cartella
      Object.values(filesMap).forEach((node) => {
        if (
          node.parentId &&
          filesMap[node.parentId] &&
          filesMap[node.parentId].isFolder
        ) {
          filesMap[node.parentId].children.push(node.id);
        }
      });

      // Se non ci sono file, crea un file di default
      let nextTempId = get().nextTempId;
      if (dbFiles.length === 0) {
        const tempId = generateTempId(nextTempId);
        nextTempId++; // Incrementa il contatore
        const defaultFile = {
          id: tempId,
          name: "index.html",
          path: "/index.html",
          isFolder: false,
          content: "<h1>Hello CodeForge AI!</h1>",
          language: "html",
          parentId: ROOT_ID,
          isDirty: true, // Sarà salvato al primo autosave
          isNew: true,
        };
        filesMap[tempId] = defaultFile;
        filesMap[ROOT_ID].children.push(tempId);
        openFileIds.push(tempId);
        activeFileId = tempId;
      }

      set({
        files: filesMap,
        openFileIds,
        activeFileId,
        isInitialized: true,
        nextTempId, // Aggiorna il contatore
      });
    } catch (error) {
      console.error("Failed to load files from IndexedDB:", error);
      // Fallback to initial state
      set({ isInitialized: true });
    }
  },

  /**
   * Salva un singolo file su IndexedDB.
   * @param {string} id - L'ID del file da salvare.
   */
  saveFile: async (id) => {
    const file = get().files[id];
    if (!file || file.isFolder || !file.isDirty) return;

    try {
      // Prepara l'oggetto per il DB (rimuovi le proprietà non persistenti)
      const dbFile = {
        ...file,
        isDirty: false,
        isNew: false,
        // Aggiungi stato sessione per persistenza
        isOpen: get().openFileIds.includes(id),
        isActive: get().activeFileId === id,
      };

      // Se è un file nuovo, rimuovi l'ID temporaneo per far generare l'ID al DB
      if (file.isNew) {
        delete dbFile.id;
        const newId = await put(FILES_STORE_NAME, dbFile); // put() può anche aggiungere
        const newIdStr = String(newId);

        // Aggiorna lo store con il nuovo ID generato dal DB
        set((state) => {
          const oldId = id;
          const newFiles = { ...state.files };

          // 1. Rimuovi il vecchio nodo
          delete newFiles[oldId];

          // 2. Aggiungi il nuovo nodo con l'ID DB
          newFiles[newIdStr] = {
            ...file,
            id: newIdStr,
            isDirty: false,
            isNew: false,
          };
          // 3. Aggiorna il parent
          const parent = newFiles[file.parentId];
          if (parent) {
            parent.children = parent.children.map((childId) =>
              childId === oldId ? newIdStr : childId
            );
          }

          // 4. Aggiorna openFileIds e activeFileId
          const newOpenFileIds = state.openFileIds.map((fileId) =>
            fileId === oldId ? newIdStr : fileId
          );
          const newActiveFileId =
            state.activeFileId === oldId ? newIdStr : state.activeFileId;

          return {
            files: newFiles,
            openFileIds: newOpenFileIds,
            activeFileId: newActiveFileId,
          };
        });
        return newIdStr;
      } else {
        // File esistente, usa put per aggiornare
        // L'ID nello store è una stringa, ma IndexedDB si aspetta un numero per gli ID auto-generati
        // Passiamo l'ID come numero per evitare che IndexedDB lo salvi come stringa.
        await put(FILES_STORE_NAME, { ...dbFile, id: Number(id) });
        set((state) => ({
          files: {
            ...state.files,
            [id]: { ...state.files[id], isDirty: false },
          },
        }));
        return id;
      }
    } catch (error) {
      console.error(`Failed to save file ${id} to IndexedDB:`, error);
      return null;
    }
  },

  // --- VFS Actions ---

  /**
   * Crea un nuovo file o cartella.
   */
  createFileOrFolder: (parentId, name, isFolder = false, content = "") => {
    const state = get();
    const parent = state.files[parentId];
    if (!parent || !parent.isFolder) {
      console.error("Invalid parent ID or not a folder.");
      return;
    }

    // Verifica se esiste già un nodo con lo stesso nome
    const existingChild = parent.children.find(
      (childId) => state.files[childId].name === name
    );
    if (existingChild) {
      console.warn(
        `A file or folder named "${name}" already exists in this location.`
      );
      return;
    }

    const newId = generateTempId(state.nextTempId);
    const newNode = {
      id: newId,
      name,
      path:
        buildPath(state.files, parentId) +
        (parentId !== ROOT_ID ? "/" : "") +
        name,
      isFolder,
      content: isFolder ? "" : content,
      language: isFolder ? "" : "text", // Lingua di default, verrà aggiornata da languageDetector
      parentId,
      children: isFolder ? [] : undefined,
      isDirty: true, // Nuovo file/cartella da salvare
      isNew: true,
    };

    set((state) => {
      const newFiles = {
        ...state.files,
        [newId]: newNode,
        [parentId]: {
          ...parent,
          children: [...parent.children, newId],
        },
      };

      // Aggiorna il contatore nextTempId e lo stato dei file in un'unica operazione
      return {
        files: newFiles,
        nextTempId: state.nextTempId + 1,
      };
    });

    // Se è un file, aprilo automaticamente (operazione separata)
    if (!isFolder) {
      get().openFile(newId);
    }
  },

  /**
   * Rinomina un file o cartella.
   */
  renameNode: (id, newName) => {
    const state = get();
    const node = state.files[id];
    if (!node) return;

    const parent = state.files[node.parentId];
    if (parent) {
      // Verifica se esiste già un nodo con il nuovo nome
      const existingChild = parent.children.find(
        (childId) => childId !== id && state.files[childId].name === newName
      );
      if (existingChild) {
        console.warn(
          `A file or folder named "${newName}" already exists in this location.`
        );
        return;
      }
    }

    set((state) => {
      const newFiles = { ...state.files };
      const oldPath = node.path;
      const newPath =
        buildPath(newFiles, node.parentId) +
        (node.parentId !== ROOT_ID ? "/" : "") +
        newName;

      // 1. Aggiorna il nodo
      newFiles[id] = {
        ...node,
        name: newName,
        path: newPath,
        isDirty: true,
      };

      // 2. Aggiorna i percorsi dei figli (solo se è una cartella)
      if (node.isFolder && node.children) {
        const updateChildPaths = (childId) => {
          const childNode = newFiles[childId];
          if (!childNode) return;

          const newChildPath =
            newPath + childNode.path.substring(oldPath.length);
          newFiles[childId] = {
            ...childNode,
            path: newChildPath,
            isDirty: true,
          };

          if (childNode.isFolder && childNode.children) {
            childNode.children.forEach(updateChildPaths);
          }
        };
        node.children.forEach(updateChildPaths);
      }

      return { files: newFiles };
    });
  },

  /**
   * Elimina un file o cartella.
   */
  deleteNode: async (id) => {
    const state = get();
    const node = state.files[id];
    if (!node || id === ROOT_ID) return;

    const nodesToDelete = [id];
    const collectChildren = (parentId) => {
      const parent = state.files[parentId];
      if (parent && parent.children) {
        parent.children.forEach((childId) => {
          nodesToDelete.push(childId);
          if (state.files[childId].isFolder) {
            collectChildren(childId);
          }
        });
      }
    };

    if (node.isFolder) {
      collectChildren(id);
    }

    // 1. Elimina da IndexedDB
    try {
      await Promise.all(
        nodesToDelete.map((nodeId) => {
          const file = state.files[nodeId];
          // Solo i file salvati (con ID numerico) devono essere rimossi dal DB
          if (!file.isNew) {
            // Converti l'ID in numero, poiché IndexedDB usa numeri per autoIncrement
            return remove(FILES_STORE_NAME, Number(file.id));
          }
          return Promise.resolve();
        })
      );
    } catch (error) {
      console.error("Failed to delete nodes from IndexedDB:", error);
    }

    // 2. Aggiorna lo store
    set((state) => {
      const newFiles = { ...state.files };
      const newOpenFileIds = [...state.openFileIds];
      let newActiveFileId = state.activeFileId;

      // Rimuovi i nodi
      nodesToDelete.forEach((nodeId) => {
        delete newFiles[nodeId];
        // Rimuovi dalle tab aperte
        const openIndex = newOpenFileIds.indexOf(nodeId);
        if (openIndex > -1) {
          newOpenFileIds.splice(openIndex, 1);
        }
      });

      // Rimuovi il nodo dal parent
      const parent = newFiles[node.parentId];
      if (parent) {
        parent.children = parent.children.filter((childId) => childId !== id);
      }

      // Se il file attivo è stato eliminato, imposta il nuovo file attivo
      if (newActiveFileId === id) {
        newActiveFileId =
          newOpenFileIds.length > 0
            ? newOpenFileIds[Math.max(0, newOpenFileIds.length - 1)]
            : null;
      }

      return {
        files: newFiles,
        openFileIds: newOpenFileIds,
        activeFileId: newActiveFileId,
      };
    });
  },

  // --- Editor/Tab Actions ---

  /**
   * Apre un file nell'editor.
   */
  openFile: (id) => {
    const file = get().files[id];
    if (!file || file.isFolder) return;

    set((state) => {
      const newOpenFileIds = state.openFileIds.includes(id)
        ? state.openFileIds
        : [...state.openFileIds, id];

      return {
        openFileIds: newOpenFileIds,
        activeFileId: id,
      };
    });
  },

  /**
   * Chiude un file dall'editor.
   */
  closeFile: (id) => {
    set((state) => {
      const newOpenFileIds = state.openFileIds.filter(
        (fileId) => fileId !== id
      );
      let newActiveFileId = state.activeFileId;

      if (newActiveFileId === id) {
        // Imposta il file attivo sul precedente o su null
        const closedIndex = state.openFileIds.indexOf(id);
        if (newOpenFileIds.length > 0) {
          newActiveFileId = state.openFileIds[Math.max(0, closedIndex - 1)];
        } else {
          newActiveFileId = null;
        }
      }

      return {
        openFileIds: newOpenFileIds,
        activeFileId: newActiveFileId,
      };
    });
  },

  /**
   * Imposta il file attivo.
   */
  setActiveFile: (id) => {
    const file = get().files[id];
    if (!file || file.isFolder) return;

    set({ activeFileId: id });
  },

  /**
   * Aggiorna il contenuto di un file.
   */
  updateFileContent: (id, newContent) => {
    const file = get().files[id];
    if (!file || file.isFolder) return;

    set((state) => ({
      files: {
        ...state.files,
        [id]: {
          ...file,
          content: newContent,
          isDirty: true,
        },
      },
    }));
  },

  // --- Selectors ---

  /**
   * Ottiene il file attivo.
   */
  getActiveFile: () => {
    const state = get();
    return state.activeFileId ? state.files[state.activeFileId] : null;
  },

  /**
   * Ottiene i file aperti.
   */
  getOpenFiles: () => {
    const state = get();
    return state.openFileIds.map((id) => state.files[id]).filter(Boolean);
  },

  /**
   * Ottiene la struttura ad albero del file system.
   */
  getTree: () => {
    const state = get();
    const files = state.files;

    const buildTree = (id) => {
      const node = files[id];
      if (!node) return null;

      const treeNode = { ...node };

      if (node.isFolder && node.children) {
        treeNode.children = node.children
          .map(buildTree)
          .filter(Boolean)
          .sort((a, b) => {
            // Ordina prima le cartelle, poi i file, in ordine alfabetico
            if (a.isFolder && !b.isFolder) return -1;
            if (!a.isFolder && b.isFolder) return 1;
            return a.name.localeCompare(b.name);
          });
      }

      return treeNode;
    };

    return buildTree(state.rootId);
  },
}));
