import React from "react";
import Card from "../Card";
import CardHeader from "../CardHeader";
import List from "../List";
import ListItem from "../ListItem";
import CodeBlock from "../CodeBlock";

/**
 * Componente di esempio per mostrare l'utilizzo dei componenti List e ListItem.
 */
const ExampleList = () => {
  const codeSnippet = `
import List from "./List";
import ListItem from "./ListItem";

// Lista non ordinata (default, renderizza <ul>)
<List>
  <ListItem>Primo elemento</ListItem>
  <ListItem>Secondo elemento</ListItem>
</List>

// Lista ordinata (usando la prop 'as', renderizza <ol>)
<List as="ol">
  <ListItem>Primo passo</ListItem>
  <ListItem>Secondo passo</ListItem>
</List>
`;

  return (
    <Card>
      <CardHeader>Esempi di Lista</CardHeader>
      <h4 style={{ marginTop: "0", marginBottom: "0.5rem" }}>
        Lista non ordinata (ul)
      </h4>
      <List>
        <ListItem>Primo elemento della lista</ListItem>
        <ListItem>Secondo elemento della lista</ListItem>
        <ListItem>Terzo elemento della lista</ListItem>
      </List>

      <h4 style={{ marginTop: "2rem", marginBottom: "0.5rem" }}>
        Lista ordinata (ol)
      </h4>
      <List as="ol">
        <ListItem>Primo passo della procedura</ListItem>
        <ListItem>Secondo passo della procedura</ListItem>
        <ListItem>Terzo passo della procedura</ListItem>
      </List>
      <CodeBlock code={codeSnippet} />
    </Card>
  );
};

export default ExampleList;