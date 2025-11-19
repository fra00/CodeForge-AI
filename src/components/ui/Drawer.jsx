import React from 'react';
import PropTypes from 'prop-types';
import './Drawer.css';

/**
 * Componente Drawer (o Sidebar) che scorre da un lato dello schermo.
 * È un'alternativa al Modal per mostrare contenuti contestuali come menu o form.
 * La sua visibilità è controllata dall'hook `useDisclosure`.
 *
 * @example
 * // Per usare il Drawer, si gestisce lo stato con l'hook `useDisclosure`.
 * const { isOpen, onOpen, onClose } = useDisclosure();
 *
 * return (
 *   <>
 *     <Button onClick={onOpen}>Apri Drawer da Sinistra</Button>
 *
 *     <Drawer isOpen={isOpen} onClose={onClose} position="left">
 *       <CardHeader>Menu</CardHeader>
 *       <div style={{ padding: '1.5rem' }}>
 *         <p>Voce di menu 1</p>
 *         <p>Voce di menu 2</p>
 *       </div>
 *     </Drawer>
 *   </>
 * );
 */
const Drawer = ({
  isOpen,
  onOpen,
  onClose,
  position = "right",
  children,
  className = "",
  ...rest
}) => {
  const overlayClasses = [
    "drawer-overlay",
    isOpen ? "drawer-overlay-open" : "",
  ].join(" ");

  const panelClasses = [
    "drawer-panel",
    `drawer-panel-${position}`,
    isOpen ? `drawer-panel-open` : "",
    // Aggiungiamo le classi flex per permettere ai figli di espandersi in altezza.
    "flex flex-col",
    className,
  ].filter(Boolean).join(" ");

  const handleClasses = [
    'drawer-handle',
    `drawer-handle-${position}`,
    isOpen ? 'drawer-handle-hidden' : '',
  ].join(' ');

  return (
    <>
      {/* La linguetta è sempre renderizzata se onOpen è fornita, ma nascosta via CSS quando il drawer è aperto */}
      {onOpen && (
        <button type="button" className={handleClasses} onClick={onOpen} aria-label="Apri pannello">
          <span className="drawer-handle-icon" />
        </button>
      )}

      {/* Il drawer stesso è nel DOM solo quando è aperto */}
      {isOpen && (
        <div className={overlayClasses} onClick={onClose} {...rest}>
          <div className={panelClasses} onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              className="drawer-close-button"
              aria-label="Close"
              onClick={onClose}
            >
              &times;
            </button>
            {children}
          </div>
        </div>
      )}
    </>
  );
};

Drawer.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onOpen: PropTypes.func,
  onClose: PropTypes.func.isRequired,
  position: PropTypes.oneOf(["left", "right"]),
  children: PropTypes.node,
  className: PropTypes.string,
};

export default Drawer;
