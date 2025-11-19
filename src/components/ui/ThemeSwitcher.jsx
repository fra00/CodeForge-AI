import React from "react";
import { useTheme } from "./context/ThemeContext";
import ToggleSwitch from "./ToggleSwitch";
import "./ThemeSwitcher.css";

/**
 * Un componente che permette all'utente di cambiare il tema dell'applicazione (chiaro/scuro).
 * Utilizza il ToggleSwitch per l'interazione.
 */
const ThemeSwitcher = () => {
  const { theme, toggleTheme } = useTheme();

  return (
    <div className="theme-switcher-container">
      <ToggleSwitch
        id="theme-switcher"
        // L'etichetta cambia dinamicamente con il tema
        label={theme === "light" ? "Tema Chiaro" : "Tema Scuro"}
        checked={theme === "light"}
        onChange={toggleTheme}
      />
    </div>
  );
};

export default ThemeSwitcher;
