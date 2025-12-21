import React, { useMemo, useState } from "react";
import { useFileStore } from "../../stores/useFileStore";
import { useSettingsStore } from "../../stores/useSettingsStore";
import { FileTree } from "./FileTree";
import { useContextMenu } from "../../hooks/useContextMenu";
import { ContextMenu } from "./ContextMenu";
import Tooltip from "../ui/Tooltip";
import {
  PanelLeftClose,
  PanelRightOpen,
  FilePlus,
  FolderPlus,
  FlaskConical,
  Loader2,
} from "lucide-react";

/**
 * Componente principale per la visualizzazione e gestione del file system virtuale.
 */
export function FileExplorer({
  onRunTest,
  onRunAllTests,
  runningTestPath,
  isTesting,
}) {
  const store = useFileStore();
  const { fileExplorerVisible, toggleFileExplorer } = useSettingsStore();
  const createNewFile = store.createFileOrFolder;
  const rootId = store.rootId;
  const tree = useMemo(() => store.getTree(), [store.files, store.getTree]);
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
    <aside
      className={`bg-editor-darker border-r border-editor-border flex flex-col flex-shrink-0 transition-width duration-200 ease-in-out ${
        fileExplorerVisible ? "w-64" : "w-10" // Larghezza dinamica
      }`}
    >
      <div className="flex items-center justify-between p-2 border-b border-editor-border h-10">
        {fileExplorerVisible && ( // Mostra il titolo solo quando è aperto
          <h2 className="text-xs font-bold uppercase text-white whitespace-nowrap overflow-hidden">
            File Explorer
          </h2>
        )}
        <Tooltip text="Toggle File Explorer">
          <button
            onClick={toggleFileExplorer}
            className="text-white hover:bg-editor-highlight"
          >
            {fileExplorerVisible ? (
              <PanelLeftClose size={18} />
            ) : (
              <PanelRightOpen size={18} />
            )}
          </button>
        </Tooltip>
      </div>
      {fileExplorerVisible && (
        <div className="flex justify-end items-center h-10 px-2 border-b border-editor-border text-white">
          <div className="flex space-x-1">
            <Tooltip text="Nuovo File">
              <button
                onClick={handleNewFile}
                className="p-1 rounded hover:bg-editor-highlight transition-colors duration-150"
              >
                <FilePlus size={16} />
              </button>
            </Tooltip>
            <Tooltip text="Nuova Cartella">
              <button
                onClick={handleNewFolder}
                className="p-1 rounded hover:bg-editor-highlight transition-colors duration-150"
              >
                <FolderPlus size={16} />
              </button>
            </Tooltip>
          </div>
          <div className="flex-grow" /> {/* Spacer */}
          <Tooltip text="Run All Tests">
            <button
              onClick={onRunAllTests}
              className="p-1 rounded hover:bg-editor-highlight transition-colors duration-150 disabled:opacity-50"
              disabled={isTesting}
            >
              {isTesting ? <Loader2 size={16} className="animate-spin" /> : <FlaskConical size={16} />}
            </button>
          </Tooltip>
        </div>
      )}
      {fileExplorerVisible && (
        <div
          className="p-2 overflow-y-auto text-sm text-white flex-grow"
          onContextMenu={(e) => handleContextMenu(e, rootId)}
        >
          {tree && (
            <FileTree
              tree={tree}
              handleContextMenu={handleContextMenu}
              nodeToRename={nodeToRename}
              setNodeToRename={setNodeToRename}
              onRunTest={onRunTest}
              runningTestPath={runningTestPath}
            />
          )}
          {!tree && (
            <div className="text-editor-border text-sm">Caricamento...</div>
          )}
        </div>
      )}

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
                className="px-4 py-2 rounded bg-editor-highlight hover:bg-editor-border text-white"
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
    </aside>
  );
}
