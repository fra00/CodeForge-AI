import React from "react";
import PropTypes from "prop-types";
import "./Table.css";

/**
 * Un componente generico per visualizzare dati in formato tabellare.
 * Accetta un array di `columns` per la definizione dell'header e
 * un array di `data` per le righe. È responsivo e si adatta a un
 * layout a "card" su schermi piccoli.
 *
 * @example
 * // Esempio di tabella con dati statici.
 * // Per la paginazione, vedere il componente `Pagination`.
 * const columns = [
 *   { key: 'id', header: 'ID' },
 *   { key: 'name', header: 'Nome Utente' },
 *   { key: 'email', header: 'Email' },
 * ];
 *
 * const data = [
 *   { id: 1, name: 'mario.rossi', email: 'mario.rossi@example.com' },
 *   { id: 2, name: 'giulia.bianchi', email: 'giulia.bianchi@example.com' },
 * ];
 *
 * <Table columns={columns} data={data} />
 */
const Table = ({ columns, data, className = "", ...rest }) => {
  const classNames = ["table-container", className].filter(Boolean).join(" ");

  return (
    <div className={classNames} {...rest}>
      <table className="table">
        <thead>
          <tr>
            {columns.map((col) => (
              <th key={col.key}>{col.header}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row, rowIndex) => (
            <tr key={row.id || rowIndex}>
              {columns.map((col) => (
                <td key={`${col.key}-${row.id || rowIndex}`} data-label={col.header}>
                  {col.render ? col.render(row) : row[col.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

Table.propTypes = {
  columns: PropTypes.arrayOf(
    PropTypes.shape({
      key: PropTypes.string.isRequired,
      header: PropTypes.string.isRequired,
      render: PropTypes.func, // Aggiunto supporto per la funzione di rendering custom
    })
  ).isRequired,
  data: PropTypes.arrayOf(PropTypes.object).isRequired,
  className: PropTypes.string,
};

export default Table;
