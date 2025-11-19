import React from "react";
import Card from "../Card";
import CardHeader from "../CardHeader";
import Badge from "../Badge";
import CodeBlock from "../CodeBlock";

/**
 * Componente di esempio per mostrare l'utilizzo del componente Badge.
 */
const ExampleBadge = () => {
  const codeSnippet = `
import Badge from "./Badge";

// Esempi di varianti
<Badge>Default</Badge>
<Badge variant="primary">Primary</Badge>
<Badge variant="success">Success</Badge>
<Badge variant="danger">Danger</Badge>

// Esempio con classe per stile "pill"
<Badge variant="primary" className="badge-pill">
  Pill
</Badge>

// Esempio all'interno di un altro elemento
<button>
  Notifiche <Badge variant="danger">9+</Badge>
</button>
`;

  return (
    <Card>
      <CardHeader>Esempi di Badge</CardHeader>
      <div
        style={{ display: "flex", gap: "1rem", alignItems: "center", flexWrap: "wrap" }}
      >
        <Badge>Default</Badge>
        <Badge variant="primary">Primary</Badge>
        <Badge variant="secondary">Secondary</Badge>
        <Badge variant="success">Success</Badge>
        <Badge variant="danger">Danger</Badge>
        <Badge variant="warning">Warning</Badge>
        <Badge variant="info">Info</Badge>
        <Badge variant="primary" className="badge-pill">
          Pill
        </Badge>
        <button style={{ fontSize: "1rem" }}>
          Notifiche <Badge variant="danger">9+</Badge>
        </button>
      </div>
      <CodeBlock code={codeSnippet} />
    </Card>
  );
};

export default ExampleBadge;
