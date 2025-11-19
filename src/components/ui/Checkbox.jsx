import React from "react";
import PropTypes from "prop-types";
import "./Checkbox.css";

/**
 * Un componente checkbox con etichetta e stati gestiti.
 */
const Checkbox = React.forwardRef(
  (
    { id, label, checked, onChange, disabled = false, className = "", ...rest },
    ref
  ) => {
    const wrapperClasses = ["checkbox-wrapper", className]
      .filter(Boolean)
      .join(" ");

    return (
      <label htmlFor={id} className={wrapperClasses}>
        <input
          id={id}
          ref={ref}
          type="checkbox"
          className="form-checkbox"
          checked={checked}
          onChange={onChange}
          disabled={disabled}
          {...rest}
        />
        {label && <span className="checkbox-label">{label}</span>}
      </label>
    );
  }
);

Checkbox.displayName = "Checkbox";

Checkbox.propTypes = {
  id: PropTypes.string.isRequired,
  label: PropTypes.string,
  checked: PropTypes.bool.isRequired,
  onChange: PropTypes.func.isRequired,
  disabled: PropTypes.bool,
  className: PropTypes.string,
};

export default Checkbox;
