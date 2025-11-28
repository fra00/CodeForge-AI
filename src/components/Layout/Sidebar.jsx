import React from "react";
import PropTypes from "prop-types";
import { FileText, Bot, Settings, MonitorPlay } from "lucide-react";
import Tooltip from "../ui/Tooltip";
import { useMediaQuery } from "../../hooks/useMediaQuery";

/**
 * Componente per la barra laterale di navigazione.
 * Permette di cambiare il pannello attivo (Editor, AI, Snippets, Templates, Settings).
 */
export function Sidebar({ activePanel, onPanelChange }) {
  const isMobile = useMediaQuery("(max-width: 768px)");

  const navItems = [
    { id: "editor", icon: FileText, label: "Editor" },
    { id: "ai", icon: Bot, label: "AI Assistant" },
  ];

  // Aggiungi l'icona della preview solo su mobile
  if (isMobile) {
    navItems.splice(2, 0, {
      id: "live-preview",
      icon: MonitorPlay,
      label: "Preview",
    });
  }

  return (
    <aside className="w-14 bg-editor-darker border-r border-editor-border flex flex-col items-center justify-between py-4">
      {/* Main navigation items */}
      <div className="flex flex-col items-center space-y-4">
        {navItems.map((item) => (
          <SidebarButton
            key={item.id}
            item={item}
            isActive={item.id === activePanel}
            onClick={() => onPanelChange(item.id)}
          />
        ))}
      </div>

      {/* Settings button at the bottom */}
      <div className="flex flex-col items-center">
        <SidebarButton
          item={{ id: "settings", icon: Settings, label: "Settings" }}
          isActive={activePanel === "settings"}
          onClick={() => onPanelChange("settings")}
        />
      </div>
    </aside>
  );
}

const SidebarButton = ({ item, isActive, onClick }) => (
  <Tooltip text={item.label}>
    <button
      onClick={onClick}
      className={`p-2 rounded transition-colors duration-150 ${
        isActive
          ? "text-white bg-blue-600"
          : "text-gray-400 hover:text-white hover:bg-editor-highlight"
      }`}
      title={item.label}
    >
      <item.icon size={24} />
    </button>
  </Tooltip>
);

Sidebar.propTypes = {
  activePanel: PropTypes.oneOf([
    "editor",
    "ai",
    "settings",
    "live-preview", // Aggiunto per validazione
  ]).isRequired,
  onPanelChange: PropTypes.func.isRequired,
};
