import React from 'react';
import Card from "../Card";
import CardHeader from "../CardHeader";
import Button from '../Button';
import Drawer from "../Drawer";
import useDisclosure from "../useDisclosure";
import CodeBlock from '../CodeBlock';

/**
 * Componente di esempio per mostrare l'utilizzo del componente Drawer.
 */
const ExampleDrawer = () => {
  const {
    isOpen: isLeftOpen,
    onOpen: onLeftOpen,
    onClose: onLeftClose,
  } = useDisclosure();
  const {
    isOpen: isRightOpen,
    onOpen: onRightOpen,
    onClose: onRightClose,
  } = useDisclosure();

  const codeSnippet = `
import React from 'react';
import Drawer from "./Drawer";
import Button from "./Button";
import CardHeader from "./CardHeader";
import useDisclosure from "./useDisclosure";

const MyComponent = () => {
  const { isOpen, onOpen, onClose } = useDisclosure();

  return (
    <>
      <Button onClick={onOpen}>Apri Drawer</Button>
      <Drawer
        isOpen={isOpen}
        onClose={onClose}
        position="left"
      >
        <CardHeader>Menu</CardHeader>
        <div style={{ padding: '1.5rem' }}>
          <p>Voce di menu 1</p>
          <p>Voce di menu 2</p>
        </div>
      </Drawer>
    </>
  );
};`;

  return (
    <Card>
      <CardHeader>Esempi di Drawer</CardHeader>
      <p>
        I cassetti (Drawer) possono essere aperti cliccando i bottoni o usando
        la linguetta laterale.
      </p>
      <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
        <Button onClick={onLeftOpen}>Apri Drawer da Sinistra</Button>
        <Button onClick={onRightOpen}>Apri Drawer da Destra</Button>
      </div>

      {/* Drawer da Sinistra */}
      <Drawer
        isOpen={isLeftOpen}
        onOpen={onLeftOpen}
        onClose={onLeftClose}
        position="left"
      >
        <CardHeader>Menu</CardHeader>
        <div style={{ padding: '1.5rem', flex: 1, overflowY: 'auto' }}>
          <p>Voce di menu 1</p>
          <p>Voce di menu 2</p>
          <p>Voce di menu 3</p>
        </div>
      </Drawer>

      {/* Drawer da Destra */}
      <Drawer isOpen={isRightOpen} onOpen={onRightOpen} onClose={onRightClose} position="right">
        <CardHeader>Dettagli</CardHeader>
        <div style={{ padding: '1.5rem', flex: 1, overflowY: 'auto' }}>
          <p>Qui puoi mostrare dettagli aggiuntivi, un form di modifica, o altre informazioni contestuali.</p>
        </div>
      </Drawer>
      <CodeBlock code={codeSnippet} />
    </Card>
  );
};

export default ExampleDrawer;
