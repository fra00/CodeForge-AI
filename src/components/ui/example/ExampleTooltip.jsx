import React from "react";
import Card from "../Card";
import CardHeader from "../CardHeader";
import Tooltip from "../Tooltip";
import Button from "../Button";
import CodeBlock from "../CodeBlock";

/**
 * Componente di esempio per mostrare l'utilizzo del componente Tooltip.
 */
const ExampleTooltip = () => {
  const codeSnippet = `
import Tooltip from "./Tooltip";
import Button from "./Button";

<Tooltip text="Questo è un tooltip su un bottone.">
  <Button>Passa qui il mouse</Button>
</Tooltip>

<Tooltip text="Questo è un tooltip su del testo.">
  <p style={{ textDecoration: "underline dotted", cursor: "help" }}>
    Passa anche qui!
  </p>
</Tooltip>
`;

  return (
    <Card>
      <CardHeader>Esempi di Tooltip</CardHeader>
      <p>Passa il mouse sopra gli elementi per vedere il tooltip in azione.</p>
      <div
        style={{ display: "flex", alignItems: "center", gap: "2rem", marginTop: "1rem" }}
      >
        <Tooltip text="Questo è un tooltip su un bottone.">
          <Button>Passa qui il mouse</Button>
        </Tooltip>

        <Tooltip text="Questo è un tooltip su del testo.">
          <p style={{ textDecoration: "underline dotted", cursor: "help" }}>
            Passa anche qui!
          </p>
        </Tooltip>
      </div>
      <CodeBlock code={codeSnippet} />
    </Card>
  );
};

export default ExampleTooltip;
