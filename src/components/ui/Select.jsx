import React from 'react';
import PropTypes from 'prop-types';
import './Select.css'; // Ora importa gli stili da FormControl.css

/**
 * Un componente generico per i campi select, con label e gestione degli errori.
 */
const Select = React.forwardRef(({
  id,
  label,
  options,
  value,
  onChange,
  disabled = false,
  error = null,
  className = '',
  ...rest
}, ref) => {

  const wrapperClasses = ['form-control-wrapper', className].filter(Boolean).join(' ');
  const selectClasses = ['form-select', error ? 'error' : ''].filter(Boolean).join(' ');

  return (
    <div className={wrapperClasses}>
      {label && <label htmlFor={id} className="form-label">{label}</label>}
      <select
        id={id}
        ref={ref}
        className={selectClasses}
        value={value}
        onChange={onChange}
        disabled={disabled}
        aria-invalid={!!error}
        aria-describedby={error ? `${id}-error` : undefined}
        {...rest}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {error && <p id={`${id}-error`} className="form-error-message">{error}</p>}
    </div>
  );
});

Select.displayName = 'Select';

Select.propTypes = {
  id: PropTypes.string.isRequired,
  label: PropTypes.string,
  options: PropTypes.arrayOf(PropTypes.shape({
    value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
    label: PropTypes.string.isRequired,
  })).isRequired,
  value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
  onChange: PropTypes.func.isRequired,
  disabled: PropTypes.bool,
  error: PropTypes.string,
  className: PropTypes.string,
};

export default Select;