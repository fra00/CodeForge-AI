import React, { useState, useCallback, useRef, useEffect } from "react";
import PropTypes from "prop-types";
import { Send, Loader2, StopCircle, Sparkles } from "lucide-react";
import Textarea from "../ui/Textarea";
import Button from "../ui/Button";

/**
 * Componente per l'input del prompt dell'AI Assistant.
 * Include auto-resize, invio, estensione del prompt e stop.
 */
export function PromptInput({
  onSend,
  onExtend,
  onStop,
  isGenerating,
  initialPrompt,
}) {
  const [prompt, setPrompt] = useState("");
  const [isExtending, setIsExtending] = useState(false);
  const textareaRef = useRef(null);

  const handleSend = useCallback(() => {
    const trimmedPrompt = prompt.trim();
    if (trimmedPrompt && onSend && !isGenerating && !isExtending) {
      onSend(trimmedPrompt);
      setPrompt("");
    }
  }, [prompt, onSend, isGenerating, isExtending]);

  const handleExtend = useCallback(async () => {
    const trimmedPrompt = prompt.trim();
    if (trimmedPrompt && onExtend && !isGenerating && !isExtending) {
      setIsExtending(true);
      try {
        const extended = await onExtend(trimmedPrompt);
        setPrompt(extended);
      } catch (error) {
        console.error("Failed to extend prompt:", error);
      } finally {
        setIsExtending(false);
      }
    }
  }, [prompt, onExtend, isGenerating, isExtending]);

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

  const isLoading = isGenerating || isExtending;

  // Auto-resize della textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [prompt]);

  // Imposta il prompt se viene fornito un valore iniziale
  useEffect(() => {
    if (initialPrompt) {
      setPrompt(initialPrompt);
    }
  }, [initialPrompt]);

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
          disabled={isLoading}
          ref={textareaRef} // Passa il ref alla textarea interna
          className="flex-1 resize-none max-h-40"
        />
        <div className="ml-3 flex flex-col items-center space-y-2">
          <Button
            onClick={handleExtend}
            disabled={isLoading || !prompt.trim()}
            className="h-10 w-10 flex-shrink-0 flex items-center justify-center bg-purple-500/20 text-purple-400 hover:bg-purple-500/40"
            title="Estendi prompt con 2WHAV"
          >
            <span>
              {isExtending ? (
                <Loader2 size={20} className="animate-spin" />
              ) : (
                <Sparkles size={20} />
              )}
            </span>
          </Button>

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
            disabled={isLoading || !prompt.trim()}
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
  onExtend: PropTypes.func.isRequired,
  onStop: PropTypes.func.isRequired,
  isGenerating: PropTypes.bool.isRequired,
  initialPrompt: PropTypes.string,
};
