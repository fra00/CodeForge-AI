import { describe, it, expect, beforeEach, vi } from "vitest";
import { useFileStore } from "../stores/useFileStore";
import {
  resetMockDB,
  injectMockData,
  put,
  remove,
  mockDB,
} from "./mocks/indexedDB";

// Mock per la funzione di alert usata nei template
global.alert = vi.fn();

// Mock per la funzione di conferma usata nei template
global.confirm = vi.fn(() => true);

// Mock per la funzione di copia negli appunti
global.navigator.clipboard = {
  writeText: vi.fn(),
};

// Inizializza lo store prima di ogni test
beforeEach(async () => {
  // Resetta lo stato del mock DB
  resetMockDB();
  // Resetta il mock di put e remove
  put.mockClear();
  remove.mockClear();
  // Resetta lo stato dello store Zustand
  useFileStore.setState(useFileStore.getInitialState());

  // Carica i file per inizializzare lo store (necessario per tutti i test VFS)
  await useFileStore.getState().loadFiles();
});

describe("useFileStore - VFS Operations", () => {
  it("should initialize with a default file if DB is empty", () => {
    const store = useFileStore.getState();

    expect(store.isInitialized).toBe(true);
    expect(Object.keys(store.files).length).toBe(2); // root + default file
    expect(store.files["root"].children.length).toBe(1);
    expect(store.openFileIds.length).toBe(1);
    expect(store.activeFileId).toBe(store.files["root"].children[0]);
    expect(store.files[store.activeFileId].name).toBe("index.html");
  });

  it("should load files from DB and reconstruct tree", async () => {
    // Dati mockati: una cartella e un file al suo interno
    injectMockData("files", [
      {
        id: 1,
        name: "src",
        path: "/src",
        isFolder: true,
        parentId: "root",
        isOpen: true,
        isActive: false,
      },
      {
        id: 2,
        name: "app.js",
        path: "/src/app.js",
        isFolder: false,
        parentId: 1,
        isOpen: true,
        isActive: true,
        content: 'console.log("hi")',
      },
    ]);

    // Ricarica lo store con i dati mockati
    useFileStore.setState(useFileStore.getInitialState());
    await useFileStore.getState().loadFiles(); // Call loadFiles
    const store = useFileStore.getState(); // Get the *updated* state

    expect(store.isInitialized).toBe(true);
    expect(Object.keys(store.files).length).toBe(3); // root + 2 files
    expect(store.files["root"].children).toEqual(["1"]);
    expect(store.files["1"].children).toEqual(["2"]);
    expect(store.openFileIds).toEqual(["2"]); // Solo il file è aperto nell'editor
    expect(store.activeFileId).toBe("2");
  });

  it("should create a new file and open it", () => {
    const store0 = useFileStore.getState();
    store0.createFileOrFolder("root", "test.js", false, "test content");

    //refresh store state
    const store = useFileStore.getState();
    const newFileId = store.files["root"].children.find(
      (id) => store.files[id].name === "test.js"
    );
    const newFile = store.files[newFileId];

    expect(newFile.name).toBe("test.js");
    expect(newFile.path).toBe("/test.js");
    expect(newFile.isDirty).toBe(true);
    expect(newFile.isNew).toBe(true);
    expect(store.openFileIds).toContain(newFileId);
    expect(store.activeFileId).toBe(newFileId);
  });

  it("should rename a file and update its path", () => {
    const initStore = useFileStore.getState();
    initStore.createFileOrFolder("root", "old.txt", false, "");
    const store = useFileStore.getState();
    const fileId = store.activeFileId;

    store.renameNode(fileId, "new.txt");

    const updatedStore = useFileStore.getState();

    const renamedFile = updatedStore.files[fileId];

    expect(renamedFile.name).toBe("new.txt");
    expect(renamedFile.path).toBe("/new.txt");
    expect(renamedFile.isDirty).toBe(true);
  });

  it("should rename a folder and update children paths", () => {
    var store = useFileStore.getState();
    store.createFileOrFolder("root", "old-folder", true);
    store = useFileStore.getState();
    const folderId = store.files["root"].children.find(
      (id) => store.files[id].name === "old-folder"
    );
    store.createFileOrFolder(folderId, "child.js", false, "");
    store = useFileStore.getState();
    const childId = store.files[folderId].children.find(
      (id) => store.files[id].name === "child.js"
    );
    store.renameNode(folderId, "new-folder");

    const updatedStore = useFileStore.getState();

    const renamedFolder = updatedStore.files[folderId];
    const childFile = updatedStore.files[childId];

    expect(renamedFolder.name).toBe("new-folder");
    expect(renamedFolder.path).toBe("/new-folder");
    expect(childFile.path).toBe("/new-folder/child.js");
    expect(childFile.isDirty).toBe(true);
  });

  it("should delete a file and close its tab", async () => {
    const store0 = useFileStore.getState();
    store0.createFileOrFolder("root", "to-delete.txt", false, "");
    const store = useFileStore.getState(); // Aggiorna lo stato locale
    const fileId = store.files["root"].children.find(
      (id) => store.files[id].name === "to-delete.txt"
    );
    // Il file di default (index.html) è già aperto da beforeEach.
    const defaultFileId = store.files["root"].children.find(
      (id) => store.files[id].name === "index.html"
    );

    // Impostiamo il file di default come attivo, in modo che sia il fallback
    store.setActiveFile(defaultFileId);
    // Impostiamo il file da eliminare come attivo
    store.setActiveFile(fileId);

    await store.deleteNode(fileId);

    const updatedStore = useFileStore.getState();

    expect(updatedStore.files[fileId]).toBeUndefined();
    expect(updatedStore.openFileIds).not.toContain(fileId);
    // Dopo l'eliminazione, l'activeFileId dovrebbe tornare all'altro file aperto (index.html)
    expect(updatedStore.activeFileId).toBe(defaultFileId);
    // I file creati nei test sono new:true e non vengono rimossi dal DB
    expect(remove).not.toHaveBeenCalled();
  });

  it("should delete a folder and all its children", async () => {
    var store0 = useFileStore.getState();
    store0.createFileOrFolder("root", "folder-to-delete", true);
    var store = useFileStore.getState();
    const folderId = store.files["root"].children.find(
      (id) => store.files[id].name === "folder-to-delete"
    );
    store.createFileOrFolder(folderId, "child.js", false, "");
    store = useFileStore.getState();
    const childId = store.files[folderId].children.find(
      (id) => store.files[id].name === "child.js"
    );

    await store.deleteNode(folderId);
    const updatedStore = useFileStore.getState();

    expect(updatedStore.files[folderId]).toBeUndefined();
    expect(updatedStore.files[childId]).toBeUndefined();
    expect(updatedStore.files["root"].children).not.toContain(folderId);
    // I file creati nei test sono new:true e non vengono rimossi dal DB
    expect(remove).not.toHaveBeenCalled();
  });

  it("should save a new file and update its ID", async () => {
    // 1. Crea il file
    const store0 = useFileStore.getState();
    store0.createFileOrFolder("root", "new.txt", false, "content");

    const store = useFileStore.getState();
    const tempId = store.files["root"].children.find(
      (id) => store.files[id].name === "new.txt"
    );

    expect(tempId).toMatch(/^new-/); // Verifica che sia un ID temporaneo

    // 2. Mock di put per questo specifico test
    // IMPORTANTE: usa mockResolvedValueOnce invece di mockImplementationOnce
    put.mockResolvedValueOnce(100);

    // 3. Salva il file
    const newId = await store.saveFile(tempId);

    // 4. Verifica risultati
    const updatedStore = useFileStore.getState();
    const savedFile = updatedStore.files[newId];

    expect(newId).toBe("100");
    expect(savedFile).toBeDefined();
    expect(savedFile.id).toBe("100");
    expect(savedFile.isNew).toBe(false);
    expect(savedFile.isDirty).toBe(false);
    expect(savedFile.name).toBe("new.txt");
    expect(savedFile.content).toBe("content");

    // 5. Verifica che l'ID temporaneo sia stato rimosso
    expect(updatedStore.files[tempId]).toBeUndefined();

    // 6. Verifica che il parent contenga il nuovo ID
    expect(updatedStore.files["root"].children).toContain("100");
    expect(updatedStore.files["root"].children).not.toContain(tempId);

    // 7. Verifica che put sia stato chiamato correttamente
    expect(put).toHaveBeenCalledWith(
      "files",
      expect.objectContaining({
        name: "new.txt",
        content: "content",
        isDirty: false,
        isNew: false,
      })
    );
  });

  it("should save an existing file", async () => {
    injectMockData("files", [
      {
        id: 1,
        name: "test.js",
        path: "/test.js",
        isFolder: false,
        parentId: "root",
        isDirty: true,
        content: "old",
      },
    ]);

    // Ricarica lo store con i dati mockati
    useFileStore.setState(useFileStore.getInitialState());
    const store = useFileStore.getState();
    await store.loadFiles();

    store.updateFileContent("1", "new content");
    await store.saveFile("1");

    const updatedStore = useFileStore.getState();
    expect(updatedStore.files["1"].isDirty).toBe(false);
    expect(put).toHaveBeenCalledWith(
      "files",
      expect.objectContaining({ id: "1", content: "new content" })
    );
  });
});
