import React from "react";
import PropTypes from "prop-types";
import ReactMarkdown from "react-markdown";
import { Copy, User, Bot, Code } from "lucide-react";
import CodeBlock from "../ui/CodeBlock"; // Assumo che questo componente gestisca l'highlighting
import Button from "../ui/Button";

/**
 * Componente per il rendering di un singolo messaggio nella chat AI.
 * Gestisce il rendering Markdown, l'highlighting del codice e le azioni.
 */
export function ChatMessage({ message, onInsertCode }) {
  const isUser = message.role === "user";
  const avatar = isUser ? <User size={18} /> : <Bot size={18} />;
  const bgColor = isUser ? "bg-editor-highlight" : "bg-editor-darker";
  const textColor = "text-white";

  // Custom renderer per i blocchi di codice in Markdown
  const components = {
    code({ node, inline, className, children, ...props }) {
      const match = /language-(\w+)/.exec(className || "");
      const language = match ? match[1] : "text";
      const codeContent = String(children).replace(/\n$/, "");

      if (inline) {
        return (
          <code className={className} {...props}>
            {codeContent}
          </code>
        );
      }

      return (
        <div className="my-2 rounded-md overflow-hidden">
          <div className="flex justify-between items-center bg-editor-border px-3 py-1 text-xs text-editor-bg">
            <span className="font-mono">{language.toUpperCase()}</span>
            <div className="space-x-2">
              <Button
                onClick={() => navigator.clipboard.writeText(codeContent)}
                variant="ghost"
                size="small"
                className="p-1 text-xs hover:bg-editor-highlight"
                title="Copia Codice"
              >
                <Copy size={14} />
              </Button>
              <Button
                onClick={() => onInsertCode(codeContent)}
                variant="ghost"
                size="small"
                className="p-1 text-xs hover:bg-editor-highlight"
                title="Inserisci in Editor"
              >
                <Code size={14} />
              </Button>
            </div>
          </div>
          <CodeBlock language={language} code={codeContent} />
        </div>
      );
    },
  };

  return (
    <div className={`flex p-4 ${bgColor} ${textColor}`}>
      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center mr-4">
        {avatar}
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-semibold mb-1">
          {isUser ? "Tu" : "CodeForge AI"}
        </div>
        <div className="prose prose-invert max-w-none text-sm">
          <ReactMarkdown components={components}>
            {message.content}
          </ReactMarkdown>
        </div>
      </div>
    </div>
  );
}

ChatMessage.propTypes = {
  message: PropTypes.shape({
    id: PropTypes.string.isRequired,
    role: PropTypes.oneOf(["user", "assistant"]).isRequired,
    content: PropTypes.string.isRequired,
    timestamp: PropTypes.string.isRequired,
  }).isRequired,
  onInsertCode: PropTypes.func.isRequired,
};
