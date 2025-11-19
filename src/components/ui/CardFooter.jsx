import React from 'react';
import PropTypes from 'prop-types';
import './CardFooter.css';

/**
 * Componente per il footer di una Card contenente azioni.
 */
const CardFooter = ({ children, className = '', ...rest }) => {
  const classNames = ['card-footer', className].filter(Boolean).join(' ');

  return (
    <div className={classNames} {...rest}>
      {children}
    </div>
  );
};

CardFooter.propTypes = {
  children: PropTypes.node,
  className: PropTypes.string,
};

export default CardFooter;