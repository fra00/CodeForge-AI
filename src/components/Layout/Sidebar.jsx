import React from "react";
import PropTypes from "prop-types";
import { FileText, Bot, BookOpen, LayoutGrid, Settings } from "lucide-react";
import Tooltip from "../ui/Tooltip";

/**
 * Componente per la barra laterale di navigazione.
 * Permette di cambiare il pannello attivo (Editor, AI, Snippets, Templates, Settings).
 */
export function Sidebar({ activePanel, onPanelChange }) {
  const navItems = [
    { id: "editor", icon: FileText, label: "Editor" },
    { id: "ai", icon: Bot, label: "AI Assistant" },
    { id: "snippets", icon: BookOpen, label: "Snippets" },
    { id: "templates", icon: LayoutGrid, label: "Templates" },
    { id: "settings", icon: Settings, label: "Settings" },
  ];

  return (
    <aside className="w-14 bg-editor-darker border-r border-editor-border flex flex-col items-center py-4 space-y-4">
      {navItems.map((item) => {
        const IconComponent = item.icon;
        const isActive = item.id === activePanel;

        return (
          <Tooltip key={item.id} text={item.label}>
            <button
              onClick={() => onPanelChange(item.id)}
              className={`p-2 rounded transition-colors duration-150 ${
                isActive
                  ? "text-white bg-blue-600"
                  : "text-editor-border hover:text-white hover:bg-editor-highlight"
              }`}
              title={item.label}
            >
              <IconComponent size={24} />
            </button>
          </Tooltip>
        );
      })}
    </aside>
  );
}

Sidebar.propTypes = {
  activePanel: PropTypes.oneOf([
    "editor",
    "ai",
    "snippets",
    "templates",
    "settings",
  ]).isRequired,
  onPanelChange: PropTypes.func.isRequired,
};
