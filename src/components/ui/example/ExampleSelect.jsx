import React, { useState } from "react";
import Card from "../Card";
import CardHeader from "../CardHeader";
import Select from "../Select";
import CodeBlock from "../CodeBlock";

/**
 * Componente di esempio per mostrare l'utilizzo del componente Select.
 */
const ExampleSelect = () => {
  const options = [
    { value: "opzione1", label: "Opzione 1" },
    { value: "opzione2", label: "Opzione 2" },
    { value: "opzione3", label: "Opzione 3" },
  ];

  const [selectedValue, setSelectedValue] = useState("opzione1");
  const [errorValue, setErrorValue] = useState("opzione2");

  const codeSnippet = `
import React, { useState } from 'react';
import Select from './Select';

const MyComponent = () => {
  const options = [
    { value: 'opzione1', label: 'Opzione 1' },
    { value: 'opzione2', label: 'Opzione 2' },
  ];
  const [value, setValue] = useState('opzione1');

  return (
    <Select
      id="select-example"
      label="Scegli un'opzione"
      options={options}
      value={value}
      onChange={(e) => setValue(e.target.value)}
    />
  );
};`;

  return (
    <Card>
      <CardHeader>Esempi di Select</CardHeader>
      <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
        <Select
          id="select-1"
          label="Select Normale"
          options={options}
          value={selectedValue}
          onChange={(e) => setSelectedValue(e.target.value)}
        />
        <Select
          id="select-2"
          label="Select con Errore"
          options={options}
          value={errorValue}
          onChange={(e) => setErrorValue(e.target.value)}
          error="Devi selezionare un valore."
        />
        <Select
          id="select-3"
          label="Select Disabilitata"
          options={options}
          value="opzione1"
          onChange={() => {}}
          disabled
        />
      </div>
      <CodeBlock code={codeSnippet} />
    </Card>
  );
};

export default ExampleSelect;