import React, { useState, useMemo, useEffect } from "react";
import PropTypes from "prop-types";
import { useFileStore } from "../../stores/useFileStore";
import { detectIcon } from "../../utils/languageDetector";
import {
  Folder,
  FolderOpen,
  FileCode,
  FileText,
  FileJson,
  ChevronRight,
  ChevronDown,
} from "lucide-react";

// Mappa i nomi delle icone Lucide alle icone reali
const IconMap = {
  FileCode,
  FileText,
  FileJson,
};

/**
 * Componente per un singolo nodo (file o cartella) nell'albero dei file.
 */
export function FileTreeNode({
  node,
  level = 0,
  handleContextMenu,
  nodeToRename,
  setNodeToRename,
}) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [isRenaming, setIsRenaming] = useState(false);
  const [newName, setNewName] = useState(node.name);
  const activeFileId = useFileStore((state) => state.activeFileId);
  const openFile = useFileStore((state) => state.openFile);
  const setActiveFile = useFileStore((state) => state.setActiveFile);
  const renameNode = useFileStore((state) => state.renameNode);
  const store = useFileStore();

  // Effetto per attivare la modalità di rinomina
  useEffect(() => {
    if (nodeToRename === node.id) {
      setIsRenaming(true);
      setNewName(node.name);
      setNodeToRename(null); // Resetta lo stato globale
    }
  }, [nodeToRename, node.id, node.name, setNodeToRename]);

  const isFolder = node.isFolder;
  const isActive = node.id === activeFileId;
  const isDirty = node.isDirty;

  const IconComponent = useMemo(() => {
    if (isFolder) {
      return isExpanded ? FolderOpen : Folder;
    }
    return IconMap[detectIcon(node.name)] || FileText;
  }, [isFolder, isExpanded, node.name]);

  const handleClick = () => {
    if (isFolder) {
      setIsExpanded(!isExpanded);
    } else {
      // Se il file è già aperto, lo rendiamo attivo. Altrimenti, lo apriamo.
      if (activeFileId === node.id) {
        setActiveFile(node.id);
      } else {
        openFile(node.id);
      }
    }
  };

  const onContextMenu = (e) => {
    e.stopPropagation(); // Impedisce la propagazione al contenitore FileExplorer
    handleContextMenu(e, node.id);
  };

  const handleRenameSubmit = (e) => {
    e.preventDefault();
    if (newName && newName !== node.name) {
      renameNode(node.id, newName);
    }
    setIsRenaming(false);
  };

  const handleRenameBlur = () => {
    // Se il nodo è nuovo e l'utente non ha rinominato, eliminalo
    if (node.isNew && newName === node.name) {
      store.deleteNode(node.id);
    }
    setIsRenaming(false);
  };

  return (
    <div className="select-none">
      <div
        className={`flex items-center py-1 px-2 text-sm cursor-pointer whitespace-nowrap rounded transition-colors duration-100 ${
          isActive
            ? "bg-blue-600 text-white"
            : "hover:bg-editor-highlight text-editor-border"
        }`}
        style={{ paddingLeft: `${level * 12 + 8}px` }}
        onClick={handleClick}
        onContextMenu={onContextMenu}
      >
        {isFolder &&
          (isExpanded ? (
            <ChevronDown size={14} className="mr-1" />
          ) : (
            <ChevronRight size={14} className="mr-1" />
          ))}
        <IconComponent
          size={16}
          className={`mr-2 ${isFolder ? "text-yellow-500" : ""}`}
        />

        {isRenaming ? (
          <form onSubmit={handleRenameSubmit} onBlur={handleRenameBlur}>
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onFocus={(e) => e.target.select()}
              autoFocus
              className="bg-editor-highlight text-white border border-blue-600 rounded px-1 text-sm"
              onKeyDown={(e) => {
                if (e.key === "Escape") setIsRenaming(false);
              }}
            />
          </form>
        ) : (
          <span className={isDirty ? "italic" : ""}>{node.name}</span>
        )}
      </div>

      {isFolder && isExpanded && node.children && (
        <div className="pl-1">
          {node.children.map((childNode) => (
            <FileTreeNode
              key={childNode.id}
              node={childNode}
              level={level + 1}
              handleContextMenu={handleContextMenu}
              nodeToRename={nodeToRename}
              setNodeToRename={setNodeToRename}
            />
          ))}
        </div>
      )}
    </div>
  );
}

FileTreeNode.propTypes = {
  node: PropTypes.shape({
    id: PropTypes.string.isRequired,
    name: PropTypes.string.isRequired,
    isFolder: PropTypes.bool.isRequired,
    isDirty: PropTypes.bool.isRequired,
    children: PropTypes.array,
  }).isRequired,
  level: PropTypes.number,
  handleContextMenu: PropTypes.func.isRequired,
};

/**
 * Componente wrapper per l'albero dei file.
 */
export function FileTree({
  tree,
  handleContextMenu,
  nodeToRename,
  setNodeToRename,
}) {
  if (!tree || !tree.children || tree.children.length === 0) {
    return (
      <div className="text-editor-border text-sm p-2">
        Nessun file nel progetto.
      </div>
    );
  }

  return (
    <div className="space-y-0.5">
      {tree.children.map((node) => (
        <FileTreeNode
          key={node.id}
          node={node}
          level={0}
          handleContextMenu={handleContextMenu}
          nodeToRename={nodeToRename}
          setNodeToRename={setNodeToRename}
        />
      ))}
    </div>
  );
}

FileTree.propTypes = {
  tree: PropTypes.shape({
    id: PropTypes.string.isRequired,
    children: PropTypes.array,
  }).isRequired,
  handleContextMenu: PropTypes.func.isRequired,
  nodeToRename: PropTypes.string,
  setNodeToRename: PropTypes.func.isRequired,
};
