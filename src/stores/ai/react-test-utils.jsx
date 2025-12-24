import { createRoot } from "react-dom/client";
import { act } from "react";

// Variabili globali per tracciare il container corrente
let currentRoot = null;
let currentContainer = null;

/**
 * Renderizza un componente React in un container isolato nel body.
 * Simula il comportamento di @testing-library/react render.
 */
export function render(ui) {
  const container = document.createElement("div");
  document.body.appendChild(container);

  currentContainer = container;
  currentRoot = createRoot(container);

  act(() => {
    currentRoot.render(ui);
  });

  return {
    container,
    // Helper di query di base
    getByText: (text) => {
      const el = Array.from(container.querySelectorAll("*")).find(
        (node) => node.textContent === text || node.textContent.includes(text)
      );
      if (!el) throw new Error(`Element with text "${text}" not found`);
      return el;
    },
    querySelector: (selector) => container.querySelector(selector),
    querySelectorAll: (selector) => container.querySelectorAll(selector),
  };
}

/**
 * Pulisce il DOM dopo ogni test. Da chiamare in afterEach.
 */
export function cleanup() {
  if (currentRoot) {
    act(() => currentRoot.unmount());
    currentRoot = null;
  }
  if (currentContainer) {
    currentContainer.remove();
    currentContainer = null;
  }
}

/**
 * Wrapper per simulare eventi nativi in modo sicuro con act().
 */
export const fireEvent = {
  click: (element) => {
    act(() => {
      element.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
  },
  input: (element, value) => {
    // Hack per React 16+ per forzare l'aggiornamento del valore su input controllati
    const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
      window.HTMLInputElement.prototype,
      "value"
    ).set;
    act(() => {
      nativeInputValueSetter.call(element, value);
      element.dispatchEvent(new Event("input", { bubbles: true }));
    });
  },
};

export { act };