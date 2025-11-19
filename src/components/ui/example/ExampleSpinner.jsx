import React from "react";
import Card from "../Card";
import CardHeader from "../CardHeader";
import Spinner from "../Spinner";
import CodeBlock from "../CodeBlock";

/**
 * Componente di esempio per mostrare l'utilizzo del componente Spinner.
 */
const ExampleSpinner = () => {
  const codeSnippet = `
import Spinner from "./Spinner";

// Spinner con diverse dimensioni
<Spinner size="small" />
<Spinner size="medium" />
<Spinner size="large" />
`;

  return (
    <Card>
      <CardHeader>Esempi di Spinner</CardHeader>
      <p>
        Lo spinner indica uno stato di caricamento. Sono disponibili diverse
        dimensioni.
      </p>
      <div style={{ display: "flex", alignItems: "center", gap: "2rem", marginTop: "1rem" }}>
        <Spinner size="small" />
        <Spinner size="medium" />
        <Spinner size="large" />
      </div>
      <CodeBlock code={codeSnippet} />
    </Card>
  );
};

export default ExampleSpinner;
