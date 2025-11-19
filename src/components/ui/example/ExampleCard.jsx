import React, { useState } from "react";
import Card from "../Card";
import CardHeader from "../CardHeader";
import Button from "../Button";
import Input from "../Input";
import CodeBlock from "../CodeBlock";
import "./ExampleCard.css";

/**
 * Un componente che mostra esempi di utilizzo del componente Card.
 */
function ExampleCard() {
  const [name, setName] = useState("");

  const codeSnippet = `
import Card from "./Card";
import CardHeader from "./CardHeader";
import Button from "./Button";
import Input from "./Input";
import './ExampleCard.css'; // Contiene .custom-card-style

// Card semplice
<Card>
  <CardHeader>Card Semplice</CardHeader>
  <p>Contenuto della card.</p>
</Card>

// Card con componenti interattivi
<Card>
  <CardHeader>Card con Componenti</CardHeader>
  <Input id="name" label="Nome" />
  <Button style={{ marginTop: '1rem' }}>Invia</Button>
</Card>

// Card con stile personalizzato
<Card className="custom-card-style">
  <CardHeader>Card con Stile Custom</CardHeader>
  <p>Questa card ha uno stile custom.</p>
</Card>
`;

  return (
    <Card>
      <CardHeader>Esempi di Card</CardHeader>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
          gap: "2rem",
          width: "100%",
          marginTop: "1rem",
        }}
      >
        <Card>
          <CardHeader>Card Semplice</CardHeader>
          <p>Contenuto che può includere testo, immagini o altri componenti.</p>
        </Card>

        <Card>
          <CardHeader>Card con Componenti</CardHeader>
          <p>Usa le card per raggruppare elementi interattivi.</p>
          <Input
            id="card-name"
            label="Il tuo nome"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="es. Ada Lovelace"
          />
          <Button
            variant="primary"
            onClick={() => alert(`Ciao, ${name}!`)}
            style={{ marginTop: "1rem" }}
          >
            Invia
          </Button>
        </Card>

        <Card className="custom-card-style">
          <CardHeader>Card con Stile Custom</CardHeader>
          <p>Questa card ha una classe CSS per una personalizzazione extra.</p>
        </Card>
      </div>
      <CodeBlock code={codeSnippet} />
    </Card>
  );
}

export default ExampleCard;