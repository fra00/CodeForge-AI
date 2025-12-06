import { create } from "zustand";
import { initDB, getAll, put, remove, clear } from "../utils/indexedDB";
import JSZip from "jszip";
import { saveAs } from "file-saver";

// --- Initial State & Constants ---
const FILES_STORE_NAME = "files";
const ROOT_ID = "root";
const INITIAL_STATE = {
  isInitialized: false,
  isBlockingOperation: false, // Stato per bloccare la UI durante operazioni critiche
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
  savingFileIds: new Set(), // Per tracciare i file in salvataggio
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

/**
 * Trova un nodo (file o cartella) dato il suo percorso completo.
 * @param {object} files - La mappa dei file dello store.
 * @param {string} path - Il percorso completo (es. '/src/App.jsx').
 * @returns {object | undefined} Il nodo trovato o undefined.
 */
const findNodeByPath = (files, path) => {
  // Normalizza il percorso: aggiunge lo slash iniziale se manca, a meno che non sia la root
  const normalizedPath =
    path === "/" ? path : path.startsWith("/") ? path : "/" + path;

  // La root è un caso speciale
  if (normalizedPath === "/") {
    return files[ROOT_ID];
  }

  // Cerca il nodo iterando su tutti i file
  return Object.values(files).find((node) => node.path === normalizedPath);
};

// --- Store Definition ---

export const useFileStore = create((set, get) => ({
  ...INITIAL_STATE,

  // Funzione interna per aggiornare lo stato
  set: (updater) => set(updater),

  // --- Azione per lo stato di blocco ---
  _setBlocking: (isBlocking) => set({ isBlockingOperation: isBlocking }),

  // --- Async Operations (DB) ---

  /**
   * Pulisce completamente il file system, sia nello stato che in IndexedDB.
   */
  clearFileSystem: async () => {
    try {
      await clear(FILES_STORE_NAME); // Svuota la tabella in IndexedDB
      // Resetta lo stato a quello iniziale, ma mantenendo l'inizializzazione
      set({
        ...INITIAL_STATE,
        isInitialized: true,
        files: { ...INITIAL_STATE.files }, // Clona per sicurezza
      });
    } catch (error) {
      console.error("Failed to clear file system:", error);
    }
  },

  /**
   * Carica tutti i file da IndexedDB e inizializza lo store.
   */
  loadFiles: async (forceReload = false) => {
    if (get().isInitialized && !forceReload) return;

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
          content: "<h1>Hello LLMForge AI!</h1>",
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
    // LOCK: Se il file è già in salvataggio, esci.
    if (get().savingFileIds.has(id)) {
      console.log(`Save for file ${id} is already in progress. Skipping.`);
      return;
    }

    const file = get().files[id];
    if (!file || !file.isDirty) return;

    try {
      // LOCK: Aggiungi l'ID al set dei file in salvataggio
      set((state) => ({
        savingFileIds: new Set(state.savingFileIds).add(id),
      }));

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

          // 1. Rimuovi il vecchio nodo, ma conservane una copia per accedere ai figli
          const oldNode = newFiles[oldId];
          delete newFiles[oldId];

          // 2. Aggiungi il nuovo nodo con l'ID DB
          newFiles[newIdStr] = {
            ...file,
            id: newIdStr,
            isDirty: false,
            isNew: false,
          };

          // 3. Aggiorna il parent del nodo appena salvato
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

          // 5. CORREZIONE: Se il nodo era una cartella, aggiorna il parentId dei suoi figli
          if (oldNode && oldNode.isFolder && oldNode.children) {
            oldNode.children.forEach((childId) => {
              const childNode = newFiles[childId];
              if (childNode) {
                newFiles[childId] = { ...childNode, parentId: newIdStr };
              }
            });
          }

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
    } finally {
      // UNLOCK: Rimuovi l'ID dal set dei file in salvataggio
      set((state) => {
        const newSavingFileIds = new Set(state.savingFileIds);
        newSavingFileIds.delete(id);
        return { savingFileIds: newSavingFileIds };
      });
    }
  },

  // --- VFS Actions ---

  /**
   * Crea un nuovo file o cartella.
   */
  createFileOrFolder: (parentId, name, isFolder = false, content = "", tags = {}) => {
    const state = get();
    const parent = state.files[parentId];
    if (!parent || !parent.isFolder) {
      console.error("Invalid parent ID or not a folder.");
      return null;
    }

    // Verifica se esiste già un nodo con lo stesso nome
    const existingChild = parent.children.find(
      (childId) => state.files[childId]?.name === name
    );
    if (existingChild) {
      console.warn(
        `A file or folder named "${name}" already exists in this location.`
      );
      // Restituisce il nodo esistente se è una cartella, per permettere la creazione ricorsiva
      const existingNode = state.files[existingChild];
      return existingNode.isFolder ? existingNode : null;
    }

    const newId = generateTempId(state.nextTempId);
    const newNode = {
      id: newId,
      name,
      path: (parent.path === "/" ? "" : parent.path) + "/" + name,
      isFolder,
      content: isFolder ? "" : content,
      language: isFolder ? "" : "text", // Lingua di default, verrà aggiornata da languageDetector
      parentId,
      children: isFolder ? [] : undefined,
      isDirty: true, // Nuovo file/cartella da salvare
      isNew: true,
      tags: isFolder ? {} : tags, // Aggiungi i tag al nuovo nodo
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

      return {
        files: newFiles,
        nextTempId: state.nextTempId + 1,
      };
    });

    // Se è un file, aprilo automaticamente (operazione separata)
    if (!isFolder) {
      get().openFile(newId);
    }

    return newNode;
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

  /**
   * Funzione di utility interna per creare un nodo (file/cartella) dato un percorso completo.
   * Gestisce la creazione ricorsiva delle cartelle necessarie.
   * @private
   */
  _createNodeFromPath: (fullPath, content = "", tags = {}) => {
    const { rootId, createFileOrFolder, updateFileContent } = get();

    // A ogni chiamata, prendi lo stato più recente dei file
    const currentFiles = get().files;
    const existingNode = findNodeByPath(currentFiles, fullPath);

    // Comportamento UPSERT: se il file esiste, lo aggiorniamo con contenuto e tag.
    if (existingNode && !existingNode.isFolder) {
      updateFileContent(existingNode.id, content, tags);
      return { message: `✓ File ${fullPath} updated with new content and tags.` };
    }
    if (existingNode && existingNode.isFolder) {
      throw new Error(
        `Cannot create file ${fullPath}, a folder with the same name exists.`
      );
    }

    const parts = fullPath.split("/").filter(Boolean);
    const name = parts.pop();
    if (!name) {
      throw new Error(`Invalid path provided: ${fullPath}`);
    }

    let parentId = rootId;
    const results = [];

    // Crea le cartelle ricorsivamente
    for (const part of parts) {
      const parentNode = get().files[parentId];
      const childId = parentNode.children.find(
        (id) => get().files[id]?.name === part
      );

      if (childId && get().files[childId]?.isFolder) {
        parentId = childId;
      } else {
        const newFolderNode = createFileOrFolder(parentId, part, true);
        if (!newFolderNode) {
          throw new Error(`Failed to create intermediate directory: "${part}"`);
        }
        parentId = newFolderNode.id;
        results.push(`✓ Folder /${part} created`);
      }
    }

    // Ora crea il file
    createFileOrFolder(parentId, name, false, content, tags);
    results.push(`✓ File ${fullPath} created`);
    return { message: results.join("\n") };
  },

  /**
   * Applica un set di azioni (creazione, modifica, eliminazione) al VFS.
   * Esegue una singola azione su un file, come specificato dal nuovo flusso AI.
   * @param {string} actionType - Tipo di azione ('create_file', 'update_file', 'delete_file').
   * @param {object} file - Oggetto file con 'path' e 'content' (opzionale per delete).
   * @returns {string} Un messaggio di risultato per il log.
   */
  applyFileActions: (actionType, file, tags = {}) => {
    const state = get();
    const { _createNodeFromPath, updateFileContent, deleteNode } = state;
    const { path, content } = file;
    const normalizedPath = path.startsWith("/") ? path : "/" + path;

    try {
      if (actionType === "create_file") {
        _createNodeFromPath(normalizedPath, content, tags);
        return `✓ File ${normalizedPath} created.`;
      } else if (actionType === "update_file") {
        const existingNode = findNodeByPath(state.files, normalizedPath);
        if (!existingNode) {
          // Se il file non esiste, lo creiamo (comportamento upsert)
          _createNodeFromPath(normalizedPath, content, tags);
          return `✓ File ${normalizedPath} created (was missing).`;
        }
        if (existingNode.isFolder) {
          return `✗ ERROR: Cannot update ${normalizedPath}, it is a folder.`;
        }
        updateFileContent(existingNode.id, content, tags);
        return `✓ File ${normalizedPath} updated.`;
      } else if (actionType === "delete_file") {
        const existingNode = findNodeByPath(state.files, normalizedPath);
        if (!existingNode) {
          return `✗ ERROR: Node ${normalizedPath} not found.`;
        }
        // deleteNode è async, ma lo chiamiamo senza await per non bloccare il loop
        deleteNode(existingNode.id);
        return `✓ Node ${normalizedPath} deleted.`;
      } else {
        return `✗ ERROR: Unknown action type: ${actionType}`;
      }
    } catch (e) {
      console.error(
        `Error applying action ${actionType} on ${normalizedPath}:`,
        e
      );
      return `✗ FATAL ERROR on ${normalizedPath}: ${e.message}`;
    }
  },

  /**
   * Esegue una richiesta di Tool Call (lettura/elenco) da parte dell'AI.
   * @param {object} toolCall - Oggetto Tool Call con function_name e args.
   * @returns {string} La risposta formattata per l'LLM.
   */
  executeToolCall: (toolCall) => {
    const state = get();
    const { function_name, args } = toolCall;

    try {
      if (function_name === "list_files") {
        // 1. list_files: Restituisce un array di percorsi di file/cartelle
        const filePaths = Object.values(state.files)
          .filter((node) => node.id !== ROOT_ID)
          .map((node) => node.path)
          .sort();

        return `TOOL_RESPONSE: list_files\n${JSON.stringify(filePaths, null, 2)}`;
      } else if (function_name === "read_file") {
        // 2. read_file: Restituisce il contenuto di un file specifico
        const { path } = args;
        const node = findNodeByPath(state.files, path);

        if (!node) {
          return `TOOL_RESPONSE: read_file\nERROR: File not found at path: ${path}`;
        }
        if (node.isFolder) {
          return `TOOL_RESPONSE: read_file\nERROR: Cannot read content of a folder: ${path}`;
        }

        // Formatta il contenuto con i numeri di riga per una migliore leggibilità da parte dell'LLM
        const contentWithLines = node.content
          .split("\n")
          .map((line, index) => `${index + 1} | ${line}`)
          .join("\n");

        return `TOOL_RESPONSE: read_file\nFile: ${path}\nContent:\n${contentWithLines}`;
      }

      return `TOOL_RESPONSE: ${function_name}\nERROR: Unknown function name.`;
    } catch (e) {
      return `TOOL_RESPONSE: ${function_name}\nFATAL ERROR: ${e.message}`;
    }
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
  updateFileContent: (id, newContent, tags) => {
    const file = get().files[id];
    if (!file || file.isFolder) return;

    set((state) => {
      const updatedFile = {
        ...state.files[id],
        content: newContent,
        isDirty: true,
      };

      // Aggiorna i tag solo se vengono forniti.
      // Questo evita di cancellare i tag esistenti se l'AI non li invia in un aggiornamento.
      if (tags && Object.keys(tags).length > 0) {
        updatedFile.tags = tags;
      }

      return {
        files: {
          ...state.files,
          [id]: updatedFile,
        },
      };
    });
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

  /**
   * Comprime l'intero file system virtuale in un file ZIP e lo scarica.
   */
  downloadProjectZip: async () => {
    const state = get();
    const zip = new JSZip();

    // Filtra solo i file (non le cartelle) e ignora la root
    const filesToZip = Object.values(state.files).filter(
      (node) => !node.isFolder && node.id !== ROOT_ID
    );

    if (filesToZip.length === 0) {
      console.warn("Nessun file da scaricare.");
      return;
    }

    filesToZip.forEach((file) => {
      // Rimuove lo slash iniziale dal percorso per la struttura ZIP
      const zipPath = file.path.startsWith("/")
        ? file.path.substring(1)
        : file.path;
      zip.file(zipPath, file.content || "");
    });

    try {
      const content = await zip.generateAsync({ type: "blob" });
      saveAs(content, "codeforge-project.zip");
    } catch (error) {
      console.error(
        "Errore durante la creazione o il download del file ZIP:",
        error
      );
      alert("Errore durante la creazione o il download del file ZIP.");
    }
  },

  /**
   * Importa un progetto da un file ZIP, cancellando prima il contenuto esistente.
   * @param {File} zipFile - Il file ZIP caricato dall'utente.
   */
  importProjectFromZip: async (zipFile) => {
    const { clearFileSystem, _createNodeFromPath, _setBlocking } = get();

    // 1. Mostra un avviso e cancella tutto
    if (
      !window.confirm(
        "Sei sicuro di voler importare un nuovo progetto? Tutti i file attuali verranno eliminati."
      )
    ) {
      return;
    }

    _setBlocking(true);
    try {
      await clearFileSystem();

      // 2. Carica e scompatta lo ZIP
      const zip = new JSZip();
      try {
        const content = await zip.loadAsync(zipFile);
        const filePromises = [];

        content.forEach((relativePath, zipEntry) => {
          if (!zipEntry.dir) {
            const promise = async () => {
              const fileContent = await zipEntry.async("string");
              const fullPath = "/" + relativePath;
              _createNodeFromPath(fullPath, fileContent);
            };
            filePromises.push(promise());
          }
        });

        await Promise.all(filePromises);
      } catch (error) {
        console.error("Error importing project from ZIP:", error);
        alert(
          "Errore durante l'importazione del progetto. Il file ZIP potrebbe essere corrotto."
        );
      }
    } catch (error) {
      console.error("Critical error during import operation:", error);
    } finally {
      _setBlocking(false);
    }
  },

  /**
   * Resetta l'intero progetto allo stato iniziale di default.
   * Chiede conferma, pulisce il file system e ricarica lo stato iniziale.
   */
  resetProject: async () => {
    const { clearFileSystem, loadFiles, _setBlocking } = get();

    if (
      !window.confirm(
        "Sei sicuro di voler creare un nuovo progetto? Tutti i file attuali verranno eliminati."
      )
    ) {
      return;
    }

    _setBlocking(true);
    try {
      // Pulisce DB e stato in memoria
      await clearFileSystem();
      // Ricarica lo stato, che creerà il file di default perché il DB è vuoto
      await loadFiles(true); // Forza il ricaricamento per creare il file di default
    } catch (error) {
      console.error("Critical error during project reset:", error);
    } finally {
      _setBlocking(false);
    }
  },
}));
