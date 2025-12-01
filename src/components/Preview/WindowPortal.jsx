import React, { useEffect, useState, useRef } from "react";
import ReactDOM from "react-dom";

export const WindowPortal = ({ children, onClose, title = "Live Preview" }) => {
  const [container, setContainer] = useState(null);
  const externalWindow = useRef(null);

  useEffect(() => {
    // 1. Apri il file statico che abbiamo creato in public/
    // Questo garantisce la SAME-ORIGIN (stesso dominio)
    const win = window.open(
      "/preview-popup", // Apriamo un percorso virtuale della nostra app
      "LivePreviewWindow", // Un nome per la finestra
      "width=1000,height=800,left=200,top=200,resizable=yes,scrollbars=yes,status=yes"
    );

    if (!win) {
      alert("Popup bloccato. Abilita le popup per vedere la preview.");
      onClose();
      return;
    }

    externalWindow.current = win;

    // 2. Funzione per inizializzare il portale
    const initPortal = () => {
      if (!win.document) return;

      win.document.title = title;

      // Copia gli stili dall'app principale per non perdere Tailwind/CSS
      Array.from(document.styleSheets).forEach((styleSheet) => {
        try {
          if (styleSheet.href) {
            const newLink = win.document.createElement("link");
            newLink.rel = "stylesheet";
            newLink.href = styleSheet.href;
            win.document.head.appendChild(newLink);
          } else if (styleSheet.cssRules) {
            const newStyle = win.document.createElement("style");
            Array.from(styleSheet.cssRules).forEach((rule) => {
              newStyle.appendChild(win.document.createTextNode(rule.cssText));
            });
            win.document.head.appendChild(newStyle);
          }
        } catch (e) {
          // Ignora errori CORS sui font/css esterni
        }
      });

      // Trova il div radice nel file HTML statico
      const rootDiv = win.document.getElementById("root"); // L'ID radice di una tipica app React/Vite

      if (rootDiv) {
        setContainer(rootDiv);
      } else {
        // Fallback se per qualche motivo il file html non è quello giusto
        const fallbackDiv = win.document.createElement("div");
        fallbackDiv.style.height = "100%";
        win.document.body.appendChild(fallbackDiv);
        setContainer(fallbackDiv);
      }

      // Gestione chiusura
      win.onbeforeunload = () => {
        onClose();
      };
    };

    // 3. Aspetta che la finestra carichi il file preview.html
    if (win.document.readyState === "complete") {
      initPortal();
    } else {
      win.onload = initPortal;
    }

    return () => {
      // Cleanup
      if (win) {
        win.onbeforeunload = null;
        win.close();
      }
    };
  }, []);

  // Render children into the new window's container using a portal
  return container ? ReactDOM.createPortal(children, container) : null;
};
