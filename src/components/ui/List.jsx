import React from 'react';
import PropTypes from 'prop-types';
import './List.css';

/**
 * Componente per mostrare una lista di elementi.
 * Di default renderizza un `<ul>`, ma può essere cambiato con la prop `as`.
 *
 * @example
 * // Lista non ordinata (default)
 * // Il componente ListItem è importato separatamente.
 * <List>
 *   <ListItem>Primo elemento</ListItem>
 *   <ListItem>Secondo elemento</ListItem>
 *   <ListItem>Terzo elemento</ListItem>
 * </List>
 *
 * @example
 * // Lista ordinata (usando la prop 'as')
 * <List as="ol">
 *   <ListItem>Primo passo</ListItem>
 *   <ListItem>Secondo passo</ListItem>
 *   <ListItem>Terzo passo</ListItem>
 * </List>
 */
const List = ({ as: Component = "ul", children, className = "", ...rest }) => {
  const classNames = ['list', className].filter(Boolean).join(' ');

  return (
    <Component className={classNames} {...rest}>
      {children}
    </Component>
  );
};

List.propTypes = {
  /**
   * L'elemento HTML da renderizzare (es. 'ul', 'ol').
   */
  as: PropTypes.elementType,
  children: PropTypes.node,
  className: PropTypes.string,
};

export default List;