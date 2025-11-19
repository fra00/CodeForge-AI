import React, { useState, useEffect } from "react";
import Card from "../Card";
import CardHeader from "../CardHeader";
import ProgressBar from "../ProgressBar";
import CodeBlock from "../CodeBlock";

const ExampleProgressBar = () => {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setProgress((oldProgress) =>
        oldProgress >= 100 ? 0 : oldProgress + 10
      );
    }, 500);

    return () => {
      clearInterval(interval);
    };
  }, []);

  const codeSnippet = `
import React, { useState } from "react";
import ProgressBar from "./ProgressBar";

const MyComponent = () => {
  const [progress, setProgress] = useState(40);

  return (
    <ProgressBar progress={progress} />
  );
};`;

  return (
    <Card>
      <CardHeader>Esempio di Barra di Progresso</CardHeader>
      <p>
        La barra di progresso si aggiorna dinamicamente ogni mezzo secondo in
        questo esempio.
      </p>
      <div style={{ marginTop: "1rem" }}>
        <ProgressBar progress={progress} />
      </div>
      <CodeBlock code={codeSnippet} />
    </Card>
  );
};

export default ExampleProgressBar;
