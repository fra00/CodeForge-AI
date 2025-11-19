import React, { useState } from "react";
import Card from "../Card";
import CardHeader from "../CardHeader";
import Radio from "../Radio";
import RadioGroup from "../RadioGroup";
import CodeBlock from "../CodeBlock";

/**
 * Componente di esempio per mostrare l'utilizzo del componente RadioGroup.
 */
const ExampleRadioGroup = () => {
  const [favoritePet, setFavoritePet] = useState("dog");
  const [status, setStatus] = useState("active");

  const codeSnippet = `
import React, { useState } from "react";
import RadioGroup from "./RadioGroup";
import Radio from "./Radio";

const MyComponent = () => {
  const [selectedValue, setSelectedValue] = useState("dog");

  return (
    <RadioGroup
      name="pet"
      label="Qual è il tuo animale preferito?"
      selectedValue={selectedValue}
      onChange={setSelectedValue}
    >
      <Radio id="pet-dog" value="dog" label="Cane" />
      <Radio id="pet-cat" value="cat" label="Gatto" />
      <Radio id="pet-hamster" value="hamster" label="Criceto (Disabilitato)" disabled />
    </RadioGroup>
  );
};`;

  return (
    <Card>
      <CardHeader>Esempi di Radio Group</CardHeader>

      <RadioGroup
        name="pet"
        label="Qual è il tuo animale preferito?"
        selectedValue={favoritePet}
        onChange={setFavoritePet}
      >
        <Radio id="pet-dog" value="dog" label="Cane" />
        <Radio id="pet-cat" value="cat" label="Gatto" />
        <Radio id="pet-hamster" value="hamster" label="Criceto" />
      </RadioGroup>

      <RadioGroup
        name="status"
        label="Stato (con opzione disabilitata)"
        selectedValue={status}
        onChange={setStatus}
        className="mt-4"
      >
        <Radio id="status-active" value="active" label="Attivo" />
        <Radio id="status-inactive" value="inactive" label="Inattivo" />
        <Radio
          id="status-pending"
          value="pending"
          label="In attesa (Disabilitato)"
          disabled
        />
      </RadioGroup>
      <CodeBlock code={codeSnippet} />
    </Card>
  );
};

export default ExampleRadioGroup;
