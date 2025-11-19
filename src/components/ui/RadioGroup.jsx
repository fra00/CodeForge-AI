import React from "react";
import PropTypes from "prop-types";
import "./RadioGroup.css"; // Assicura che questo file resetti gli stili del fieldset

/**
 * Un contenitore per un gruppo di pulsanti Radio, che gestisce la selezione
 * singola e include un'etichetta di gruppo e la gestione degli errori.
 */
const RadioGroup = ({
  name,
  label,
  selectedValue,
  onChange,
  children,
  error = null,
  className = "",
}) => {
  const wrapperClasses = ["form-control-wrapper", className]
    .filter(Boolean)
    .join(" ");

  const legendId = label ? `${name}-label` : undefined;
  const errorId = error ? `${name}-error` : undefined;

  return (
    <div className={wrapperClasses}>
      <fieldset
        className="radio-group"
        role="radiogroup"
        aria-labelledby={legendId}
        aria-describedby={errorId}
      >
        {label && <legend id={legendId} className="form-label">{label}</legend>}
        {React.Children.map(children, (child) => {
          if (React.isValidElement(child) && child.type.displayName === "Radio") {
            return React.cloneElement(child, {
              name,
              checked: child.props.value === selectedValue,
              onChange: () => onChange(child.props.value),
            });
          }
          return child;
        })}
      </fieldset>
      {error && <p id={errorId} className="form-error-message">{error}</p>}
    </div>
  );
};

RadioGroup.displayName = "RadioGroup";

RadioGroup.propTypes = {
  name: PropTypes.string.isRequired,
  label: PropTypes.string,
  selectedValue: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  onChange: PropTypes.func.isRequired,
  children: PropTypes.node.isRequired,
  error: PropTypes.string,
  className: PropTypes.string,
};

export default RadioGroup;
