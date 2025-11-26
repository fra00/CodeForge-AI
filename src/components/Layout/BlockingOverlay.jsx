import React from "react";
import { Loader2 } from "lucide-react";

/**
 * Un overlay a schermo intero per bloccare l'interazione dell'utente
 * durante operazioni critiche, mostrando un messaggio di caricamento.
 */
export function BlockingOverlay() {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex flex-col items-center justify-center z-50 text-white">
      <Loader2 className="animate-spin h-12 w-12 mb-4" />
      <p className="text-xl font-semibold">Operazione in corso...</p>
      <p className="text-md text-gray-300">Attendere il completamento.</p>
    </div>
  );
}

export default BlockingOverlay;
