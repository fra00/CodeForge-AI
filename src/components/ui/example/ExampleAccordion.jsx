import React from "react";
import Card from "../Card";
import CardHeader from "../CardHeader";
import CodeBlock from "../CodeBlock";
import {
  Accordion,
  AccordionItem,
  AccordionHeader,
  AccordionPanel,
} from "../Accordion";

/**
 * Componente di esempio per mostrare l'utilizzo del componente Accordion.
 */
const ExampleAccordion = () => {
  const codeSnippet = `
import {
  Accordion,
  AccordionItem,
  AccordionHeader,
  AccordionPanel,
} from "./Accordion";

// Accordion che permette un solo pannello aperto
<Accordion>
  <AccordionItem>
    <AccordionHeader>Sezione 1</AccordionHeader>
    <AccordionPanel>Contenuto della prima sezione.</AccordionPanel>
  </AccordionItem>
  <AccordionItem>
    <AccordionHeader>Sezione 2</AccordionHeader>
    <AccordionPanel>Contenuto della seconda sezione.</AccordionPanel>
  </AccordionItem>
</Accordion>

// Accordion che permette più pannelli aperti e ne apre uno di default
<Accordion allowMultiple defaultIndexes={[0]}>
  <AccordionItem>
    <AccordionHeader>Opzione A</AccordionHeader>
    <AccordionPanel>Dettagli per l'opzione A.</AccordionPanel>
  </AccordionItem>
  <AccordionItem>
    <AccordionHeader>Opzione B</AccordionHeader>
    <AccordionPanel>Dettagli per l'opzione B.</AccordionPanel>
  </AccordionItem>
</Accordion>`;

  return (
    <Card>
      <CardHeader>Esempi di Accordion</CardHeader>

      <Accordion>
        <AccordionItem>
          <AccordionHeader>Sezione 1 (un solo pannello aperto)</AccordionHeader>
          <AccordionPanel>Contenuto della prima sezione.</AccordionPanel>
        </AccordionItem>
        <AccordionItem>
          <AccordionHeader>Sezione 2 (più pannelli aperti)</AccordionHeader>
          <AccordionPanel>Contenuto della seconda sezione.</AccordionPanel>
        </AccordionItem>
      </Accordion>
      <CodeBlock code={codeSnippet} />
    </Card>
  );
};

export default ExampleAccordion;
