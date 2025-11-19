import React from "react";
import PropTypes from "prop-types";

/**
 * Un contenitore che implementa il sistema Grid di Tailwind CSS.
 * @param {object} props - Le props del componente.
 * @param {number} [props.cols=1] - Il numero di colonne della griglia.
 * @param {number} [props.gap=4] - Lo spazio (gap) tra gli elementi della griglia.
 * @param {string} [props.className=''] - Classi CSS aggiuntive.
 */
export const Grid = ({
  children,
  cols = 1,
  gap = 4,
  className = "",
  ...rest
}) => {
  // NOTA: Una versione più avanzata potrebbe accettare oggetti per la responsività,
  // es. cols={{ sm: 2, md: 4 }} per generare `grid-cols-2 md:grid-cols-4`.
  const gridClasses = ["grid", `grid-cols-${cols}`, `gap-${gap}`, className]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={gridClasses} {...rest}>
      {children}
    </div>
  );
};

Grid.propTypes = {
  children: PropTypes.node,
  cols: PropTypes.number,
  gap: PropTypes.number,
  className: PropTypes.string,
};

/**
 * Un singolo elemento all'interno di un componente Grid.
 * @param {object} props - Le props del componente.
 * @param {number} [props.colSpan=1] - Quante colonne deve occupare l'elemento.
 * @param {number} [props.rowSpan=1] - Quante righe deve occupare l'elemento.
 */
export const GridItem = ({
  children,
  colSpan = 1,
  rowSpan = 1,
  className = "",
  ...rest
}) => {
  const itemClasses = [
    colSpan > 1 ? `col-span-${colSpan}` : "col-span-1",
    rowSpan > 1 ? `row-span-${rowSpan}` : "row-span-1",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={itemClasses} {...rest}>
      {children}
    </div>
  );
};

GridItem.propTypes = {
  children: PropTypes.node,
  colSpan: PropTypes.number,
  rowSpan: PropTypes.number,
  className: PropTypes.string,
};
