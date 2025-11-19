import React from "react";
import Card from "../Card";
import CardHeader from "../CardHeader";
import Modal from "../Modal";
import Button from "../Button";
import ExampleInput from "./ExampleInput";
import useDisclosure from "../useDisclosure";
import CardFooter from "../CardFooter";
import CodeBlock from "../CodeBlock";

/**
 * Componente di esempio per mostrare l'utilizzo del componente Modal.
 */
const ExampleModal = () => {
  const { isOpen, onOpen, onClose } = useDisclosure(false);

  const codeSnippet = `
import React from 'react';
import Modal from "./Modal";
import Button from "./Button";
import CardFooter from "./CardFooter";
import useDisclosure from "./useDisclosure";

const MyComponent = () => {
  const { isOpen, onOpen, onClose } = useDisclosure();

  return (
    <>
      <Button onClick={onOpen}>Apri Modale</Button>
      <Modal isOpen={isOpen} onClose={onClose} title="Titolo Modale">
        <p>Contenuto del modale.</p>
        <CardFooter>
          <Button onClick={onClose} variant="secondary">Chiudi</Button>
          <Button onClick={() => alert('Salvato!')} variant="primary">Salva</Button>
        </CardFooter>
      </Modal>
    </>
  );
};`;

  return (
    <Card>
      <CardHeader>Esempio di Modale</CardHeader>
      <Button onClick={onOpen}>Apri Modale con contenuto lungo</Button>

      <Modal isOpen={isOpen} onClose={onClose} title="Dettagli Utente">
        <p>
          Questo è un esempio di modale che può contenere qualsiasi tipo di
          contenuto, come form, dettagli di un elemento, ecc.
        </p>
        <p>
          Aggiungiamo del testo per rendere il contenuto più lungo e testare lo
          scroll.
        </p>
        <p>
          Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed non
          risus. Suspendisse lectus tortor, dignissim sit amet, adipiscing nec,
          ultricies sed, dolor. Cras elementum ultrices diam. Maecenas ligula
          massa, varius a, semper congue, euismod non, mi.
        </p>
        <ExampleInput /> {/* Esempio di contenuto all'interno del modale */}
        <p>
          Proin porttitor, orci nec nonummy molestie, enim est eleifend mi, non
          fermentum diam nisl sit amet erat. Duis semper. Duis arcu massa,
          scelerisque vitae, consequat in, pretium a, enim. Pellentesque congue.
          Ut in risus volutpat libero pharetra tempor. Cras vestibulum bibendum
          augue. Praesent egestas leo in pede. Praesent blandit odio eu enim.
          Pellentesque sed dui ut augue blandit sodales. Vestibulum ante ipsum
          primis in faucibus orci luctus et ultrices posuere cubilia Curae;
          Aliquam nibh.
        </p>
        <CardFooter>
          <Button onClick={onClose} variant="secondary">
            Chiudi
          </Button>
          <Button
            onClick={() => {
              alert("Dati salvati!");
              onClose();
            }}
            variant="primary"
          >
            Salva
          </Button>
        </CardFooter>
      </Modal>
      <CodeBlock code={codeSnippet} />
    </Card>
  );
};

export default ExampleModal;
