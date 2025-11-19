import React from "react";
import PropTypes from "prop-types";
import "./Tooltip.css";

/**
 * Un componente che mostra un tooltip testuale al passaggio del mouse
 * sopra i suoi elementi figli.
 */
const Tooltip = ({ children, text, className = "", ...rest }) => {
  const containerClasses = ["tooltip-container", className]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={containerClasses} {...rest}>
      {children}
      {text && <span className="tooltip-text">{text}</span>}
    </div>
  );
};

Tooltip.propTypes = {
  children: PropTypes.node.isRequired,
  text: PropTypes.string.isRequired,
  className: PropTypes.string,
};

export default Tooltip;
