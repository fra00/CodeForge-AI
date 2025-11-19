import React from 'react';
import PropTypes from 'prop-types';
import './Input.css'; // Ora importa gli stili da FormControl.css

/**
 * Un componente generico per i campi di input, con label, gestione degli errori e stati.
 *
 * @example
 * // Input di base con etichetta
 * <Input
 *   id="username"
 *   label="Nome Utente"
 *   value={username}
 *   onChange={(e) => setUsername(e.target.value)}
 *   placeholder="es. mario.rossi"
 * />
 *
 * @example
 * // Input di tipo password
 * <Input
 *   id="password"
 *   label="Password"
 *   type="password"
 *   value={password}
 *   onChange={(e) => setPassword(e.target.value)}
 * />
 *
 * @example
 * // Input con messaggio di errore
 * <Input
 *   id="email"
 *   label="Email"
 *   value={email}
 *   onChange={(e) => setEmail(e.target.value)}
 *   error="L'indirizzo email non è valido."
 * />
 *
 * @example
 * // Input disabilitato
 * <Input id="user-id" label="ID Utente" value="12345" disabled />
 */
const Input = React.forwardRef(({
  id,
  label,
  type = 'text',
  value,
  onChange,
  placeholder,
  disabled = false,
  error = null,
  className = '',
  ...rest
}, ref) => {

  const wrapperClasses = ['form-control-wrapper', className].filter(Boolean).join(' ');
  const inputClasses = ['form-input', error ? 'error' : ''].filter(Boolean).join(' ');

  return (
    <div className={wrapperClasses}>
      {label && <label htmlFor={id} className="form-label">{label}</label>}
      <input
        id={id}
        ref={ref}
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        disabled={disabled}
        className={inputClasses}
        aria-invalid={!!error}
        aria-describedby={error ? `${id}-error` : undefined}
        {...rest}
      />
      {error && <p id={`${id}-error`} className="form-error-message">{error}</p>}
    </div>
  );
});

Input.displayName = 'Input';

Input.propTypes = {
  id: PropTypes.string.isRequired,
  label: PropTypes.string,
  type: PropTypes.string,
  value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
  onChange: PropTypes.func.isRequired,
  placeholder: PropTypes.string,
  disabled: PropTypes.bool,
  error: PropTypes.string,
  className: PropTypes.string,
};

export default Input;