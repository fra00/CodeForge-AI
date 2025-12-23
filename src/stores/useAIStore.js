import { create } from "zustand";
import { createChatSlice } from "./slices/chatSlice";
import { createContextSlice } from "./slices/contextSlice";
import { createKnowledgeSlice } from "./slices/knowledgeSlice";
import { createActionSlice } from "./slices/actionSlice";
import { createInteractionSlice } from "./slices/interactionSlice";

/**
 * Store principale dell'AI.
 * Assembla le varie "slice" funzionali in un unico store Zustand.
 */
export const useAIStore = create((set, get) => ({
  ...createChatSlice(set, get),
  ...createContextSlice(set, get),
  ...createKnowledgeSlice(set, get),
  ...createActionSlice(set, get),
  ...createInteractionSlice(set, get),
}));