import React, { useState } from "react";
import Card from "../Card";
import CardHeader from "../CardHeader";
import Alert from "../Alert";
import CodeBlock from "../CodeBlock";

/**
 * Componente di esempio per mostrare l'utilizzo del componente Alert.
 */
const ExampleAlert = () => {
  const [isDangerVisible, setIsDangerVisible] = useState(true);

  const codeSnippet = `
import React, { useState } from "react";
import Alert from "./Alert";

const MyComponent = () => {
  const [isDangerVisible, setIsDangerVisible] = useState(true);

  return (
    <>
      <Alert variant="success">
        <strong>Successo!</strong> Operazione completata.
      </Alert>

      {isDangerVisible && (
        <Alert variant="danger" onClose={() => setIsDangerVisible(false)}>
          <strong>Errore!</strong> Impossibile salvare.
        </Alert>
      )}

      <Alert variant="warning">
        <strong>Attenzione:</strong> Abbonamento in scadenza.
      </Alert>

      <Alert variant="info">Info: Termini di servizio aggiornati.</Alert>
    </>
  );
};`;

  return (
    <Card>
      <CardHeader>Esempi di Alert</CardHeader>
      <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
        <Alert variant="success">
          <strong>Successo!</strong> Operazione completata correttamente.
        </Alert>

        {isDangerVisible && (
          <Alert variant="danger" onClose={() => setIsDangerVisible(false)}>
            <strong>Errore!</strong> Impossibile salvare le modifiche.
          </Alert>
        )}

        <Alert variant="warning">
          <strong>Attenzione:</strong> Il tuo abbonamento sta per scadere.
        </Alert>

        <Alert variant="info">
          <strong>Info:</strong> Abbiamo aggiornato i nostri termini di
          servizio.
        </Alert>
      </div>
      <CodeBlock code={codeSnippet} />
    </Card>
  );
};

export default ExampleAlert;
