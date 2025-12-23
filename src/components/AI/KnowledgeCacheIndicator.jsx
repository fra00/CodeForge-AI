import React, { useState, useEffect } from "react";
import { Brain, X, Save, Edit2 } from "lucide-react";
import { useAIStore } from "../../stores/useAIStore";
import { useSettingsStore } from "../../stores/useSettingsStore";

export function KnowledgeCacheIndicator() {
  const { conversations, currentChatId, setKnowledgeSummary } = useAIStore();
  const { isKnowledgeCacheEnabled } = useSettingsStore();
  const [isOpen, setIsOpen] = useState(false);
  const [summary, setSummary] = useState("");
  const [isEditing, setIsEditing] = useState(false);

  const currentChat = conversations.find((c) => c.id === currentChatId);
  const isSummarizing = currentChat?.isSummarizing;

  useEffect(() => {
    // Aggiorna il sommario solo se il modale è aperto E l'utente NON sta modificando.
    // Questo previene la sovrascrittura del lavoro dell'utente se arriva un aggiornamento in background.
    if (isOpen && currentChat && !isEditing) {
      setSummary(currentChat.knowledgeSummary || "");
    }
  }, [isOpen, currentChat, isEditing]);

  if (!isKnowledgeCacheEnabled || !currentChat) {
    return null;
  }

  const handleSave = () => {
    setKnowledgeSummary(currentChatId, summary);
    setIsEditing(false);
    setIsOpen(false);
  };

  return (
    <>
      <button
        onClick={() => {
          setIsOpen(true);
          setIsEditing(false);
        }}
        className="p-1.5 text-purple-400 hover:text-purple-300 hover:bg-white/10 rounded-md transition-colors flex items-center gap-2 mr-2"
        title="Knowledge Cache (Memoria a Lungo Termine)"
      >
        <Brain size={16} className={isSummarizing ? "animate-pulse" : ""} />
        <span className="text-xs font-medium hidden sm:inline">Memoria</span>
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-editor-bg border border-editor-border rounded-lg shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col animate-in fade-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-editor-border">
              <div className="flex items-center gap-2 text-purple-400">
                <Brain size={20} />
                <h3 className="font-semibold text-white">Knowledge Cache</h3>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-hidden p-0 flex flex-col">
              {isEditing ? (
                <textarea
                  value={summary}
                  onChange={(e) => setSummary(e.target.value)}
                  className="flex-1 w-full bg-[#111] text-gray-300 p-4 focus:outline-none resize-none font-mono text-sm leading-relaxed"
                  placeholder="La memoria è vuota..."
                  spellCheck={false}
                />
              ) : (
                <div className="flex-1 overflow-y-auto p-4 text-gray-300 font-mono text-sm whitespace-pre-wrap leading-relaxed">
                  {summary || (
                    <span className="text-gray-500 italic">
                      Nessuna memoria presente. Clicca su Modifica per
                      aggiungerne una manualmente.
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-editor-border flex justify-between items-center bg-[#252525]">
              <div className="text-xs text-gray-500">
                {isEditing
                  ? "Modifica manuale della memoria AI"
                  : "Visualizzazione memoria a lungo termine"}
              </div>
              <div className="flex gap-2">
                {isEditing ? (
                  <>
                    <button
                      onClick={() => setIsEditing(false)}
                      className="px-3 py-1.5 text-sm text-gray-400 hover:text-white transition-colors"
                    >
                      Annulla
                    </button>
                    <button
                      onClick={handleSave}
                      className="px-3 py-1.5 text-sm bg-purple-600 hover:bg-purple-500 text-white rounded flex items-center gap-2 transition-colors font-medium"
                    >
                      <Save size={14} /> Salva
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => setIsEditing(true)}
                    className="px-3 py-1.5 text-sm bg-[#333] hover:bg-[#444] text-white rounded flex items-center gap-2 transition-colors border border-[#444]"
                  >
                    <Edit2 size={14} /> Modifica
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
