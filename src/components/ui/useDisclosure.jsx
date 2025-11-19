import { useState, useCallback } from "react";

/**
 * Custom hook per gestire in modo semplice e riutilizzabile lo stato di apertura/chiusura
 * di componenti come `Modal`, `Drawer`, o qualsiasi elemento condizionale.
 *
 * @param {boolean} [defaultIsOpen=false] - Lo stato iniziale (aperto o chiuso).
 * @returns {{isOpen: boolean, onOpen: Function, onClose: Function, onToggle: Function}}
 * Un oggetto contenente lo stato `isOpen` e le funzioni per manipolarlo.
 *
 * @example
 * // Esempio di base per mostrare/nascondere un elemento.
 * // I componenti `Button` e `Box` sono importati separatamente.
 * const MyComponent = () => {
 *   const { isOpen, onOpen, onClose, onToggle } = useDisclosure();
 *
 *   return (
 *     <>
 *       <Button onClick={onOpen}>Apri</Button>
 *       <Button onClick={onClose}>Chiudi</Button>
 *       <Button onClick={onToggle} variant="primary">Toggle</Button>
 *
 *       {isOpen && (
 *         <Box style={{ marginTop: '1rem' }}>
 *           <p>Questo contenuto è visibile!</p>
 *         </Box>
 *       )}
 *     </>
 *   );
 * };
 *
 * @example
 * // Esempio con un valore iniziale di default (aperto).
 * const InitiallyOpenComponent = () => {
 *   const { isOpen, onClose } = useDisclosure(true); // Aperto di default
 *
 *   return (
 *     <>
 *       {isOpen && (
 *         <div>
 *           <p>Sono visibile da subito!</p>
 *           <Button onClick={onClose}>Chiudimi</Button>
 *         </div>
 *       )}
 *     </>
 *   );
 * };
 */
const useDisclosure = (defaultIsOpen = false) => {
  const [isOpen, setIsOpen] = useState(defaultIsOpen);

  const onOpen = useCallback(() => setIsOpen(true), []);
  const onClose = useCallback(() => setIsOpen(false), []);
  const onToggle = useCallback(() => setIsOpen((prev) => !prev), []);

  return { isOpen, onOpen, onClose, onToggle };
};

export default useDisclosure;
