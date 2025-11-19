import React from "react";
import Card from "../Card";
import CardHeader from "../CardHeader";
import CodeBlock from "../CodeBlock";
import { Grid, GridItem } from "../Grid";
import Box from "../Box";

const ExampleGrid = () => {
  const codeSnippet = `
import { Grid, GridItem } from "./Grid";
import Box from "./Box";

// La griglia usa classi simili a Tailwind per la struttura.
// Assicurati che il tuo setup CSS le supporti.
<Grid cols={3} gap={4} className="mt-4 text-center">
  <GridItem colSpan={2}>
    <Box>Colonna Larga (2/3)</Box>
  </GridItem>
  <GridItem>
    <Box>Colonna Stretta (1/3)</Box>
  </GridItem>
  <GridItem>
    <Box>Colonna 1</Box>
  </GridItem>
  <GridItem>
    <Box>Colonna 2</Box>
  </GridItem>
  <GridItem>
    <Box>Colonna 3</Box>
  </GridItem>
</Grid>`;

  return (
    <Card>
      <CardHeader>Grid Component</CardHeader>
      <p>
        Esempio di layout a griglia. Questi componenti sono un'astrazione che
        genera classi simili a quelle di Tailwind CSS.
      </p>
      <Grid cols={3} gap={4} className="mt-4 text-center">
        <GridItem colSpan={2}>
          <Box style={{ border: "1px dashed var(--card-border-color)" }}>
            Colonna Larga (2/3)
          </Box>
        </GridItem>
        <GridItem>
          <Box style={{ border: "1px dashed var(--card-border-color)" }}>
            Colonna Stretta (1/3)
          </Box>
        </GridItem>
        <GridItem>
          <Box style={{ border: "1px dashed var(--card-border-color)" }}>
            Colonna 1
          </Box>
        </GridItem>
        <GridItem>
          <Box style={{ border: "1px dashed var(--card-border-color)" }}>
            Colonna 2
          </Box>
        </GridItem>
        <GridItem>
          <Box style={{ border: "1px dashed var(--card-border-color)" }}>
            Colonna 3
          </Box>
        </GridItem>
      </Grid>
      <CodeBlock code={codeSnippet} />
    </Card>
  );
};

export default ExampleGrid;
