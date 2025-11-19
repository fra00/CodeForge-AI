import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { dark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import PropTypes from "prop-types";
import "./CodeBlock.css";

/**
 * Un componente per visualizzare blocchi di codice formattati con evidenziazione della sintassi.
 * Utilizza react-syntax-highlighter.
 */
const CodeBlock = ({ code, language, className = "" }) => {
  if (typeof code !== 'string') {
    console.error("CodeBlock received non-string code prop:", code);
    return null;
  }

  const classNames = ["code-block", className].filter(Boolean).join(" ");

  return (
    <div className={classNames}>
      <SyntaxHighlighter
        children={code.trim()}
        style={dark} // Tema scuro per l'editor
        language={language || 'text'}
        PreTag="pre"
        CodeTag="code"
        className="syntax-highlighter-code" // Classe per eventuali stili aggiuntivi
      />
    </div>
  );
};

CodeBlock.propTypes = {
  /**
   * La stringa di codice da visualizzare.
   */
  code: PropTypes.string.isRequired,
  /**
   * Il linguaggio di programmazione per l'highlighting.
   */
  language: PropTypes.string,
  /**
   * Classi CSS aggiuntive da applicare al contenitore.
   */
  className: PropTypes.string,
};

export default CodeBlock;
