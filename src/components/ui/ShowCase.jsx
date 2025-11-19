import React from "react";

// Core Components
import { Tabs, TabList, Tab, TabPanels, TabPanel } from "./Tabs";

// Examples: Layout e Struttura
import ExampleAccordion from "./example/ExampleAccordion";
import ExampleBox from "./example/ExampleBox";
import ExampleArticle from "./example/ExampleArticle";
import ExampleGrid from "./example/ExampleGrid";
import ExampleBreadcrumbs from "./example/ExampleBreadcrumbs";
import ExampleCard from "./example/ExampleCard";
import ExampleDrawer from "./example/ExampleDrawer";
import ExampleModal from "./example/ExampleModal";
import ExampleTabs from "./example/ExampleTabs";
import ExampleToolbar from "./example/ExampleToolbar";
import ExampleWizard from "./example/ExampleWizard";

// Examples: Controlli per Form
import ExampleButton from "./example/ExampleButton";
import ExampleCheckbox from "./example/ExampleCheckbox";
import ExampleRadioGroup from "./example/ExampleRadioGroup";
import ExampleInput from "./example/ExampleInput";
import ExampleSelect from "./example/ExampleSelect";
import ExampleTextarea from "./example/ExampleTextarea";
import ExampleToggleSwitch from "./example/ExampleToggleSwitch";

// Examples: Feedback e Notifica
import ExampleAlert from "./example/ExampleAlert";
import ExampleProgressBar from "./example/ExampleProgressBar";
import ExampleSpinner from "./example/ExampleSpinner";
import ExampleTooltip from "./example/ExampleTooltip";

// Examples: Visualizzazione Dati
import ExampleAvatar from "./example/ExampleAvatar";
import ExampleBadge from "./example/ExampleBadge";
import ExampleList from "./example/ExampleList";
import ExampleTable from "./example/ExampleTable";

// Examples: Hooks
import ExampleUseDisclosure from "./example/ExampleUseDisclosure";

// Styles
import "./showcase.css";

function ShowCase() {
  return (
    <div className="showcase">
      <Tabs defaultIndex={0}>
        <TabList>
          <Tab>Layout e Struttura</Tab>
          <Tab>Controlli per Form</Tab>
          <Tab>Feedback e Notifica</Tab>
          <Tab>Visualizzazione Dati</Tab>
          <Tab>Hooks</Tab>
        </TabList>
        <TabPanels>
          <TabPanel>
            <ExampleToolbar />
            <ExampleBox />
            <ExampleArticle />
            <ExampleGrid />
            <ExampleCard />
            <ExampleModal />
            <ExampleAccordion />
            <ExampleBreadcrumbs />
            <ExampleDrawer />
            <ExampleWizard />
            <ExampleTabs />
          </TabPanel>
          <TabPanel>
            <ExampleButton />
            <ExampleInput />
            <ExampleSelect />
            <ExampleTextarea />
            <ExampleCheckbox />
            <ExampleToggleSwitch />
            <ExampleRadioGroup />
          </TabPanel>
          <TabPanel>
            <ExampleAlert />
            <ExampleSpinner />
            <ExampleTooltip />
            <ExampleProgressBar />
          </TabPanel>
          <TabPanel>
            <ExampleAvatar />
            <ExampleBadge />
            <ExampleList />
            <ExampleTable />
          </TabPanel>
          <TabPanel>
            <ExampleUseDisclosure />
          </TabPanel>
        </TabPanels>
      </Tabs>
    </div>
  );
}

export default ShowCase;
