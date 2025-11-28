import React, { useState, useCallback, useRef, useEffect } from "react";
import PropTypes from "prop-types";
import { Send, Zap } from "lucide-react";
import Textarea from "../ui/Textarea";
import Button from "../ui/Button";
import { promptTemplates } from "../../data/aiPrompts";
import Tooltip from "../ui/Tooltip";

/**
 * Componente per l'input del prompt dell'AI Assistant.
 * Include auto-resize e gestione di Ctrl+Enter per l'invio.
 */
export function PromptInput({ onSend, isGenerating }) {
  const [prompt, setPrompt] = useState("");
  const textareaRef = useRef(null);

  const handleSend = useCallback(() => {
    const trimmedPrompt = prompt.trim();
    if (trimmedPrompt && onSend) {
      onSend(trimmedPrompt);
      setPrompt("");
    }
  }, [prompt, onSend]);

  const handleKeyDown = useCallback(
    (e) => {
      // Invia con Ctrl+Enter o Cmd+Enter
      if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        handleSend();
      }
    },
    [handleSend]
  );

  // Auto-resize della textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [prompt]);

  const handleTemplateClick = (template) => {
    setPrompt(template.template.replace("{code}", "")); // Inizializza il prompt senza {code}
    textareaRef.current?.focus();
  };

  return (
    <div className="flex flex-col p-4 border-t border-editor-border bg-editor-darker">
      {/* Prompt Input */}
      <div className="flex items-end">
        <Textarea
          id="ai-prompt-input"
          placeholder="Chiedi all'AI di generare codice, spiegare, o refactorare (Ctrl+Enter per inviare)"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={isGenerating}
          ref={textareaRef} // Passa il ref alla textarea interna
          className="flex-1 resize-none max-h-40"
        />
        <Button
          onClick={handleSend}
          disabled={!prompt.trim() || isGenerating}
          className="ml-3 h-10 w-10 flex-shrink-0"
        >
          <Send size={20} />
        </Button>
      </div>
    </div>
  );
}

PromptInput.propTypes = {
  onSend: PropTypes.func.isRequired,
  isGenerating: PropTypes.bool.isRequired,
};
