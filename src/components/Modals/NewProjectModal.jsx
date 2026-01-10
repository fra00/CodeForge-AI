import React from "react";
import { X, Box, Cpu, Globe, Terminal, Layers } from "lucide-react";
import { ENVIRONMENTS } from "../../stores/environment";

export function NewProjectModal({ isOpen, onClose, onConfirm }) {
  if (!isOpen) return null;

  const getIcon = (key) => {
    if (key.includes("web") || key.includes("react"))
      return <Globe size={24} />;
    if (key.includes("arduino") || key.includes("esp"))
      return <Cpu size={24} />;
    if (key.includes("csharp") || key.includes("cpp") || key.includes("java"))
      return <Terminal size={24} />;
    return <Box size={24} />;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-editor-darker border border-editor-border rounded-lg shadow-2xl w-[700px] max-w-[95vw] flex flex-col max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-editor-border bg-editor-bg">
          <h2 className="text-lg font-semibold text-white flex items-center">
            <Layers className="mr-2 text-blue-400" size={20} />
            Create New Project
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto bg-editor-bg">
          <p className="text-gray-400 mb-6 text-sm">
            Select the target environment for your project. This will configure
            the AI assistant, the build system, and the editor presets.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {Object.entries(ENVIRONMENTS).map(([key, env]) => (
              <button
                key={key}
                onClick={() => onConfirm(key)}
                className="flex flex-col items-start p-4 rounded-lg border border-editor-border bg-editor-darker hover:bg-editor-highlight hover:border-blue-500 transition-all text-left group relative overflow-hidden"
              >
                <div className="flex items-center mb-2 text-blue-400 group-hover:text-blue-300 z-10">
                  {getIcon(key)}
                  <span className="ml-3 font-semibold text-white text-base">
                    {env.label}
                  </span>
                </div>
                <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
