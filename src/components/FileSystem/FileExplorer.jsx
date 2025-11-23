import React, { useMemo, useState } from "react";
import { FilePlus, FolderPlus, RefreshCw } from "lucide-react";
import { useFileStore } from "../../stores/useFileStore";
import { FileTree } from "./FileTree";
import { useContextMenu } from "../../hooks/useContextMenu";
import { ContextMenu } from "./ContextMenu";

/**
 * Componente principale per la visualizzazione e gestione del file system virtuale.
 */
export function FileExplorer() {
  const store = useFileStore();
  const createNewFile = store.createFileOrFolder;
  const rootId = store.rootId;
  const tree = useMemo(() => store.getTree(), [store.files]);
  const { contextMenu, handleContextMenu, handleCloseContextMenu } =
    useContextMenu();

  const [nodeToRename, setNodeToRename] = useState(null);
  const [nodeToDelete, setNodeToDelete] = useState(null);

  // Placeholder per le azioni
  const handleNewFile = () => {
    // Crea un file temporaneo e imposta la rinomina su di esso
    createNewFile(rootId, "new-file.txt", false, "");
    // Trova il nuovo ID temporaneo
    const newFileId = store.files[rootId].children.find(
      (id) => store.files[id].name === "new-file.txt"
    );
    if (newFileId) setNodeToRename(newFileId);
  };

  const handleNewFolder = () => {
    // Crea una cartella temporanea e imposta la rinomina su di essa
    createNewFile(rootId, "new-folder", true);
    // Trova il nuovo ID temporaneo
    const newFolderId = store.files[rootId].children.find(
      (id) => store.files[id].name === "new-folder"
    );
    if (newFolderId) setNodeToRename(newFolderId);
  };

  const handleRefresh = () => {
    // Ricarica i file da IndexedDB (utile per debug o sync manuale)
    useFileStore.getState().loadFiles();
  };

  const handleContextMenuAction = (action, targetId, e) => {
    e.stopPropagation();
    e.preventDefault();
    handleCloseContextMenu();
    const node = store.files[targetId];

    if (!node) return;

    switch (action) {
      case "newFile":
        // Se il target è una cartella, crea il file al suo interno
        const parentIdFile = node.isFolder ? targetId : node.parentId;
        createNewFile(parentIdFile, "new-file.txt", false, "");
        const newFileId = store.files[parentIdFile].children.find(
          (id) => store.files[id].name === "new-file.txt"
        );
        if (newFileId) setNodeToRename(newFileId);
        break;
      case "newFolder":
        // Se il target è una cartella, crea la cartella al suo interno
        const parentIdFolder = node.isFolder ? targetId : node.parentId;
        createNewFile(parentIdFolder, "new-folder", true);
        const newFolderId = store.files[parentIdFolder].children.find(
          (id) => store.files[id].name === "new-folder"
        );
        if (newFolderId) setNodeToRename(newFolderId);
        break;
      case "rename":
        setNodeToRename(targetId);
        break;
      case "delete":
        setNodeToDelete(node);
        break;
      case "copyPath":
        navigator.clipboard.writeText(node.path);
        alert(`Percorso copiato: ${node.path}`);
        break;
      default:
        break;
    }
  };

  return (
    <div className="w-64 bg-editor-darker border-r border-editor-border flex flex-col overflow-hidden">
      {/* Toolbar */}
      <div className="flex justify-between items-center h-10 px-2 border-b border-editor-border text-editor-border">
        <span className="text-sm font-semibold text-white">FILE EXPLORER</span>
        <div className="flex space-x-1">
          <button
            onClick={handleNewFile}
            className="p-1 rounded hover:bg-editor-highlight transition-colors duration-150"
            title="Nuovo File"
          >
            <FilePlus size={16} />
          </button>
          <button
            onClick={handleNewFolder}
            className="p-1 rounded hover:bg-editor-highlight transition-colors duration-150"
            title="Nuova Cartella"
          >
            <FolderPlus size={16} />
          </button>
          <button
            onClick={handleRefresh}
            className="p-1 rounded hover:bg-editor-highlight transition-colors duration-150"
            title="Ricarica"
          >
            <RefreshCw size={16} />
          </button>
        </div>
      </div>

      {/* File Tree */}
      <div
        className="flex-grow overflow-y-auto p-2 text-white"
        onContextMenu={(e) => handleContextMenu(e, rootId)}
      >
        {tree && (
          <FileTree
            tree={tree}
            handleContextMenu={handleContextMenu}
            nodeToRename={nodeToRename}
            setNodeToRename={setNodeToRename}
          />
        )}
        {!tree && (
          <div className="text-editor-border text-sm">Caricamento...</div>
        )}
      </div>

      {/* Context Menu */}
      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          targetId={contextMenu.targetId}
          onClose={handleCloseContextMenu}
          onAction={handleContextMenuAction}
          files={store.files}
          rootId={rootId}
        />
      )}

      {/* Modale di conferma eliminazione (Placeholder) */}
      {nodeToDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-editor-darker p-6 rounded-lg shadow-xl text-white">
            <h2 className="text-lg font-bold mb-4">Conferma Eliminazione</h2>
            <p className="mb-6">
              Sei sicuro di voler eliminare "{nodeToDelete.name}"? Questa azione
              è irreversibile.
            </p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setNodeToDelete(null)}
                className="px-4 py-2 rounded bg-editor-highlight hover:bg-editor-border"
              >
                Annulla
              </button>
              <button
                onClick={async () => {
                  await store.deleteNode(nodeToDelete.id);
                  setNodeToDelete(null);
                }}
                className="px-4 py-2 rounded bg-red-600 hover:bg-red-700"
              >
                Elimina
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
