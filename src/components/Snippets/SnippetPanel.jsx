import React, { useState, useMemo } from "react";
import PropTypes from "prop-types";
import { Search, Plus } from "lucide-react";
import Fuse from "fuse.js";
import { useSnippetStore } from "../../stores/useSnippetStore";
import { useFileStore } from "../../stores/useFileStore";
import { SnippetCard } from "./SnippetCard";
import Input from "../ui/Input";

/**
 * Componente per la barra di ricerca degli snippet.
 */
function SnippetSearch({ searchTerm, onSearchChange, onAddSnippet }) {
  return (
    <div className="flex space-x-3 p-4 border-b border-editor-border">
      <Input
        id="snippet-search"
        type="text"
        placeholder="Cerca snippet per titolo, tag o codice..."
        value={searchTerm}
        onChange={(e) => onSearchChange(e.target.value)}
        className="flex-grow"
        // L'icona è gestita dal componente Input UI
      />
      <button
        onClick={onAddSnippet}
        className="p-2 rounded bg-blue-600 text-white hover:bg-blue-700 transition-colors duration-150"
        title="Aggiungi Snippet Custom"
      >
        <Plus size={20} />
      </button>
    </div>
  );
}

SnippetSearch.propTypes = {
  searchTerm: PropTypes.string.isRequired,
  onSearchChange: PropTypes.func.isRequired,
  onAddSnippet: PropTypes.func.isRequired,
};

/**
 * Pannello principale per la gestione e visualizzazione degli snippet.
 */
export function SnippetPanel() {
  const [searchTerm, setSearchTerm] = useState("");
  const snippetStore = useSnippetStore();
  const fileStore = useFileStore();
  
  const allSnippets = useMemo(() => snippetStore.getAllSnippets(), [snippetStore.customSnippets]);
  const activeFile = useMemo(() => fileStore.getActiveFile(), [fileStore.activeFileId, fileStore.files]);
  const updateFileContent = fileStore.updateFileContent;

  // Inizializza Fuse.js per la ricerca fuzzy
  const fuse = useMemo(
    () =>
      new Fuse(allSnippets, {
        keys: ["title", "tags", "code", "language"],
        threshold: 0.3,
      }),
    [allSnippets]
  );

  // Filtra gli snippet in base al termine di ricerca
  const filteredSnippets = useMemo(() => {
    if (!searchTerm) {
      return allSnippets;
    }
    return fuse.search(searchTerm).map((result) => result.item);
  }, [searchTerm, allSnippets, fuse]);

  // Funzione per inserire lo snippet nel file attivo
  const handleInsertSnippet = (code) => {
    if (!activeFile) {
      alert("Nessun file attivo. Apri un file per inserire lo snippet.");
      return;
    }
    const newContent = activeFile.content + "\n\n" + code;
    updateFileContent(activeFile.id, newContent);
    alert(`Snippet inserito in ${activeFile.name}`);
  };

  // Placeholder per l'aggiunta di un nuovo snippet (sarà un modale)
  const handleAddSnippet = () => {
    alert("Aggiungi Snippet Custom (WIP: Modale di creazione)");
  };

  return (
    <div className="flex flex-col h-full bg-editor-bg overflow-hidden">
      <SnippetSearch
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        onAddSnippet={handleAddSnippet}
      />
      <div className="flex-grow overflow-y-auto p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredSnippets.length > 0 ? (
          filteredSnippets.map((snippet) => (
            <SnippetCard
              key={snippet.id}
              snippet={snippet}
              onInsert={handleInsertSnippet}
            />
          ))
        ) : (
          <div className="col-span-full text-center text-editor-border p-10">
            Nessun snippet trovato per "{searchTerm}".
          </div>
        )}
      </div>
    </div>
  );
}
