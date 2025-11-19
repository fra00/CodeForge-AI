import React, { useState } from "react";
import Card from "../Card";
import CardHeader from "../CardHeader";
import ToggleSwitch from "../ToggleSwitch";
import CodeBlock from "../CodeBlock";

/**
 * Componente di esempio per mostrare l'utilizzo del componente ToggleSwitch.
 */
const ExampleToggleSwitch = () => {
  const [isToggled1, setIsToggled1] = useState(true);
  const [isToggled2, setIsToggled2] = useState(false);

  const codeSnippet = `
import React, { useState } from "react";
import ToggleSwitch from "./ToggleSwitch";

const MyComponent = () => {
  const [isEnabled, setIsEnabled] = useState(true);

  return (
    <>
      <ToggleSwitch
        id="toggle-example"
        label="Abilita notifiche"
        checked={isEnabled}
        onChange={() => setIsEnabled(!isEnabled)}
      />
      <ToggleSwitch
        id="toggle-disabled"
        label="Opzione disabilitata"
        checked={true}
        disabled
      />
    </>
  );
};`;

  return (
    <Card>
      <CardHeader>Esempi di Toggle Switch</CardHeader>
      <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
        <ToggleSwitch
          id="toggle-1"
          label="Attivato"
          checked={isToggled1}
          onChange={() => setIsToggled1(!isToggled1)}
        />
        <ToggleSwitch
          id="toggle-2"
          label="Disattivato"
          checked={isToggled2}
          onChange={() => setIsToggled2(!isToggled2)}
        />
        <ToggleSwitch
          id="toggle-3"
          label="Disabilitato"
          checked={true}
          onChange={() => {}}
          disabled
        />
      </div>
      <CodeBlock code={codeSnippet} />
    </Card>
  );
};

export default ExampleToggleSwitch;
