import React from "react";
import PropTypes from "prop-types";
import "./ProgressBar.css";

/**
 * Componente ProgressBar per visualizzare graficamente il progresso di un'operazione.
 */
const ProgressBar = ({
  progress,
  height = 10,
  color = "#646cff",
  className = "",
  ...rest
}) => {
  const progressStyle = {
    width: `${progress}%`,
    height: `${height}px`,
    backgroundColor: color,
  };

  const classNames = ["progress-bar", className].filter(Boolean).join(" ");

  return (
    <div className="progress-bar-container" {...rest}>
      <div className={classNames} style={progressStyle} />
    </div>
  );
};

ProgressBar.propTypes = {
  /**
   * Valore del progresso in percentuale (0-100).
   */
  progress: PropTypes.number.isRequired,
  /**
   * Altezza della barra di progresso in pixel.
   */
  height: PropTypes.number,
  /**
   * Colore della barra di progresso.
   */
  color: PropTypes.string,
  /**
   * Classi CSS aggiuntive.
   */
  className: PropTypes.string,
};

export default ProgressBar;
