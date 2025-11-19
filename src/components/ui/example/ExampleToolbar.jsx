import React from "react";
import Card from "../Card";
import CardHeader from "../CardHeader";
import ThemeSwitcher from "../ThemeSwitcher";
import Button from "../Button";
import { useTheme } from "../context/ThemeContext";
import "./ExampleToolbar.css";

/**
 * Componente di esempio per mostrare l'utilizzo del componente Toolbar.
 */
const ExampleToolbar = () => {
  const { setTheme } = useTheme();

  return (
    <Card>
      <CardHeader>Esempi di Toolbar</CardHeader>
      <p>
        La vera Toolbar è fissata in cima alla pagina. Qui sotto sono mostrate
        delle simulazioni del suo contenuto per illustrarne le varianti.
      </p>

      <h4 style={{ marginTop: "2rem", marginBottom: "0.5rem" }}>
        Toolbar con Theme Switcher (visibile)
      </h4>
      <div className="toolbar-example-container">
        <div className="app-toolbar-title">Titolo App</div>
        <div className="app-toolbar-actions">
          <ThemeSwitcher />
        </div>
      </div>

      <h4 style={{ marginTop: "2rem", marginBottom: "0.5rem" }}>
        Toolbar senza Theme Switcher (nascosto)
      </h4>
      <div className="toolbar-example-container">
        <div className="app-toolbar-title">Titolo App</div>
        <div className="app-toolbar-actions">
          {/* In un caso reale, non si includerebbe il ThemeSwitcher */}
          <p style={{ fontSize: "0.9em", color: "var(--color-secondary)" }}>
            Nessuna azione
          </p>
        </div>
      </div>

      <h4 style={{ marginTop: "2rem", marginBottom: "0.5rem" }}>
        API per il cambio tema
      </h4>
      <p>
        Usa i bottoni seguenti per cambiare il tema in modo programmatico
        utilizzando la funzione `setTheme` esposta dal `useTheme` hook.
      </p>
      <div style={{ display: "flex", gap: "1rem", marginTop: "1rem" }}>
        <Button onClick={() => setTheme("light")} variant="secondary">
          Imposta Tema Chiaro
        </Button>
        <Button onClick={() => setTheme("dark")} variant="secondary">
          Imposta Tema Scuro
        </Button>
      </div>
    </Card>
  );
};

export default ExampleToolbar;
