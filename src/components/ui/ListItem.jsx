import React from 'react';
import PropTypes from 'prop-types';
import './ListItem.css';

/**
 * Componente per mostrare un singolo elemento di una lista.
 * Va usato come figlio di un componente `List`.
 *
 * @example
 * <List>
 *   <ListItem>Elemento della lista</ListItem>
 * </List>
 */
const ListItem = ({ children, className = '', ...rest }) => {
  const classNames = ['list-item', className].filter(Boolean).join(' ');

  return (
    <li className={classNames} {...rest}>
      {children}
    </li>
  );
};

ListItem.propTypes = {
  children: PropTypes.node.isRequired,
  className: PropTypes.string,
};

export default ListItem;