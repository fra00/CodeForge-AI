import React, { useState } from "react";
import PropTypes from "prop-types";
import { Copy, Check, Trash2, Bot, User } from "lucide-react";
import ReactMarkdown from "react-markdown";
import CodeBlock from "../ui/CodeBlock";

export function ChatMessage({ message, onDeleteMessage }) {
  const [isCopied, setIsCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(message.content);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const handleDelete = () => {
    if (window.confirm("Sei sicuro di voler eliminare questo messaggio?")) {
      onDeleteMessage(message.id);
    }
  };

  const isAssistant = message.role === "assistant";
  const Icon = isAssistant ? Bot : User;

  return (
    <div
      className={`group relative px-4 py-3 ${
        isAssistant ? "bg-editor-bg" : "bg-editor-darker"
      }`}
    >
      <div className="max-w-4xl mx-auto flex items-start space-x-4">
        <Icon
          size={20}
          className={`mt-1 flex-shrink-0 ${
            isAssistant ? "text-blue-400" : "text-green-400"
          }`}
        />
        <div className="flex-1 overflow-hidden">
          <div className="prose prose-sm prose-invert max-w-none text-white">
            <ReactMarkdown
              components={{
                code: ({ node, ...props }) => <CodeBlock {...props} />,
              }}
            >
              {message.content}
            </ReactMarkdown>
          </div>
        </div>
      </div>
      {/* Pulsanti di azione che appaiono su hover */}
      <div className="absolute top-2 right-4 flex items-center space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={handleCopy}
          className="p-1 text-gray-400 hover:text-white"
          title="Copia"
        >
          {isCopied ? (
            <Check size={16} className="text-green-500" />
          ) : (
            <Copy size={16} />
          )}
        </button>
        <button
          onClick={handleDelete}
          className="p-1 text-gray-400 hover:text-red-500"
          title="Elimina"
        >
          <Trash2 size={16} />
        </button>
      </div>
    </div>
  );
}

ChatMessage.propTypes = {
  message: PropTypes.shape({
    id: PropTypes.string.isRequired,
    role: PropTypes.string.isRequired,
    content: PropTypes.string.isRequired,
  }).isRequired,
  onDeleteMessage: PropTypes.func.isRequired,
  // onInsertCode è stato rimosso perché la logica è ora in CodeBlock
};
