import React, { useState, createContext, useContext } from "react";
import PropTypes from "prop-types";
import "./Tabs.css";

/**
 * @private
 * Context per condividere lo stato (indice attivo) e le funzioni di aggiornamento
 * tra i componenti delle tab.
 */
const TabsContext = createContext(null);

/**
 * Contenitore principale per il componente Tabs. Gestisce lo stato della tab attiva.
 * È composto da `TabList`, `Tab`, `TabPanels` e `TabPanel`.
 *
 * @example
 * // Esempio di Tabs con tre pannelli.
 * <Tabs>
 *   <TabList>
 *     <Tab>Profilo</Tab>
 *     <Tab>Impostazioni</Tab>
 *     <Tab>Fatturazione</Tab>
 *   </TabList>
 *   <TabPanels>
 *     <TabPanel>
 *       <p>Contenuto del pannello "Profilo".</p>
 *     </TabPanel>
 *     <TabPanel>
 *       <p>Contenuto del pannello "Impostazioni".</p>
 *     </TabPanel>
 *     <TabPanel>
 *       <p>Contenuto del pannello "Fatturazione".</p>
 *     </TabPanel>
 *   </TabPanels>
 * </Tabs>
 *
 * @example
 * // Esempio con la seconda tab attiva di default.
 * <Tabs defaultIndex={1}>
 *   { ...stessi TabList e TabPanels... }
 * </Tabs>
 */
export const Tabs = ({ children, defaultIndex = 0 }) => {
  const [activeIndex, setActiveIndex] = useState(defaultIndex);
  const value = { activeIndex, setActiveIndex };

  return (
    <TabsContext.Provider value={value}>
      <div className="tabs-container">{children}</div>
    </TabsContext.Provider>
  );
};

Tabs.propTypes = {
  children: PropTypes.node.isRequired,
  defaultIndex: PropTypes.number,
};

/**
 * A container for the tab buttons. It handles accessibility attributes
 * and clones its children to provide them with necessary props.
 */
export const TabList = ({ children }) => (
  <div className="tab-list" role="tablist" aria-label="Dynamic tabs">
    {React.Children.map(children, (child, index) =>
      // Pass the index to each Tab component
      React.cloneElement(child, { index })
    )}
  </div>
);

TabList.propTypes = {
  children: PropTypes.node.isRequired,
};

/**
 * An individual, clickable tab button that controls which panel is visible.
 */
export const Tab = ({ children, index }) => {
  const context = useContext(TabsContext);
  if (context === null) {
    // This check is important in case a Tab is rendered outside a Tabs provider
    throw new Error("Tab components must be rendered within a Tabs container.");
  }

  const { activeIndex, setActiveIndex } = context;
  const isActive = index === activeIndex;

  return (
    <button
      type="button"
      role="tab"
      aria-selected={isActive}
      aria-controls={`tabpanel-${index}`}
      id={`tab-${index}`}
      className={`tab ${isActive ? "tab-active" : ""}`}
      onClick={() => setActiveIndex(index)}
    >
      {children}
    </button>
  );
};

Tab.propTypes = {
  children: PropTypes.node.isRequired,
  index: PropTypes.number, // Injected by TabList
};

/**
 * A container for the content of all tabs.
 * It only renders the content of the currently active tab.
 */
export const TabPanels = ({ children }) => {
  const { activeIndex } = useContext(TabsContext);
  if (activeIndex === null) return null;

  return (
    <div className="tab-panels">
      {React.Children.toArray(children)[activeIndex]}
    </div>
  );
};

TabPanels.propTypes = {
  children: PropTypes.node.isRequired,
};

/**
 * The content for a single tab panel.
 */
export const TabPanel = ({ children, index }) => {
  return (
    <div
      role="tabpanel"
      aria-labelledby={`tab-${index}`}
      id={`tabpanel-${index}`}
      className="tab-panel"
    >
      {children}
    </div>
  );
};

TabPanel.propTypes = {
  children: PropTypes.node.isRequired,
  index: PropTypes.number, // Not used for rendering, but good for consistency
};
