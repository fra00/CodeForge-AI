import React from "react";
import Card from "../Card";
import CardHeader from "../CardHeader";
import Article from "../Article";

const ExampleArticle = () => {
  return (
    <Card>
      <CardHeader>Article</CardHeader>
      <p className="mb-4">
        Il componente <code>Article</code> è un wrapper per contenuti di testo
        lunghi, come post di blog o documentazione. Utilizza il plugin{" "}
        <code>@tailwindcss/typography</code> per formattare automaticamente il
        contenuto.
      </p>

      <Article>
        <h1>Il Futuro dello Sviluppo Web con l'IA</h1>
        <p className="lead">
          L'intelligenza artificiale sta rivoluzionando il modo in cui
          costruiamo applicazioni web, automatizzando compiti e offrendo nuove
          possibilità creative.
        </p>
        <p>
          Dalla generazione di codice alla creazione di interfacce utente
          dinamiche, gli strumenti basati sull'IA stanno diventando
          indispensabili per gli sviluppatori moderni. Questi strumenti non solo
          accelerano il processo di sviluppo, ma migliorano anche la qualità del
          codice e l'accessibilità delle applicazioni.
        </p>
        <h2>Principali Vantaggi</h2>
        <ul>
          <li>
            <strong>Automazione:</strong> Riduzione del tempo speso su task
            ripetitivi.
          </li>
          <li>
            <strong>Qualità del Codice:</strong> Suggerimenti e refactoring
            automatici.
          </li>
          <li>
            <strong>Accessibilità:</strong> Analisi e correzioni automatiche per
            rendere i siti più inclusivi.
          </li>
        </ul>
        <blockquote>
          "L'IA non sostituirà gli sviluppatori, ma gli sviluppatori che usano
          l'IA sostituiranno quelli che non lo fanno." - Autore Sconosciuto
        </blockquote>
        <p>
          Per saperne di più, puoi consultare la{" "}
          <a href="#">documentazione ufficiale</a> o unirti alla nostra{" "}
          <a href="#">community online</a>.
        </p>
        <pre>
          <code>
            {`function helloWorld() {
  console.log("Hello, AI-powered world!");
}`}
          </code>
        </pre>
        <p>
          In conclusione, l'integrazione dell'IA nel workflow di sviluppo non è
          più una possibilità remota, ma una realtà tangibile che sta definendo
          il futuro del web.
        </p>
      </Article>
    </Card>
  );
};

export default ExampleArticle;
