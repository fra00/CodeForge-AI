import React from "react";
import { APIKeySettings } from "./APIKeySettings";
import { CustomPromptSettings } from "./CustomPromptSettings"; // Importa il nuovo componente
import { useSettingsStore } from "../../stores/useSettingsStore";
import { useAIStore } from "../../stores/useAIStore";
import Input from "../ui/Input";
import Select from "../ui/Select";
import ToggleSwitch from "../ui/ToggleSwitch";

/**
 * Componente principale per il pannello delle impostazioni.
 */
export function SettingsPanel() {
  const {
    fontSize,
    tabSize,
    wordWrap,
    minimapEnabled,
    aiModel,
    setFontSize,
    setTabSize,
    setWordWrap,
    setMinimapEnabled,
    setAiModel,
    isKnowledgeCacheEnabled,
    knowledgeCacheThreshold,
    setIsKnowledgeCacheEnabled,
    setKnowledgeCacheThreshold,
  } = useSettingsStore();

  const { updateChatKnowledge, currentChatId, conversations } = useAIStore();
  const currentChat = conversations.find((c) => c.id === currentChatId);
  const isSummarizing = currentChat?.isSummarizing || false;

  const wordWrapOptions = [
    { value: "off", label: "Off" },
    { value: "on", label: "On" },
  ];

  const aiModelOptions = [
    { value: "claude-3-opus-20240229", label: "Claude 3 Opus" },
    { value: "claude-3-5-sonnet-20240620", label: "Claude 3.5 Sonnet" },
    { value: "claude-3-haiku-20240307", label: "Claude 3 Haiku" },
  ];

  return (
    <div className="p-6 space-y-8 overflow-y-auto h-full bg-editor-bg text-white">
      <h1 className="text-2xl font-bold">Impostazioni</h1>

      {/* Sezione AI */}
      <section className="space-y-4">
        <h2 className="text-xl font-semibold border-b border-editor-border pb-2">
          AI Assistant
        </h2>
        <APIKeySettings />
        <CustomPromptSettings />
        <Select
          id="ai-model-select"
          label="Modello AI"
          options={aiModelOptions}
          value={aiModel}
          onChange={(e) => setAiModel(e.target.value)}
        />

        {/* Knowledge Cache Settings */}
        <div className="pt-4 border-t border-editor-border space-y-4">
          <h3 className="text-base font-medium text-white">
            Memoria a Lungo Termine
          </h3>
          <div className="flex items-center space-x-3">
            <ToggleSwitch
              id="knowledge-cache-toggle"
              checked={isKnowledgeCacheEnabled}
              onChange={() =>
                setIsKnowledgeCacheEnabled(!isKnowledgeCacheEnabled)
              }
            />
            <label
              htmlFor="knowledge-cache-toggle"
              className="text-sm text-editor-border cursor-pointer"
            >
              Abilita Knowledge Cache
            </label>
          </div>
          {isKnowledgeCacheEnabled && (
            <div className="space-y-3">
              <Input
                id="knowledge-threshold-input"
                label="Soglia Messaggi per Sintesi (5-50)"
                type="number"
                value={knowledgeCacheThreshold}
                onChange={(e) => setKnowledgeCacheThreshold(e.target.value)}
                min={5}
                max={50}
              />
              <button
                onClick={() =>
                  currentChatId && updateChatKnowledge(currentChatId)
                }
                disabled={isSummarizing || !currentChatId}
                className="w-full py-2 px-4 bg-purple-600 hover:bg-purple-500 text-white rounded text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSummarizing
                  ? "Sintesi in corso..."
                  : "Forza Sintesi Manuale"}
              </button>
            </div>
          )}
        </div>
      </section>

      {/* Sezione Editor */}
      <section className="space-y-4">
        <h2 className="text-xl font-semibold border-b border-editor-border pb-2">
          Editor
        </h2>
        <Input
          id="font-size-input"
          label="Dimensione Font (px)"
          type="number"
          value={fontSize}
          onChange={(e) => setFontSize(Number(e.target.value))}
          min={10}
          max={30}
        />
        <Input
          id="tab-size-input"
          label="Dimensione Tab"
          type="number"
          value={tabSize}
          onChange={(e) => setTabSize(Number(e.target.value))}
          min={1}
          max={8}
        />
        <Select
          id="word-wrap-select"
          label="A capo automatico"
          options={wordWrapOptions}
          value={wordWrap}
          onChange={(e) => setWordWrap(e.target.value)}
        />
        <div className="flex items-center space-x-3">
          <ToggleSwitch
            id="minimap-toggle"
            checked={minimapEnabled}
            onChange={() => setMinimapEnabled(!minimapEnabled)}
          />
          <label
            htmlFor="minimap-toggle"
            className="text-sm text-editor-border"
          >
            Minimappa
          </label>
        </div>
      </section>
    </div>
  );
}
