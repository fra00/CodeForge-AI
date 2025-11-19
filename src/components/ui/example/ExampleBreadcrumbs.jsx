import React from "react";
import Card from "../Card";
import CardHeader from "../CardHeader";
import Breadcrumbs from "../Breadcrumbs";
import CodeBlock from "../CodeBlock";

/**
 * Componente di esempio per mostrare l'utilizzo del componente Breadcrumbs.
 */
const ExampleBreadcrumbs = () => {
  const items = [
    { label: "Home", href: "#" },
    { label: "Libreria", href: "#" },
    { label: "Dati" },
  ];

  const itemsLong = [
    { label: "Home", href: "#" },
    { label: "Progetti", href: "#" },
    { label: "Componenti React", href: "#" },
    { label: "UI", href: "#" },
    { label: "Breadcrumbs" },
  ];

  const codeSnippet = `
import Breadcrumbs from "./Breadcrumbs";

const items = [
  { label: "Home", href: "#" },
  { label: "Libreria", href: "#" },
  { label: "Dati" },
];

const itemsLong = [
  { label: "Home", href: "#" },
  { label: "Progetti", href: "#" },
  { label: "Componenti React", href: "#" },
  { label: "UI", href: "#" },
  { label: "Breadcrumbs" },
];

<Breadcrumbs items={items} />
<Breadcrumbs items={itemsLong} separator=">" />`;

  return (
    <Card>
      <CardHeader>Esempi di Breadcrumbs</CardHeader>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "1.5rem",
          alignItems: "flex-start",
        }}
      >
        <Breadcrumbs items={items} />
        <Breadcrumbs items={itemsLong} separator=">" />
      </div>
      <CodeBlock code={codeSnippet} />
    </Card>
  );
};

export default ExampleBreadcrumbs;
