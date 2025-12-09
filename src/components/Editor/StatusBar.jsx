import React from "react";
import PropTypes from "prop-types";
import { Bug, Save, Loader2 } from "lucide-react";
import Button from "../ui/Button";

/**
 * Barra di stato dell'applicazione.
 * Mostra lo stato di salvataggio e un pulsante per correggere errori di runtime.
 */
export function StatusBar({ isSaving, runtimeErrors = [], onFixError }) {
  const errorCount = runtimeErrors.length;

  return (
    <footer className="flex items-center justify-between h-8 px-4 bg-editor-darker border-t border-editor-border text-sm text-gray-400 flex-shrink-0">
      <div className="flex items-center space-x-4">
        {/* Pulsante per la correzione degli errori */}
        {errorCount > 0 && (
          <button
            onClick={onFixError}
            title="Invia l'errore all'AI per la correzione"
            className="flex items-center px-3 py-1 bg-red-600/80 text-white rounded-md hover:bg-red-500 transition-colors duration-200"
          >
            <Bug className="mr-2 h-4 w-4" />
            <span>
              {errorCount} Error{errorCount > 1 ? "i" : "e"}: Clicca per
              correggere
            </span>
          </button>
        )}
      </div>

      {/* Indicatore di salvataggio */}
      <div className="flex items-center">
        {isSaving ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            <span>Saving...</span>
          </>
        ) : (
          <>
            <Save className="mr-2 h-4 w-4" />
            <span>Saved</span>
          </>
        )}
      </div>
    </footer>
  );
}

StatusBar.propTypes = {
  isSaving: PropTypes.bool,
  runtimeErrors: PropTypes.arrayOf(PropTypes.string),
  onFixError: PropTypes.func,
};

StatusBar.defaultProps = {
  isSaving: false,
  runtimeErrors: [],
  onFixError: () => {},
};
