import React, { useState, useMemo } from "react";
import PropTypes from "prop-types";
import { Search } from "lucide-react";
import Fuse from "fuse.js";
import { useFileStore } from "../../stores/useFileStore";
import { templates } from "../../data/templates";
import { TemplateCard } from "./TemplateCard";
import Input from "../ui/Input";

/**
 * Componente per la barra di ricerca dei template.
 */
function TemplateSearch({ searchTerm, onSearchChange }) {
  return (
    <div className="flex space-x-3 p-4 border-b border-editor-border">
      <Input
        id="template-search"
        type="text"
        placeholder="Cerca template per nome o tag..."
        value={searchTerm}
        onChange={(e) => onSearchChange(e.target.value)}
        className="flex-grow"
        // L'icona è gestita dal componente Input UI
      />
    </div>
  );
}

TemplateSearch.propTypes = {
  searchTerm: PropTypes.string.isRequired,
  onSearchChange: PropTypes.func.isRequired,
};

/**
 * Pannello principale per la galleria dei template.
 */
export function TemplatePanel() {
  const [searchTerm, setSearchTerm] = useState("");
  const fileStore = useFileStore();
  const rootId = fileStore.rootId;

  const allTemplates = useMemo(() => Object.values(templates), []);

  // Inizializza Fuse.js per la ricerca fuzzy
  const fuse = useMemo(
    () =>
      new Fuse(allTemplates, {
        keys: ["name", "tags", "description"],
        threshold: 0.3,
      }),
    [allTemplates]
  );

  // Filtra i template in base al termine di ricerca
  const filteredTemplates = useMemo(() => {
    if (!searchTerm) {
      return allTemplates;
    }
    return fuse.search(searchTerm).map((result) => result.item);
  }, [searchTerm, allTemplates, fuse]);

  // Funzione per caricare un template nel file system
  const handleSelectTemplate = (templateId) => {
    const template = templates[templateId];
    if (!template) return;

    if (
      !window.confirm(
        `Sei sicuro di voler caricare il template "${template.name}"? Tutti i file correnti verranno eliminati.`
      )
    ) {
      return;
    }

    // Logica per eliminare i file esistenti e caricare il template
    const fileStore = useFileStore.getState();

    // 1. Elimina tutti i file esistenti (tranne la root)
    fileStore.files[rootId].children.forEach((childId) => {
      fileStore.deleteNode(childId);
    });

    // 2. Aggiunge i nuovi file del template
    Object.values(template.files).forEach((file) => {
      fileStore.createFileOrFolder(rootId, file.name, false, file.content);
    });

    alert(`Template "${template.name}" caricato con successo!`);
  };

  return (
    <div className="flex flex-col h-full bg-editor-bg overflow-hidden">
      <TemplateSearch searchTerm={searchTerm} onSearchChange={setSearchTerm} />
      <div className="flex-grow overflow-y-auto p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredTemplates.length > 0 ? (
          filteredTemplates.map((template) => (
            <TemplateCard
              key={template.id}
              template={template}
              onSelect={handleSelectTemplate}
            />
          ))
        ) : (
          <div className="col-span-full text-center text-editor-border p-10">
            Nessun template trovato per "{searchTerm}".
          </div>
        )}
      </div>
    </div>
  );
}
