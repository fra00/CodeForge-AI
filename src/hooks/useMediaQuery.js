import { useState, useEffect } from "react";

/**
 * Hook personalizzato per il rilevamento di media query CSS.
 * @param {string} query La stringa della media query (es. '(max-width: 768px)').
 * @returns {boolean} True se la media query corrisponde, altrimenti false.
 */
export function useMediaQuery(query) {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    const media = window.matchMedia(query);
    if (media.matches !== matches) {
      setMatches(media.matches);
    }
    const listener = () => setMatches(media.matches);
    window.addEventListener("resize", listener);
    return () => window.removeEventListener("resize", listener);
  }, [matches, query]);

  return matches;
}
