import React from "react";
import PropTypes from "prop-types";
import "./Spinner.css";

/**
 * Un componente Spinner per indicare uno stato di caricamento.
 * Usa un'animazione CSS per la rotazione.
 */
const Spinner = ({ size = "medium", className = "", ...rest }) => {
  const classNames = ["spinner", `spinner-${size}`, className]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={classNames} role="status" {...rest}>
      <span className="sr-only">Loading...</span>
    </div>
  );
};

Spinner.propTypes = {
  size: PropTypes.oneOf(["small", "medium", "large"]),
  className: PropTypes.string,
};

export default Spinner;
