import React from 'react';
import PropTypes from 'prop-types';
import './Card.css';

/**
 * Un componente container generico che renderizza i suoi figli
 * all'interno di un contenitore con lo stile di una card.
 * È spesso usato in combinazione con `CardHeader` e `CardFooter`.
 *
 * @example
 * // Card di base con un titolo.
 * // I componenti CardHeader, CardFooter, etc. sono importati separatamente.
 * <Card>
 *   <CardHeader>Titolo della Card</CardHeader>
 *   <p>Questo è il contenuto della card.</p>
 * </Card>
 *
 * @example
 * // Card con azioni nel footer.
 * <Card>
 *   <CardHeader>Conferma Azione</CardHeader>
 *   <p>Sei sicuro di voler procedere?</p>
 *   <CardFooter>
 *     <Button variant="secondary">Annulla</Button>
 *     <Button variant="primary">Conferma</Button>
 *   </CardFooter>
 * </Card>
 */
const Card = ({ children, className = '', ...rest }) => {
  const classNames = ['card', className].filter(Boolean).join(' ');

  return (
    <div className={classNames} {...rest}>
      {children}
    </div>
  );
};

Card.propTypes = {
  children: PropTypes.node.isRequired,
  className: PropTypes.string,
};

export default Card;