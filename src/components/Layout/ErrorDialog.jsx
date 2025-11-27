import React from "react";
import { AlertTriangle, X } from "lucide-react";

/**
 * Una dialog modale per mostrare un errore di runtime proveniente dall'iframe.
 */
export function ErrorDialog({ error, onClose }) {
  if (!error) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50">
      <div className="bg-editor-bg-light rounded-lg shadow-2xl p-6 w-full max-w-lg border border-red-500/50">
        <div className="flex items-center mb-4">
          <AlertTriangle className="text-red-400 h-8 w-8 mr-3" />
          <h2 className="text-2xl font-bold text-white">
            Errore nella Preview
          </h2>
        </div>
        <pre className="bg-black/50 text-red-300 p-4 rounded-md text-sm whitespace-pre-wrap break-words">
          {error}
        </pre>
        <button
          onClick={onClose}
          className="mt-6 w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded transition-colors"
        >
          Chiudi
        </button>
      </div>
    </div>
  );
}
