import React from "react";
import PropTypes from "prop-types";
import "./Pagination.css";

/**
 * Componente per la paginazione, da usare in combinazione con componenti
 * come `Table` per navigare tra grandi set di dati.
 *
 * @example
 * // Esempio di paginazione per una lista di 50 elementi, 10 per pagina.
 * // La gestione dello stato della pagina corrente è esterna al componente.
 * const [currentPage, setCurrentPage] = useState(1);
 * const totalItems = 50;
 * const itemsPerPage = 10;
 *
 * return (
 *   <Pagination
 *     currentPage={currentPage}
 *     totalItems={totalItems}
 *     itemsPerPage={itemsPerPage}
 *     onPageChange={(page) => setCurrentPage(page)}
 *   />
 * );
 */
const Pagination = ({
  currentPage,
  totalItems,
  itemsPerPage,
  onPageChange,
}) => {
  const totalPages = Math.ceil(totalItems / itemsPerPage);

  // Funzione per gestire il cambio pagina
  const handlePageChange = (page) => {
    if (page >= 1 && page <= totalPages) {
      onPageChange(page);
    }
  };

  // Genera i numeri di pagina da mostrare
  const pageNumbers = [];
  for (let i = 1; i <= totalPages; i++) {
    pageNumbers.push(i);
  }

  return (
    <nav className="pagination">
      <button
        onClick={() => handlePageChange(currentPage - 1)}
        disabled={currentPage === 1}
      >
        Precedente
      </button>

      <ul className="page-numbers">
        {pageNumbers.map((number) => (
          <li key={number} className={number === currentPage ? "active" : ""}>
            <button onClick={() => handlePageChange(number)}>{number}</button>
          </li>
        ))}
      </ul>

      <button
        onClick={() => handlePageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
      >
        Successivo
      </button>
    </nav>
  );
};

Pagination.propTypes = {
  currentPage: PropTypes.number.isRequired,
  totalItems: PropTypes.number.isRequired,
  itemsPerPage: PropTypes.number.isRequired,
  onPageChange: PropTypes.func.isRequired,
};

export default Pagination;
