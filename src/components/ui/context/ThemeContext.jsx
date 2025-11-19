import React, { createContext, useState, useMemo, useEffect } from 'react';

// Create a context for the theme
export const ThemeContext = createContext();

// Create a provider component
export const ThemeProvider = ({ children }) => {
  const [theme, setTheme] = useState('light');

  // Function to toggle the theme
  const toggleTheme = () => {
    setTheme((prevTheme) => (prevTheme === 'light' ? 'dark' : 'light'));
  };

  // Apply the theme class to the body element
  useEffect(() => {
    document.body.className = '';
    document.body.classList.add(theme);
  }, [theme]);

  // Memoize the context value to prevent unnecessary re-renders
  const value = useMemo(() => ({
    theme,
    toggleTheme,
  }), [theme]);

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
};
