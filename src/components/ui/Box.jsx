import React from "react";
import PropTypes from "prop-types";
import "./Box.css";

/**
 * Un componente contenitore primitivo e flessibile.
 * Di base, renderizza un `div` e può essere utilizzato per creare qualsiasi tipo di layout.
 * Accetta tutte le props standard dell'elemento HTML renderizzato.
 * @param {object} props - Le props del componente.
 * @param {React.ElementType} [props.as='div'] - L'elemento o il componente da renderizzare (es. 'div', 'section').
 * @param {React.ReactNode} props.children - Il contenuto da renderizzare all'interno del box.
 * @param {string} [props.className=''] - Classi CSS aggiuntive da applicare al contenitore.
 */
const Box = React.forwardRef(({ as: Component = 'div', children, className = '', ...rest }, ref) => {
  const classNames = ["box", className].filter(Boolean).join(" ");
  return (
    <Component ref={ref} className={classNames} {...rest}>
      {children}
    </Component>
  );
});

Box.displayName = 'Box'; // Facilita il debug con React DevTools

Box.propTypes = {
  as: PropTypes.elementType,
  children: PropTypes.node,
  className: PropTypes.string,
};

export default Box;
