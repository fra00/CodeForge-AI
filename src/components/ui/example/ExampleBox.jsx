import React from "react";
import Box from "../Box";
import Card from "../Card";
import CardHeader from "../CardHeader";
import CodeBlock from "../CodeBlock";
import "./ExampleBox.css";

const ExampleBox = () => {
  const codeSnippet = `
import Box from "./Box";

// Box di base (renderizza un \`div\`)
<Box>
  <p>Contenuto dentro un Box semplice.</p>
</Box>

// Box con classe personalizzata
<Box className="custom-box">
  <p>Questo Box ha uno sfondo e un padding personalizzati.</p>
</Box>

// Box con props aggiuntive (es. \`id\` e \`style\`)
<Box
  id="my-unique-box"
  style={{ border: "2px dashed var(--color-primary)" }}
>
  <p>Questo Box ha un ID e uno stile inline.</p>
</Box>

// Box renderizzato come elemento \`section\`
<Box as="section">
  <h3>Titolo Sezione</h3>
  <p>Contenuto dentro un tag \`section\`.</p>
</Box>
`;

  return (
    <Card>
      <CardHeader>Esempi di Box</CardHeader>
      <p>
        Il componente <code>Box</code> è un contenitore primitivo e flessibile.
        Di base, renderizza un <code>div</code> ma può essere cambiato con la
        prop <code>as</code>.
      </p>
      <div style={{ display: "flex", flexDirection: "column", gap: "1rem", marginTop: "1rem" }}>
        <Box>
          <p>Questo è un contenuto dentro un Box semplice.</p>
        </Box>
        <Box className="custom-box">
          <p>Questo Box ha uno sfondo e un padding personalizzati.</p>
        </Box>
        <Box id="my-unique-box" style={{ border: "2px dashed var(--color-primary)" }}>
          <p>Questo Box ha un ID e uno stile inline.</p>
        </Box>
        <Box as="section">
          <h3>Questo è un titolo h3 dentro una section</h3>
          <p>
            Questo contenuto è all'interno di un tag <code>section</code> invece
            di un <code>div</code>.
          </p>
        </Box>
      </div>
      <CodeBlock code={codeSnippet} />
    </Card>
  );
};

export default ExampleBox;
