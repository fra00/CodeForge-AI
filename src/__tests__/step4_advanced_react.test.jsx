import React, { createContext, useContext, useState } from "react";
// renderHook e act sono globali, non serve importarli

// 1. Setup del Context
const ThemeContext = createContext("light");

const ThemeProvider = ({ children }) => {
  const [theme, setTheme] = useState("light");
  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

// 2. Custom Hook che usa il Context
const useTheme = () => useContext(ThemeContext);

describe("Step 4: Advanced React (JSX & Context)", () => {
  test("should use wrapper for Context", () => {
    // Definiamo il wrapper usando JSX (Babel lo transpilera')
    const wrapper = ({ children }) => <ThemeProvider>{children}</ThemeProvider>;

    const { result } = renderHook(() => useTheme(), { wrapper });

    // Verifica valore iniziale
    expect(result.current.theme).toBe("light");

    // Verifica aggiornamento stato nel context
    act(() => {
      result.current.setTheme("dark");
    });

    expect(result.current.theme).toBe("dark");
  });
});
