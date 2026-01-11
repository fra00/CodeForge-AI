import React from "react";
import { useAIStore } from "../../stores/useAIStore";
import { LivePreview } from "./LivePreview";
import { BuildPanel } from "./BuildPanel";

export function PreviewContainer({ onRefresh, className = "" }) {
  const currentChatId = useAIStore((state) => state.currentChatId);
  const conversations = useAIStore((state) => state.conversations);
  const currentChat = conversations.find((c) => c.id === currentChatId);

  // Se la chat non è ancora pronta (es. durante import), fallback a "web" per evitare crash
  const environment = currentChat?.environment || "web";

  const normalizedEnv = environment.toLowerCase();

  // Definisce quali environment usano la LivePreview (HTML/JS/React)
  const isWeb = normalizedEnv === "web" || normalizedEnv === "react";

  if (isWeb) {
    return <LivePreview onRefresh={onRefresh} className={className} />;
  }

  // Per tutti gli altri (C#, Arduino, Python, ecc.) mostra il pannello di compilazione
  return (
    <BuildPanel
      key={environment}
      environment={environment}
      className={className}
    />
  );
}
