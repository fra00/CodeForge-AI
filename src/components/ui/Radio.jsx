import React from "react";
import PropTypes from "prop-types";
import "./Radio.css";

/**
 * Un singolo pulsante radio. Viene tipicamente usato all'interno di un RadioGroup.
 */
const Radio = React.forwardRef(
  ({ id, label, disabled = false, className = "", ...rest }, ref) => {
    const wrapperClasses = ["radio-wrapper", className]
      .filter(Boolean)
      .join(" ");

    return (
      <label htmlFor={id} className={wrapperClasses}>
        <input
          id={id}
          ref={ref}
          type="radio"
          className="form-radio"
          disabled={disabled}
          {...rest}
        />
        {label && <span className="radio-label">{label}</span>}
      </label>
    );
  }
);

Radio.displayName = "Radio";

Radio.propTypes = {
  id: PropTypes.string.isRequired,
  label: PropTypes.string,
  disabled: PropTypes.bool,
  className: PropTypes.string,
};

export default Radio;
