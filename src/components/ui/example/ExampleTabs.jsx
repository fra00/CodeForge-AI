import React from "react";
import Card from "../Card";
import CardHeader from "../CardHeader";
import { Tabs, TabList, Tab, TabPanels, TabPanel } from "../Tabs";
import CodeBlock from "../CodeBlock";

/**
 * Componente di esempio per mostrare l'utilizzo del componente Tabs.
 */
const ExampleTabs = () => {
  const codeSnippet = `
import { Tabs, TabList, Tab, TabPanels, TabPanel } from "./Tabs";

<Tabs>
  <TabList>
    <Tab>Profilo</Tab>
    <Tab>Impostazioni</Tab>
    <Tab>Fatturazione</Tab>
  </TabList>
  <TabPanels>
    <TabPanel>
      <p>Contenuto del pannello "Profilo".</p>
    </TabPanel>
    <TabPanel>
      <p>
        Contenuto del pannello "Impostazioni".
      </p>
    </TabPanel>
    <TabPanel>
      <p>
        Contenuto del pannello "Fatturazione".
      </p>
    </TabPanel>
  </TabPanels>
</Tabs>`;

  return (
    <Card>
      <CardHeader>Esempi di Tabs</CardHeader>
      <Tabs>
        <TabList>
          <Tab>Profilo</Tab>
          <Tab>Impostazioni</Tab>
          <Tab>Fatturazione</Tab>
        </TabList>
        <TabPanels>
          <TabPanel>
            <p>Contenuto del pannello "Profilo".</p>
          </TabPanel>
          <TabPanel>
            <p>
              Contenuto del pannello "Impostazioni". Qui puoi modificare le
              preferenze.
            </p>
          </TabPanel>
          <TabPanel>
            <p>
              Contenuto del pannello "Fatturazione". Visualizza le tue fatture
              qui.
            </p>
          </TabPanel>
        </TabPanels>
      </Tabs>
      <CodeBlock code={codeSnippet} />
    </Card>
  );
};

export default ExampleTabs;
