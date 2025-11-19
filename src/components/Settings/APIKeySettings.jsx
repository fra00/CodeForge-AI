import React, { useState } from "react";
import Input from "../ui/Input";
import Button from "../ui/Button";
import Alert from "../ui/Alert";
import ToggleSwitch from "../ui/ToggleSwitch";
import Select from "../ui/Select";
import { testAPIKey } from "../../utils/aiService";
import { useSettingsStore } from "../../stores/useSettingsStore";

const CLAUDE_MODELS = [
  { value: 'claude-3-5-sonnet-20240620', label: 'Claude 3.5 Sonnet (Raccomandato)' },
  { value: 'claude-3-opus-20240229', label: 'Claude 3 Opus' },
  { value: 'claude-3-sonnet-20240229', label: 'Claude 3 Sonnet' },
  { value: 'claude-3-haiku-20240307', label: 'Claude 3 Haiku' },
];

const GEMINI_MODELS = [
  { value: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash (Raccomandato)' },
  { value: 'gemini-2.5-pro', label: 'Gemini 2.5 Pro' },
];

const PROVIDER_OPTIONS = [
  { value: 'claude', label: 'Anthropic Claude' },
  { value: 'gemini', label: 'Google Gemini' },
];

/**
 * Componente per la configurazione della chiave API e del modello LLM.
 */
export function APIKeySettings() {
  const { 
    aiProvider, 
    llmModel, 
    claudeApiKey, 
    geminiApiKey, 
    setAiProvider, 
    setLlmModel, 
    setClaudeApiKey, 
    setGeminiApiKey 
  } = useSettingsStore();
  
  const [showKey, setShowKey] = useState(false);
  const [testStatus, setTestStatus] = useState(null); // null, 'success', 'error', 'loading'

  const currentApiKey = aiProvider === 'claude' ? claudeApiKey : geminiApiKey;
  const setApiKey = aiProvider === 'claude' ? setClaudeApiKey : setGeminiApiKey;
  const currentModels = aiProvider === 'claude' ? CLAUDE_MODELS : GEMINI_MODELS;
  const apiName = aiProvider === 'claude' ? 'Anthropic' : 'Gemini';
  const apiPlaceholder = aiProvider === 'claude' ? 'sk-ant-api03-...' : 'AIzaSy...';
  const consoleUrl = aiProvider === 'claude' ? 'https://console.anthropic.com' : 'https://ai.google.dev/gemini-api/docs/api-key';

  // Sincronizza il modello se il provider cambia e il modello corrente non è valido
  React.useEffect(() => {
    if (!currentModels.some(m => m.value === llmModel)) {
      // Imposta il primo modello come default
      setLlmModel(currentModels.value); // FIX: Access the value of the first model object
    }
  }, [aiProvider, llmModel, setLlmModel, currentModels]);


  const handleSave = () => {
    // Le chiavi API sono già salvate nello store Zustand (persistente)
    setTestStatus(null); // Resetta lo stato del test al salvataggio
    alert("Impostazioni AI salvate con successo!");
  };

  const handleTest = async () => {
    if (!currentApiKey) {
      setTestStatus("error");
      return;
    }
    setTestStatus("loading");
    try {
      const isValid = await testAPIKey(aiProvider, currentApiKey, llmModel);
      if (isValid) {
        setTestStatus("success");
      } else {
        setTestStatus("error");
      }
    } catch (error) {
      setTestStatus("error");
      console.error("API Test Error:", error);
    }
  };

  return (
    <div className="space-y-6 p-4">
      <h2 className="text-xl font-semibold text-white">
        Configurazione AI Assistant
      </h2>

      <Alert variant="warning">
        <p className="font-bold">⚠️ Sicurezza:</p>
        <p className="text-sm">
          La tua API key è salvata **SOLO** nel browser (IndexedDB). Non
          viene mai inviata a server esterni, solo direttamente al provider.
        </p>
        <p className="text-xs mt-2">
          Ottieni una key su:{" "}
          <a
            href={consoleUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-400 hover:text-blue-300"
          >
            {consoleUrl}
          </a>
        </p>
      </Alert>

      <Select
        id="ai-provider-select"
        label="Provider AI"
        options={PROVIDER_OPTIONS}
        value={aiProvider}
        onChange={(e) => setAiProvider(e.target.value)}
      />
      
      <Select
        id="llm-model-select"
        label={`Modello LLM (${apiName})`}
        options={currentModels}
        value={llmModel}
        onChange={(e) => setLlmModel(e.target.value)}
      />

      <div className="flex items-end space-x-3">
        <div className="flex-1">
          <Input
            id={`${aiProvider}-api-key`}
            label={`${apiName} API Key`}
            type={showKey ? "text" : "password"}
            value={currentApiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder={apiPlaceholder}
          />
        </div>
        <Button onClick={handleSave} disabled={!currentApiKey} className="h-10">
          Salva Impostazioni
        </Button>
        <Button
          onClick={handleTest}
          disabled={!currentApiKey || testStatus === "loading"}
          variant="secondary"
          className="h-10"
        >
          {testStatus === "loading" ? "Test in corso..." : "Test Connessione"}
        </Button>
      </div>

      <div className="flex items-center space-x-3">
        <ToggleSwitch
          id="show-api-key"
          checked={showKey}
          onChange={() => setShowKey(!showKey)}
        />
        <label htmlFor="show-api-key" className="text-sm text-editor-border">
          Mostra API Key
        </label>
      </div>

      {testStatus === "success" && (
        <Alert variant="success">Connessione API riuscita con {apiName}!</Alert>
      )}
      {testStatus === "error" && (
        <Alert variant="danger">
          Test fallito. Verifica la chiave o lo stato del tuo account {apiName}.
        </Alert>
      )}
    </div>
  );
}
