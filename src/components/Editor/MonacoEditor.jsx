import React, { useRef, useEffect } from 'react';
import Editor from '@monaco-editor/react';
import PropTypes from 'prop-types';
import { useSettingsStore } from '../../stores/useSettingsStore';

/**
 * Componente wrapper per Monaco Editor.
 * Gestisce la sincronizzazione del contenuto e le opzioni dell'editor.
 */
export function MonacoEditor({ file, onContentChange }) {
  const editorRef = useRef(null);
  const { fontSize, tabSize, wordWrap, minimapEnabled, theme } = useSettingsStore();

  // Opzioni di Monaco Editor basate sullo store delle impostazioni
  const options = {
    fontSize,
    tabSize,
    wordWrap,
    minimap: { enabled: minimapEnabled },
    scrollBeyondLastLine: false,
    automaticLayout: true, // Importante per il resize
    // Disabilita il salvataggio automatico di Monaco, gestiamo noi l'autosave
    automaticSave: false,
  };

  /**
   * Gestisce l'inizializzazione dell'editor.
   * @param {object} editor - L'istanza dell'editor.
   * @param {object} monaco - L'istanza di monaco.
   */
  function handleEditorDidMount(editor, monaco) {
    editorRef.current = editor;

    // Registra un comando per il salvataggio (Ctrl+S / Cmd+S)
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
      // L'autosave gestisce il salvataggio, qui potremmo aggiungere un feedback visivo
      console.log('Save command triggered (Ctrl+S)');
    });

    // Definisce il tema custom "codeforge-dark"
    monaco.editor.defineTheme('codeforge-dark', {
      base: 'vs-dark',
      inherit: true,
      rules: [],
      colors: {
        // Usa i colori definiti in tailwind.config.js per l'integrazione
        'editor.background': '#1e1e1e',
        'editor.lineHighlightBackground': '#2d2d30',
        'editorLineNumber.foreground': '#6a6a6a',
        'editor.selectionBackground': '#3a3d41',
      },
    });
  }

  // Effetto per aggiornare il tema di Monaco quando cambia lo store
  useEffect(() => {
    if (editorRef.current) {
      // Monaco usa 'vs-dark' o 'vs-light' come base, ma noi usiamo il nostro tema custom
      const monacoTheme = theme === 'dark' ? 'codeforge-dark' : 'vs-light';
      monaco.editor.setTheme(monacoTheme);
    }
  }, [theme]);

  // Effetto per aggiornare il modello (contenuto, lingua) quando il file cambia
  useEffect(() => {
    if (editorRef.current && file) {
      const model = editorRef.current.getModel();
      if (model) {
        // Aggiorna la lingua se necessario
        if (model.getLanguageId() !== file.language) {
          monaco.editor.setModelLanguage(model, file.language);
        }
        
        // Aggiorna il contenuto solo se è diverso per evitare loop
        if (model.getValue() !== file.content) {
            model.setValue(file.content);
        }
      }
    }
  }, [file]);

  if (!file) {
    return (
      <div className="flex items-center justify-center h-full text-editor-border">
        Seleziona un file per iniziare a modificare.
      </div>
    );
  }

  return (
    <Editor
      height="100%"
      language={file.language}
      value={file.content}
      options={options}
      theme={theme === 'dark' ? 'codeforge-dark' : 'vs-light'}
      onMount={handleEditorDidMount}
      onChange={onContentChange}
    />
  );
}

MonacoEditor.propTypes = {
  file: PropTypes.shape({
    id: PropTypes.string.isRequired,
    name: PropTypes.string.isRequired,
    content: PropTypes.string.isRequired,
    language: PropTypes.string.isRequired,
  }),
  onContentChange: PropTypes.func.isRequired,
};