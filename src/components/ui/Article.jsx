import React from "react";
import PropTypes from "prop-types";
import "./Article.css";

/**
 * Un componente wrapper per contenuti di testo estesi, come post di blog o documentazione.
 * Utilizza le classi `prose` del plugin `@tailwindcss/typography` per una formattazione
 * tipografica di alta qualità e reattiva ai temi.
 *
 * @example
 * <Article>
 *   <h1>Titolo dell'Articolo</h1>
 *   <p>Questo è un paragrafo di introduzione. Il componente Article si occupa
 *   di applicare uno stile leggibile e consistente a tutto il contenuto.</p>
 *   <h2>Sottotitolo</h2>
 *   <ul>
 *     <li>Elemento di lista 1</li>
 *     <li>Elemento di lista 2</li>
 *   </ul>
 *   <p>Per maggiori informazioni, visita il <a href="#">nostro sito</a>.</p>
 * </Article>
 */
const Article = ({ children, className = "", ...rest }) => {
  // `prose` applica gli stili tipografici.
  // `dark:prose-invert` inverte i colori per il tema scuro.
  // `max-w-none` rimuove la larghezza massima di default di `prose`,
  // permettendoci di controllarla nel nostro file CSS.
  const classNames = [
    "article",
    "prose",
    "dark:prose-invert",
    "max-w-none",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <article className={classNames} {...rest}>
      {children}
    </article>
  );
};

Article.propTypes = {
  children: PropTypes.node.isRequired,
  className: PropTypes.string,
};

export default Article;
