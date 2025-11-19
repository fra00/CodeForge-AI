import React from "react";
import Card from "../Card";
import CardHeader from "../CardHeader";
import Button from "../Button";
import Box from "../Box";
import useDisclosure from "../useDisclosure";
import CodeBlock from "../CodeBlock";

/**
 * Componente di esempio per mostrare l'utilizzo dell'hook `useDisclosure`.
 */
const ExampleUseDisclosure = () => {
  const { isOpen, onOpen, onClose, onToggle } = useDisclosure();

  const codeSnippet = `
import React from 'react';
import useDisclosure from './useDisclosure';
import Button from './Button';
import Box from './Box';

const MyComponent = () => {
  const { isOpen, onOpen, onClose, onToggle } = useDisclosure();

  return (
    <>
      <Button onClick={onOpen}>Apri</Button>
      <Button onClick={onClose}>Chiudi</Button>
      <Button onClick={onToggle}>Toggle</Button>

      {isOpen && (
        <Box style={{ marginTop: '1rem' }}>
          <p>Questo contenuto è visibile!</p>
        </Box>
      )}
    </>
  );
};`;

  return (
    <Card>
      <CardHeader>Esempio di `useDisclosure`</CardHeader>
      <p>
        Questo hook gestisce lo stato di apertura/chiusura. Clicca i bottoni per
        vedere il risultato.
      </p>
      <div
        style={{
          display: "flex",
          gap: "1rem",
          marginTop: "1rem",
          flexWrap: "wrap",
        }}
      >
        <Button onClick={onOpen} variant="secondary">
          onOpen
        </Button>
        <Button onClick={onClose} variant="secondary">
          onClose
        </Button>
        <Button onClick={onToggle} variant="primary">
          onToggle
        </Button>
      </div>
      {isOpen && (
        <Box
          style={{
            marginTop: "1.5rem",
            borderColor: "var(--color-primary)",
            borderStyle: "dashed",
            borderWidth: "2px",
          }}
        >
          <p>
            <strong>Stato:</strong> Aperto (isOpen = true)
          </p>
          <p>
            Questo box è visibile perché lo stato gestito da `useDisclosure` è
            `true`.
          </p>
        </Box>
      )}
      <CodeBlock code={codeSnippet} />
    </Card>
  );
};

export default ExampleUseDisclosure;
