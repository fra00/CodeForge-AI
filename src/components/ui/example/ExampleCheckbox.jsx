import React, { useState } from "react";
import Card from "../Card";
import CardHeader from "../CardHeader";
import Checkbox from "../Checkbox";
import CodeBlock from "../CodeBlock";

/**
 * Componente di esempio per mostrare l'utilizzo del componente Checkbox.
 */
const ExampleCheckbox = () => {
  const [isChecked1, setIsChecked1] = useState(true);
  const [isChecked2, setIsChecked2] = useState(false);

  const codeSnippet = `
import React, { useState } from "react";
import Checkbox from "./Checkbox";

const MyComponent = () => {
  const [isChecked, setIsChecked] = useState(true);

  return (
    <>
      <Checkbox
        id="checkbox-1"
        label="Checkbox controllato"
        checked={isChecked}
        onChange={() => setIsChecked(!isChecked)}
      />
      <Checkbox
        id="checkbox-disabled"
        label="Checkbox disabilitato"
        checked={true}
        disabled
      />
    </>
  );
};`;

  return (
    <Card>
      <CardHeader>Esempi di Checkbox</CardHeader>
      <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
        <Checkbox
          id="checkbox-1"
          label="Checkbox selezionato"
          checked={isChecked1}
          onChange={() => setIsChecked1(!isChecked1)}
        />
        <Checkbox
          id="checkbox-2"
          label="Checkbox non selezionato"
          checked={isChecked2}
          onChange={() => setIsChecked2(!isChecked2)}
        />
        <Checkbox
          id="checkbox-3"
          label="Checkbox disabilitato"
          checked={true}
          onChange={() => {}}
          disabled
        />
      </div>
      <CodeBlock code={codeSnippet} />
    </Card>
  );
};

export default ExampleCheckbox;
