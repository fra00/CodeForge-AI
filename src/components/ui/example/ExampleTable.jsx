import React, { useState } from "react";
import Card from "../Card";
import CardHeader from "../CardHeader";
import Table from "../Table";
import Pagination from "../Pagination";
import CodeBlock from "../CodeBlock";

/**
 * Componente di esempio per mostrare l'utilizzo del componente Table.
 */
const ExampleTable = () => {
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 2;

  const columns = [
    { key: "id", header: "ID" },
    { key: "name", header: "Nome" },
    { key: "email", header: "Email" },
    { key: "role", header: "Ruolo" },
  ];

  const data = [
    {
      id: 1,
      name: "Mario Rossi",
      email: "mario.rossi@example.com",
      role: "Admin",
    },
    {
      id: 2,
      name: "Luigi Verdi",
      email: "luigi.verdi@example.com",
      role: "Developer",
    },
    {
      id: 3,
      name: "Giulia Bianchi",
      email: "giulia.bianchi@example.com",
      role: "User",
    },
    { id: 4, name: "Anna Neri", email: "anna.neri@example.com", role: "User" },
  ];

  // Calcola l'indice di inizio e fine degli elementi da visualizzare nella pagina corrente
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = data.slice(indexOfFirstItem, indexOfLastItem);

  // Funzione per cambiare pagina
  const handlePageChange = (pageNumber) => setCurrentPage(pageNumber);

  const codeSnippet = `
import React, { useState } from "react";
import Table from "./Table";
import Pagination from "./Pagination";

const MyComponent = () => {
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 2;

  const columns = [
    { key: 'id', header: 'ID' },
    { key: 'name', header: 'Nome' },
    { key: 'email', header: 'Email' },
  ];

  const data = [/* ... array di dati ... */];

  const currentItems = data.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  return (
    <>
      <Table columns={columns} data={currentItems} />
      <Pagination
        currentPage={currentPage}
        totalItems={data.length}
        itemsPerPage={itemsPerPage}
        onPageChange={setCurrentPage}
      />
    </>
  );
};`;

  return (
    <Card>
      <CardHeader>Esempio di Tabella</CardHeader>
      <p>La tabella è responsiva e si adatta a layout a "card" su schermi piccoli. La paginazione è gestita esternamente.</p>
      <Table columns={columns} data={currentItems} />
      <Pagination
        currentPage={currentPage}
        totalItems={data.length}
        itemsPerPage={itemsPerPage}
        onPageChange={handlePageChange}
      />
      <CodeBlock code={codeSnippet} />
    </Card>
  );
};

export default ExampleTable;
