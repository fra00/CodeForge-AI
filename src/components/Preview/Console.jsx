import React, { useRef, useEffect } from "react";
import PropTypes from "prop-types";
import { X, AlertTriangle, Info, CheckCircle } from "lucide-react";
import Button from "../ui/Button";

/**
 * Componente per visualizzare i log della console catturati dall'iframe di preview.
 */
export function ConsolePanel({ logs, onClear }) {
  const logsEndRef = useRef(null);

  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs]);

  const getLogStyle = (type) => {
    switch (type) {
      case "error":
        return "bg-red-900/50 text-red-300 border-red-700";
      case "warn":
        return "bg-yellow-900/50 text-yellow-300 border-yellow-700";
      case "log":
      default:
        return "bg-editor-darker/50 text-editor-border border-editor-border";
    }
  };

  const getLogIcon = (type) => {
    switch (type) {
      case "error":
        return <X size={14} className="text-red-500" />;
      case "warn":
        return <AlertTriangle size={14} className="text-yellow-500" />;
      case "log":
      default:
        return <Info size={14} className="text-blue-500" />;
    }
  };

  return (
    <div className="flex flex-col h-48 border-t border-editor-border bg-editor-darker">
      <div className="flex justify-between items-center p-2 border-b border-editor-border">
        <span className="text-sm font-semibold text-white">CONSOLE</span>
        <Button
          onClick={onClear}
          variant="ghost"
          size="small"
          className="text-xs p-1"
        >
          Clear
        </Button>
      </div>
      <div className="flex-1 overflow-y-auto font-mono text-xs p-2 space-y-1">
        {logs.length === 0 ? (
          <div className="text-editor-border">Console vuota.</div>
        ) : (
          logs.map((log, index) => {
            const isError = log.type === "error";
            const errorMessage = log.data.join(" ");

            const handleClick = () => {
              if (isError && window.projectContext?.handleErrorClick) {
                window.projectContext.handleErrorClick(errorMessage);
              }
            };

            return (
              <div
                key={index}
                className={`flex items-start p-1 rounded border ${getLogStyle(
                  log.type
                )} ${isError ? "cursor-pointer hover:bg-red-900/80" : ""}`}
                onClick={handleClick}
                title={isError ? "Debug this error with AI" : ""}
              >
                <div className="flex-shrink-0 mr-2 mt-0.5">
                  {getLogIcon(log.type)}
                </div>
                <div className="flex-1 whitespace-pre-wrap break-words">
                  {errorMessage}
                </div>
              </div>
            );
          })
        )}
        <div ref={logsEndRef} />
      </div>
    </div>
  );
}

ConsolePanel.propTypes = {
  logs: PropTypes.arrayOf(
    PropTypes.shape({
      type: PropTypes.oneOf(["log", "error", "warn"]).isRequired,
      data: PropTypes.arrayOf(PropTypes.string).isRequired,
    })
  ).isRequired,
  onClear: PropTypes.func.isRequired,
};
