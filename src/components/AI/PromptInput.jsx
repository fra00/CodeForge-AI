import React, { useState, useCallback, useRef, useEffect } from "react";
import PropTypes from "prop-types";
import { Send, Loader2, StopCircle } from "lucide-react";
import Textarea from "../ui/Textarea";
import Button from "../ui/Button";

/**
 * Componente per l'input del prompt dell'AI Assistant.
 * Include auto-resize e gestione di Ctrl+Enter per l'invio.
 */
export function PromptInput({ onSend, onStop, isGenerating }) {
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
        <div className="ml-3 flex flex-col items-center">
          {isGenerating && (
            <Button
              onClick={onStop}
              className="h-10 w-10 mb-2 flex-shrink-0 flex items-center justify-center bg-red-500/20 text-red-400 hover:bg-red-500/40"
            >
              <span>
                <StopCircle size={20} />
              </span>
            </Button>
          )}
          <Button
            onClick={handleSend}
            disabled={isGenerating || !prompt.trim()}
            className="h-10 w-10 flex-shrink-0 flex items-center justify-center"
          >
            <span>
              {isGenerating ? (
                <Loader2 size={20} className="animate-spin" />
              ) : (
                <Send size={20} />
              )}
            </span>
          </Button>
        </div>
      </div>
    </div>
  );
}

PromptInput.propTypes = {
  onSend: PropTypes.func.isRequired,
  onStop: PropTypes.func.isRequired,
  isGenerating: PropTypes.bool.isRequired,
};
