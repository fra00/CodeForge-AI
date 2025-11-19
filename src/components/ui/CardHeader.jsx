import React from "react";
import PropTypes from "prop-types";
import "./CardHeader.css";

/**
 * Componente per l'intestazione di una Card.
 */
const CardHeader = ({ children, className = "", ...rest }) => {
  const classNames = ["card-header", className].filter(Boolean).join(" ");

  return (
    <h2 className={classNames} {...rest}>
      {children}
    </h2>
  );
};

CardHeader.propTypes = {
  children: PropTypes.node.isRequired,
  className: PropTypes.string,
};

export default CardHeader;
