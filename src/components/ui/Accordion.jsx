import React, { useState, createContext, useContext, useRef } from "react";
import PropTypes from "prop-types";
import "./Accordion.css";

/**
 * @private
 * Context per condividere lo stato (indici aperti) e le funzioni di toggle
 * tra i componenti dell'accordion.
 */
const AccordionContext = createContext(null);

/**
 * Il contenitore principale dell'Accordion. Gestisce quali elementi sono aperti.
 * È composto da `AccordionItem`, `AccordionHeader` e `AccordionPanel`.
 *
 * @example
 * // Accordion base (un solo pannello aperto alla volta)
 * <Accordion>
 *   <AccordionItem>
 *     <AccordionHeader>Sezione 1</AccordionHeader>
 *     <AccordionPanel>Contenuto della prima sezione.</AccordionPanel>
 *   </AccordionItem>
 *   <AccordionItem>
 *     <AccordionHeader>Sezione 2</AccordionHeader>
 *     <AccordionPanel>Contenuto della seconda sezione.</AccordionPanel>
 *   </AccordionItem>
 * </Accordion>
 *
 * @example
 * // Accordion con pannelli multipli e uno aperto di default
 * <Accordion allowMultiple defaultIndexes={[0]}>
 *   <AccordionItem>
 *     <AccordionHeader>Opzione A</AccordionHeader>
 *     <AccordionPanel>Dettagli per l'opzione A.</AccordionPanel>
 *   </AccordionItem>
 *   <AccordionItem>
 *     <AccordionHeader>Opzione B</AccordionHeader>
 *     <AccordionPanel>Dettagli per l'opzione B.</AccordionPanel>
 *   </AccordionItem>
 * </Accordion>
 */
export const Accordion = ({
  children,
  allowMultiple = false,
  defaultIndexes = [],
}) => {
  const [openIndexes, setOpenIndexes] = useState(defaultIndexes);

  const toggleIndex = (index) => {
    if (allowMultiple) {
      setOpenIndexes((current) =>
        current.includes(index)
          ? current.filter((i) => i !== index)
          : [...current, index]
      );
    } else {
      setOpenIndexes((current) => (current.includes(index) ? [] : [index]));
    }
  };

  const value = { openIndexes, toggleIndex };

  return (
    <AccordionContext.Provider value={value}>
      <div className="accordion">
        {React.Children.map(children, (child, index) =>
          // Inietta l'index in ogni AccordionItem
          React.isValidElement(child)
            ? React.cloneElement(child, { index })
            : child
        )}
      </div>
    </AccordionContext.Provider>
  );
};

Accordion.propTypes = {
  children: PropTypes.node.isRequired,
  allowMultiple: PropTypes.bool,
  defaultIndexes: PropTypes.arrayOf(PropTypes.number),
};

/**
 * @private
 * Context per fornire l'indice di un AccordionItem ai suoi figli (Header e Panel),
 * in modo che sappiano a quale elemento dell'accordion appartengono.
 */
const AccordionItemContext = createContext(null);

/**
 * A single item within the accordion, containing a header and a panel.
 */
export const AccordionItem = ({ children, index }) => {
  const value = { index };
  return (
    <AccordionItemContext.Provider value={value}>
      <div className="accordion-item">{children}</div>
    </AccordionItemContext.Provider>
  );
};

AccordionItem.propTypes = {
  children: PropTypes.node.isRequired,
  index: PropTypes.number, // This will be injected by the Accordion mapping
};

/**
 * The clickable header for an accordion item.
 */
export const AccordionHeader = ({ children }) => {
  const { openIndexes, toggleIndex } = useContext(AccordionContext);
  const { index } = useContext(AccordionItemContext);
  const isOpen = openIndexes.includes(index);

  return (
    <button
      type="button"
      className="accordion-header"
      aria-expanded={isOpen}
      onClick={() => toggleIndex(index)}
    >
      <span className="accordion-title">{children}</span>
      <span
        className={`accordion-icon ${isOpen ? "accordion-icon-open" : ""}`}
      />
    </button>
  );
};

AccordionHeader.propTypes = {
  children: PropTypes.node.isRequired,
};

/**
 * The content panel for an accordion item. It expands and collapses.
 */
export const AccordionPanel = ({ children }) => {
  const { openIndexes } = useContext(AccordionContext);
  const { index } = useContext(AccordionItemContext);
  const contentRef = useRef(null);
  const isOpen = openIndexes.includes(index);

  return (
    <div
      className="accordion-panel"
      style={{
        maxHeight: isOpen ? `${contentRef.current?.scrollHeight}px` : "0",
      }}
    >
      <div ref={contentRef} className="accordion-panel-content">
        {children}
      </div>
    </div>
  );
};

AccordionPanel.propTypes = {
  children: PropTypes.node.isRequired,
};
