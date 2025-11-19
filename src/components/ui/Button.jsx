import React from 'react';
import PropTypes from 'prop-types';
import './Button.css';

/**
 * Un componente bottone generico e riutilizzabile con vari stili e dimensioni.
 *
 * @example
 * // Bottone primario (default)
 * <Button onClick={() => alert('Clicked!')}>Azione Primaria</Button>
 *
 * @example
 * // Bottone secondario
 * <Button variant="secondary">Azione Secondaria</Button>
 *
 * @example
 * // Bottone di pericolo
 * <Button variant="danger">Elimina</Button>
 *
 * @example
 * // Bottone "ghost" per azioni meno invadenti
 * <Button variant="ghost">Annulla</Button>
 *
 * @example
 * // Bottone disabilitato e di grandi dimensioni
 * <Button disabled size="large">Non Cliccabile</Button>
 */
const Button = React.forwardRef(({
  children,
  onClick,
  type = 'button',
  variant = 'primary',
  size = 'medium',
  disabled = false,
  className = '',
  ...rest
}, ref) => {

  // Costruisce la lista di classi CSS in modo dinamico
  const classNames = [
    'button',
    variant,
    size, // Aggiunge la classe per la dimensione (es. 'small', 'medium')
    className, // Permette di aggiungere classi custom dall'esterno
  ].filter(Boolean).join(' ');

  return (
    <button
      ref={ref}
      type={type}
      className={classNames}
      onClick={onClick}
      disabled={disabled}
      {...rest}
    >
      {children}
    </button>
  );
});

Button.displayName = 'Button'; // Facilita il debug con React DevTools

Button.propTypes = {
  children: PropTypes.node.isRequired,
  onClick: PropTypes.func,
  type: PropTypes.oneOf(['button', 'submit', 'reset']),
  variant: PropTypes.oneOf(['primary', 'secondary', 'danger', 'ghost']),
  size: PropTypes.oneOf(['small', 'medium', 'large']),
  disabled: PropTypes.bool,
  className: PropTypes.string,
};

export default Button;