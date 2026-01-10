import React, { useState, useEffect, useRef } from "react";
import { Play, Square, Terminal, Trash2, Hammer, Cpu, Usb } from "lucide-react";
import { useFileStore } from "../../stores/useFileStore";
import JSZip from "jszip";

/**
 * Componente per la gestione della compilazione e dell'esecuzione
 * per ambienti non-web (C#, Arduino, Python, ecc.).
 */
export function BuildPanel({ environment, className = "" }) {
  const [logs, setLogs] = useState([]);
  const [isCompiling, setIsCompiling] = useState(false);
  const [currentAction, setCurrentAction] = useState(null);
  const [arduinoConfig, setArduinoConfig] = useState({
    board: "arduino:avr:uno",
    port: "COM3",
  });
  const outputRef = useRef(null);
  const files = useFileStore((state) => state.files);
  const rootId = useFileStore((state) => state.rootId);

  // Auto-scroll verso il basso
  useEffect(() => {
    if (outputRef.current) {
      outputRef.current.scrollTop = outputRef.current.scrollHeight;
    }
  }, [logs]);

  // Listener per i messaggi dalla WebView2
  useEffect(() => {
    const handleWebViewMessage = (event) => {
      const message = event.data;
      if (!message) return;
      if (message.result) {
        addLog("info", `Build result: ${message.result}`);
        setIsCompiling(false);
        setCurrentAction(null);
        return;
      }
      //   // Gestione messaggi da WPF
      //   if (message.type === "build-end") {
      //     setIsCompiling(false);
      //     addLog("info", `Process finished with exit code: ${message.exitCode}`);
      //   } else if (message.type === "stdout") {
      //     addLog("stdout", message.content);
      //   } else if (message.type === "stderr") {
      //     addLog("stderr", message.content);
      //   }
    };

    if (window.chrome?.webview) {
      window.chrome.webview.addEventListener("message", handleWebViewMessage);
    } else {
      // Fallback per sviluppo nel browser
      window.addEventListener("message", handleWebViewMessage);
    }

    return () => {
      if (window.chrome?.webview) {
        window.chrome.webview.removeEventListener(
          "message",
          handleWebViewMessage
        );
      } else {
        window.removeEventListener("message", handleWebViewMessage);
      }
    };
  }, []);

  const addLog = (type, content) => {
    setLogs((prev) => [
      ...prev,
      { type, content, timestamp: new Date().toISOString() },
    ]);
  };

  const handleAction = async (actionType) => {
    setIsCompiling(true);
    setCurrentAction(actionType);
    setLogs([]);
    const actionLabel = actionType === "run" ? "build & run" : "build";
    addLog(
      "info",
      `Starting ${actionLabel} for ${environment.toUpperCase()}...`
    );

    try {
      const zip = new JSZip();
      // Filtra solo i file (non le cartelle) e ignora la root
      const filesToZip = Object.values(files).filter(
        (node) => !node.isFolder && node.id !== rootId
      );

      filesToZip.forEach((file) => {
        // Rimuove lo slash iniziale dal percorso per la struttura ZIP
        const zipPath = file.path.startsWith("/")
          ? file.path.substring(1)
          : file.path;
        zip.file(zipPath, file.content || "");
      });

      const zipBase64 = await zip.generateAsync({ type: "base64" });

      const payload = {
        action: actionType,
        environment: environment,
        payload: zipBase64,
        arduinoConfig: environment === "arduino" ? arduinoConfig : undefined,
      };

      if (window.chrome?.webview) {
        window.chrome.webview.postMessage(payload);
      } else {
        console.warn("WebView2 not available. Simulating build...");
        // Simulazione per test UI
        setTimeout(() => {
          addLog("stdout", "Simulating: Compiling sources...");
          if (actionType === "run") {
            addLog("stdout", "Simulating: Linking objects...");
            addLog("stdout", "Simulating: Executing...");
          }
          addLog("stderr", "Simulating: No errors found.");
          setIsCompiling(false);
          setCurrentAction(null);
          addLog("info", "Process finished with exit code: 0");
        }, 1500);
      }
    } catch (error) {
      addLog("stderr", `Error creating build package: ${error.message}`);
      setIsCompiling(false);
      setCurrentAction(null);
    }
  };

  return (
    <div
      className={`flex flex-col h-full w-full bg-[#1e1e1e] text-gray-300 ${className}`}
    >
      {/* Toolbar */}
      <div className="h-10 border-b border-[#333] flex items-center px-4 space-x-2 bg-[#252526]">
        <span className="text-xs font-bold text-gray-500 uppercase mr-2 flex items-center">
          <Terminal size={14} className="mr-1" /> {environment} Output
        </span>
        <div className="h-4 w-[1px] bg-[#333] mx-2"></div>

        {environment === "arduino" && (
          <div className="flex items-center space-x-2 mr-2">
            <div className="flex items-center bg-[#333] border border-[#444] rounded px-2 py-1" title="Select Board">
              <Cpu size={12} className="text-gray-400 mr-2" />
              <select
                className="bg-transparent text-gray-300 text-xs focus:outline-none cursor-pointer"
                value={arduinoConfig.board}
                onChange={(e) =>
                  setArduinoConfig({ ...arduinoConfig, board: e.target.value })
                }
              >
                <option value="arduino:avr:uno">Arduino Uno</option>
                <option value="arduino:avr:nano">Arduino Nano</option>
                <option value="arduino:avr:mega">Arduino Mega</option>
                <option value="arduino:renesas_uno:minima">Arduino Uno R4 Minima</option>
                <option value="arduino:renesas_uno:unor4wifi">Arduino Uno R4 WiFi</option>
                <option value="esp32:esp32:esp32">ESP32 Dev Module</option>
              </select>
            </div>

            <div className="flex items-center bg-[#333] border border-[#444] rounded px-2 py-1" title="Select Port">
              <Usb size={12} className="text-gray-400 mr-2" />
              <select
                className="bg-transparent text-gray-300 text-xs focus:outline-none cursor-pointer"
                value={arduinoConfig.port}
                onChange={(e) =>
                  setArduinoConfig({ ...arduinoConfig, port: e.target.value })
                }
              >
                <option value="COM1">COM1</option>
                <option value="COM3">COM3</option>
                <option value="COM4">COM4</option>
                <option value="COM5">COM5</option>
              </select>
            </div>
            <div className="h-4 w-[1px] bg-[#333] mx-2"></div>
          </div>
        )}

        <button
          onClick={() => handleAction("compile")}
          disabled={isCompiling}
          className={`flex items-center px-3 py-1 rounded text-xs font-medium transition-colors mr-2 ${
            isCompiling
              ? "bg-gray-700 text-gray-500 cursor-not-allowed"
              : "bg-blue-700 hover:bg-blue-600 text-white"
          }`}
          title="Compile Only"
        >
          <Hammer
            size={14}
            className={`mr-1.5 ${isCompiling && currentAction === "compile" ? "animate-pulse" : ""}`}
          />
          {isCompiling && currentAction === "compile" ? "Building..." : "Build"}
        </button>

        <button
          onClick={() => handleAction("run")}
          disabled={isCompiling}
          className={`flex items-center px-3 py-1 rounded text-xs font-medium transition-colors ${
            isCompiling
              ? "bg-gray-700 text-gray-500 cursor-not-allowed"
              : "bg-green-700 hover:bg-green-600 text-white"
          }`}
          title="Compile and Run"
        >
          {isCompiling && currentAction === "run" ? (
            <Square size={14} className="mr-1.5 animate-pulse" />
          ) : (
            <Play size={14} className="mr-1.5" />
          )}
          {isCompiling && currentAction === "run" ? "Running..." : "Run"}
        </button>

        <button
          onClick={() => setLogs([])}
          className="p-1.5 hover:bg-[#333] rounded text-gray-400 hover:text-white transition-colors"
          title="Clear Output"
        >
          <Trash2 size={16} />
        </button>
      </div>

      {/* Terminal Output Area */}
      <div
        ref={outputRef}
        className="flex-1 overflow-y-auto p-4 font-mono text-sm bg-[#1e1e1e] select-text"
      >
        {logs.length === 0 && (
          <div className="text-gray-600 italic">Ready to build.</div>
        )}
        {logs.map((log, index) => (
          <div
            key={index}
            className={`mb-1 whitespace-pre-wrap break-words ${
              log.type === "stderr"
                ? "text-red-400"
                : log.type === "info"
                  ? "text-blue-400"
                  : "text-gray-300"
            }`}
          >
            <span className="opacity-50 text-[10px] mr-2">
              [{log.timestamp.split("T")[1].split(".")[0]}]
            </span>
            {log.content}
          </div>
        ))}
        {isCompiling && (
          <div className="animate-pulse text-green-500 mt-2">_</div>
        )}
      </div>
    </div>
  );
}
