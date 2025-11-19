import React, { useState } from "react";
import Card from "../Card";
import CardHeader from "../CardHeader";
import Textarea from "../Textarea";
import CodeBlock from "../CodeBlock";

/**
 * Componente di esempio per mostrare l'utilizzo del componente Textarea.
 */
const ExampleTextarea = () => {
  const [text, setText] = useState("Testo di esempio su più righe.");
  const [errorText, setErrorText] = useState("Testo con errore.");

  const codeSnippet = `
import React, { useState } from "react";
import Textarea from "./Textarea";

const MyComponent = () => {
  const [text, setText] = useState("Testo di esempio.");

  return (
    <>
      <Textarea
        id="textarea-example"
        label="La tua biografia"
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Scrivi qualcosa su di te..."
      />
      <Textarea
        id="textarea-error"
        label="Commento (con errore)"
        value=""
        error="Questo campo non può essere vuoto."
      />
      <Textarea id="textarea-disabled" label="Note (disabilitato)" value="Campo non modificabile" disabled />
    </>
  );
};`;

  return (
    <Card>
      <CardHeader>Esempi di Textarea</CardHeader>
      <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
        <Textarea
          id="textarea-1"
          label="Textarea Normale"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Inserisci del testo..."
        />
        <Textarea
          id="textarea-2"
          label="Textarea con Errore"
          value={errorText}
          onChange={(e) => setErrorText(e.target.value)}
          error="Questo campo è obbligatorio."
        />
        <Textarea
          id="textarea-3"
          label="Textarea Disabilitata"
          value="Non puoi scrivere qui"
          onChange={() => {}}
          disabled
        />
      </div>
      <CodeBlock code={codeSnippet} />
    </Card>
  );
};

export default ExampleTextarea;
