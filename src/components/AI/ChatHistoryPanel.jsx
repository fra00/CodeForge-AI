import React from "react";
import PropTypes from "prop-types";
import {
  PanelLeftClose,
  PanelRightOpen,
  PlusCircle,
  Trash2,
} from "lucide-react";
import { useSettingsStore } from "../../stores/useSettingsStore";
import Tooltip from "../ui/Tooltip";

/**
 * Pannello collassabile che mostra la cronologia delle chat e i controlli.
 */
export function ChatHistoryPanel({
  conversations,
  currentChatId,
  onSelectChat,
  onNewChat,
  onDeleteChat,
}) {
  const { chatHistoryVisible, toggleChatHistory } = useSettingsStore();

  return (
    <aside
      className={`bg-editor-darker border-r border-editor-border flex flex-col flex-shrink-0 transition-width duration-200 ease-in-out ${
        chatHistoryVisible ? "w-64" : "w-10"
      }`}
    >
      {/* Header con pulsante di collasso */}
      <div className="flex items-center justify-between p-2 border-b border-editor-border h-10">
        {chatHistoryVisible && (
          <h2 className="text-xs font-bold uppercase text-white whitespace-nowrap overflow-hidden">
            Conversazioni
          </h2>
        )}
        <Tooltip text="Toggle History">
          <button
            onClick={toggleChatHistory}
            className="text-white hover:bg-editor-highlight"
          >
            {chatHistoryVisible ? (
              <PanelLeftClose size={18} />
            ) : (
              <PanelRightOpen size={18} />
            )}
          </button>
        </Tooltip>
      </div>

      {/* Toolbar con pulsante Nuova Chat */}
      {chatHistoryVisible && (
        <div className="flex justify-end items-center h-10 px-2 border-b border-editor-border text-white">
          <Tooltip text="Nuova Chat">
            <button
              onClick={onNewChat}
              className="p-1 rounded hover:bg-editor-highlight transition-colors duration-150"
            >
              <PlusCircle size={16} />
            </button>
          </Tooltip>
        </div>
      )}

      {/* Lista delle conversazioni */}
      {chatHistoryVisible && (
        <div className="p-2 overflow-y-auto text-sm text-editor-foreground flex-grow">
          {conversations.map((chat) => (
            <div
              key={chat.id}
              onClick={() => onSelectChat(chat.id)}
              className={`group flex justify-between items-center p-2 rounded cursor-pointer truncate ${
                chat.id === currentChatId
                  ? "bg-editor-highlight text-white"
                  : "hover:bg-editor-highlight"
              }`}
            >
              <span className="truncate">{chat.title}</span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDeleteChat(chat.id);
                }}
                className="ml-2 text-gray-500 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>
      )}
    </aside>
  );
}

ChatHistoryPanel.propTypes = {
  conversations: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string.isRequired,
      title: PropTypes.string.isRequired,
    })
  ).isRequired,
  currentChatId: PropTypes.string,
  onSelectChat: PropTypes.func.isRequired,
  onNewChat: PropTypes.func.isRequired,
  onDeleteChat: PropTypes.func.isRequired,
};
