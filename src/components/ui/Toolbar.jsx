import React from 'react';
import PropTypes from 'prop-types';
import ThemeSwitcher from './ThemeSwitcher';
import './Toolbar.css';

/**
 * Una toolbar fissa per l'applicazione, che può contenere un titolo
 * e opzionalmente il selettore del tema.
 */
const Toolbar = ({ title, children, showThemeSwitcher = true, className = "" }) => {
  const classNames = ["app-toolbar", className].filter(Boolean).join(" ");
  return (
    <header className={classNames}>
      <div className="app-toolbar-title">{title}</div>
      <div className="app-toolbar-actions">
        {children}
        {showThemeSwitcher && <ThemeSwitcher />}
      </div>
    </header>
  );
};

Toolbar.propTypes = {
  /**
   * Il titolo da visualizzare nella toolbar.
   */
  title: PropTypes.string,
  /**
   * I componenti da visualizzare nell'area delle azioni della toolbar.
   */
  children: PropTypes.node,
  /**
   * Se `true`, mostra il componente ThemeSwitcher.
   */
  showThemeSwitcher: PropTypes.bool,
  /**
   * Classi CSS aggiuntive da applicare al contenitore della toolbar.
   */
  className: PropTypes.string,
};

export default Toolbar;