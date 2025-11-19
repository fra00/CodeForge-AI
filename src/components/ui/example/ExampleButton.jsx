import React from "react";
import Card from "../Card";
import CardHeader from "../CardHeader";
import Button from "../Button";
import CodeBlock from "../CodeBlock";

/**
 * Componente di esempio per mostrare l'utilizzo del componente Button.
 */
const ExampleButton = () => {
  const codeSnippet = `
import Button from "./Button";

// Varianti
<Button variant="primary">Primary</Button>
<Button variant="secondary">Secondary</Button>
<Button variant="danger">Danger</Button>
<Button variant="ghost">Ghost</Button>

// Stato disabilitato
<Button disabled>Disabled</Button>

// Dimensioni
<Button size="large">Large</Button>
<Button size="medium">Medium</Button>
<Button size="small">Small</Button>
`;

  return (
    <Card>
      <CardHeader>Esempi di Bottoni</CardHeader>
      <div
        style={{
          display: "flex",
          gap: "1rem",
          flexWrap: "wrap",
          alignItems: "center",
        }}
      >
        <Button onClick={() => alert("Clicked Primary!")} variant="primary">
          Primary
        </Button>
        <Button onClick={() => alert("Clicked Secondary!")} variant="secondary">
          Secondary
        </Button>
        <Button onClick={() => alert("Clicked Danger!")} variant="danger">
          Danger
        </Button>
        <Button onClick={() => alert("Clicked Ghost!")} variant="ghost">
          Ghost
        </Button>
        <Button onClick={() => alert("Clicked Disabled!")} disabled>
          Disabled
        </Button>
        <Button onClick={() => alert("Clicked Large!")} size="large">
          Large
        </Button>
        <Button onClick={() => alert("Clicked Medium!")} size="medium">
          Medium
        </Button>
        <Button onClick={() => alert("Clicked Small!")} size="small">
          Small
        </Button>
      </div>
      <CodeBlock code={codeSnippet} />
    </Card>
  );
};

export default ExampleButton;
