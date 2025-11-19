import React, { useState } from "react";
import Card from "../Card";
import CardHeader from "../CardHeader";
import Input from "../Input";
import CodeBlock from "../CodeBlock";

/**
 * Componente di esempio per mostrare l'utilizzo del componente Input.
 */
const ExampleInput = () => {
  const [text, setText] = useState("Testo di esempio");
  const [errorText, setErrorText] = useState("Testo con errore");

  const codeSnippet = `
import React, { useState } from 'react';
import Input from './Input';

const MyComponent = () => {
  const [text, setText] = useState('Testo di esempio');

  return (
    <>
      <Input
        id="input-normal"
        label="Input Normale"
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Inserisci del testo..."
      />
      <Input
        id="input-error"
        label="Input con Errore"
        value={text}
        error="Questo campo è obbligatorio."
      />
      <Input id="input-disabled" label="Input Disabilitato" value="Non puoi scrivere qui" disabled />
    </>
  );
};`;

  return (
    <Card>
      <CardHeader>Esempi di Input</CardHeader>
      <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
        <Input
          id="input-1"
          label="Input Normale"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Inserisci del testo..."
        />
        <Input
          id="input-2"
          label="Input con Errore"
          value={errorText}
          onChange={(e) => setErrorText(e.target.value)}
          error="Questo campo è obbligatorio."
        />
        <Input
          id="input-3"
          label="Input Disabilitato"
          value="Non puoi scrivere qui"
          onChange={() => {}}
          disabled
        />
      </div>
      <CodeBlock code={codeSnippet} />
    </Card>
  );
};

export default ExampleInput;