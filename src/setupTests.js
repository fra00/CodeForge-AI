import { cleanup } from "@testing-library/react";
import { vi } from "vitest";
import { mockOpenDB } from "./__tests__/mocks/indexedDB";

// Esegue la pulizia del DOM dopo ogni test
// afterEach e cleanup sono globali grazie a vitest.config.js
afterEach(() => {
  cleanup();
});

// Mock per la funzione matchMedia, necessaria per alcuni componenti UI
window.matchMedia =
  window.matchMedia ||
  function () {
    return {
      matches: false,
      addListener: function () {},
      removeListener: function () {},
    };
  };

// // Mock globale per indexedDB
// global.indexedDB = {
//   open: vi.fn(() => ({
//     // Simulate an IDBOpenDBRequest
//     set onupgradeneeded(cb) {
//       this._onupgradeneeded = cb;
//     },
//     get onupgradeneeded() {
//       return this._onupgradeneeded;
//     },
//     set onsuccess(cb) {
//       this._onsuccess = cb;
//       // Immediately call onsuccess to simulate a successful opening
//       // This might need refinement depending on how 'idb' library uses it
//       setTimeout(() => {
//         if (this._onsuccess) {
//           this._onsuccess({ target: { result: mockOpenDB() } });
//         }
//       }, 0);
//     },
//     get onsuccess() {
//       return this._onsuccess;
//     },
//     set onerror(cb) {
//       this._onerror = cb;
//     },
//     get onerror() {
//       return this._onerror;
//     },
//   })),
//   // Add other methods if 'idb' or other libraries try to access them
//   deleteDatabase: vi.fn(() => ({
//     set onsuccess(cb) {
//       setTimeout(() => cb(), 0);
//     },
//     set onerror(cb) {
//       setTimeout(() => cb(), 0);
//     },
//   })),
// };
