import React from "react";
import PropTypes from "prop-types";
import "./Alert.css";

/**
 * Componente per mostrare messaggi di alert contestuali.
 *
 * @example
 * // Alert di successo
 * <Alert variant="success">
 *   <strong>Successo!</strong> Operazione completata correttamente.
 * </Alert>
 *
 * @example
 * // Alert di pericolo (danger) con pulsante di chiusura
 * // La visibilità è gestita da uno stato esterno.
 * const [isVisible, setIsVisible] = useState(true);
 *
 * {isVisible && (
 *   <Alert variant="danger" onClose={() => setIsVisible(false)}>
 *     <strong>Errore!</strong> Impossibile salvare le modifiche.
 *   </Alert>
 * )}
 *
 * @example
 * // Alert di avviso (warning)
 * <Alert variant="warning">
 *   <strong>Attenzione:</strong> Il tuo abbonamento sta per scadere.
 * </Alert>
 *
 * @example
 * // Alert informativo (info, default)
 * <Alert variant="info">Abbiamo aggiornato i nostri termini di servizio.</Alert>
 */
const Alert = ({
  children,
  variant = "info",
  onClose,
  className = "",
  ...rest
}) => {
  const classNames = ["alert", `alert-${variant}`, className]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={classNames} role="alert" {...rest}>
      <div className="alert-content">{children}</div>
      {onClose && (
        <button
          type="button"
          className="alert-close-button"
          aria-label="Close"
          onClick={onClose}
        >
          &times;
        </button>
      )}
    </div>
  );
};

Alert.propTypes = {
  children: PropTypes.node.isRequired,
  variant: PropTypes.oneOf(["success", "danger", "warning", "info"]),
  onClose: PropTypes.func,
  className: PropTypes.string,
};

export default Alert;
