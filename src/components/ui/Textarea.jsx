import React from "react";
import PropTypes from "prop-types";
import "./Textarea.css"; // Ora importa gli stili da FormControl.css

/**
 * Un componente per input di testo su più righe (textarea), con label e gestione degli errori.
 */
const Textarea = React.forwardRef(
  (
    {
      id,
      label,
      value,
      onChange,
      placeholder,
      disabled = false,
      error = null,
      rows = 3,
      className = "",
      ...rest
    },
    ref
  ) => {
    const wrapperClasses = ["form-control-wrapper", className]
      .filter(Boolean)
      .join(" ");
    const textareaClasses = ["form-textarea", error ? "error" : ""]
      .filter(Boolean)
      .join(" ");

    return (
      <div className={wrapperClasses}>
        {label && <label htmlFor={id} className="form-label">{label}</label>}
        <textarea
          id={id}
          ref={ref}
          className={textareaClasses}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          disabled={disabled}
          rows={rows}
          aria-invalid={!!error}
          aria-describedby={error ? `${id}-error` : undefined}
          {...rest}
        />
        {error && (
          <p id={`${id}-error`} className="form-error-message">
            {error}
          </p>
        )}
      </div>
    );
  }
);

Textarea.displayName = "Textarea";

Textarea.propTypes = {
  id: PropTypes.string.isRequired,
  label: PropTypes.string,
  value: PropTypes.string.isRequired,
  onChange: PropTypes.func.isRequired,
  placeholder: PropTypes.string,
  disabled: PropTypes.bool,
  error: PropTypes.string,
  rows: PropTypes.number,
  className: PropTypes.string,
};

export default Textarea;
