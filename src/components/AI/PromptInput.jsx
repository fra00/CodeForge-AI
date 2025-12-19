import React, {
  useState,
  useCallback,
  useRef,
  useEffect,
  useMemo,
} from "react";
import PropTypes from "prop-types";
import { useAIStore } from "../../stores/useAIStore";
import { useFileStore } from "../../stores/useFileStore";
import {
  Send,
  Loader2,
  StopCircle,
  Sparkles,
  Paperclip,
  X,
} from "lucide-react";
import Textarea from "../ui/Textarea";
import Button from "../ui/Button";
import Dialog from "../ui/Dialog";
import { FileTree } from "../FileSystem/FileTree";

/**
 * Componente per l'input del prompt dell'AI Assistant.
 * Include auto-resize, invio, estensione del prompt e stop.
 */
export function PromptInput({ onSend, onStop, isGenerating, onExtend }) {
  const [prompt, setPrompt] = useState("");
  const [isExtending, setIsExtending] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Store
  const {
    initialPrompt,
    consumeInitialPrompt,
    contextFiles,
    addContextFile,
    removeContextFile,
  } = useAIStore();
  const { getTree, rootId } = useFileStore();
  const tree = useMemo(() => getTree(), [getTree]);

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
    if (trimmedPrompt && onExtend && !isGenerating) {
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
  }, [prompt, onExtend, isGenerating]);

  const handleKeyDown = useCallback(
    (e) => {
      if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        handleSend();
      }
    },
    [handleSend]
  );

  const handleFileSelect = (path) => {
    addContextFile(path);
  };

  const isLoading = isGenerating || isExtending;

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [prompt]);

  useEffect(() => {
    if (initialPrompt) {
      setPrompt(initialPrompt);
      consumeInitialPrompt();
    }
  }, [initialPrompt, consumeInitialPrompt]);

  return (
    <>
      <div className="flex flex-col p-4 border-t border-editor-border bg-editor-darker">
        {/* Area File di Contesto */}
        {contextFiles.length > 0 && (
          <div className="mb-2 p-2 border border-editor-border rounded-md bg-editor-bg">
            <h4 className="text-xs font-semibold text-gray-400 mb-2">
              File di Contesto:
            </h4>
            <div className="flex flex-wrap gap-2">
              {contextFiles.map((path) => (
                <div
                  key={path}
                  className="flex items-center bg-editor-highlight text-white text-xs px-2 py-1 rounded-full"
                >
                  <span>{path.split("/").pop()}</span>
                  <button
                    onClick={() => removeContextFile(path)}
                    className="ml-2 text-gray-400 hover:text-white"
                  >
                    <X size={14} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Prompt Input */}
        <div className="flex items-end">
          <Button
            onClick={() => setIsModalOpen(true)}
            className="h-10 w-10 mr-2 flex-shrink-0 flex items-center justify-center"
            title="Aggiungi file al contesto"
          >
            <span>
              <Paperclip size={20} />
            </span>
          </Button>

          <Textarea
            id="ai-prompt-input"
            placeholder="Chiedi all'AI di generare codice, spiegare, o refactorare (Ctrl+Enter per inviare)"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isLoading}
            ref={textareaRef}
            className="flex-1 resize-none max-h-40 overflow-y-auto"
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

      {/* Modale Selezione File */}
      <Dialog
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Seleziona File di Contesto"
        initialWidth={400}
        initialHeight={500}
      >
        <div className="h-full overflow-y-auto">
          {tree ? (
            <FileTree
              tree={tree}
              onFileClick={handleFileSelect}
              handleContextMenu={(e) => e.preventDefault()} // Disabilita context menu
              nodeToRename={null}
              setNodeToRename={() => {}}
            />
          ) : (
            <p>Caricamento albero file...</p>
          )}
        </div>
      </Dialog>
    </>
  );
}

PromptInput.propTypes = {
  onSend: PropTypes.func.isRequired,
  onStop: PropTypes.func.isRequired,
  isGenerating: PropTypes.bool.isRequired,
  onExtend: PropTypes.func,
};
