import React from "react";
import PropTypes from "prop-types";
import "./Badge.css";

/**
 * Componente per mostrare badges, tags o contatori.
 *
 * @example
 * // Badge con diverse varianti di colore
 * <Badge variant="primary">Primary</Badge>
 * <Badge variant="success">Success</Badge>
 * <Badge variant="danger">Danger</Badge>
 *
 * @example
 * // Badge con stile "pill" (arrotondato)
 * <Badge variant="info" className="badge-pill">
 *   Notizia
 * </Badge>
 *
 * @example
 * // Badge usato come contatore in un bottone
 * <Button>
 *   Notifiche <Badge variant="danger">9+</Badge>
 * </Button>
 */
const Badge = ({ children, variant = "default", className = "", ...rest }) => {
  const classNames = ["badge", `badge-${variant}`, className]
    .filter(Boolean)
    .join(" ");

  return (
    <span className={classNames} {...rest}>
      {children}
    </span>
  );
};

Badge.propTypes = {
  children: PropTypes.node.isRequired,
  variant: PropTypes.oneOf([
    "default",
    "primary",
    "secondary",
    "success",
    "danger",
    "warning",
    "info",
  ]),
  className: PropTypes.string,
};

export default Badge;
