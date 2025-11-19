import React from 'react';
import PropTypes from 'prop-types';
import { Copy, Trash2 } from 'lucide-react';
import { useSnippetStore } from '../../stores/useSnippetStore';

/**
 * Componente per visualizzare un singolo snippet di codice.
 */
export function SnippetCard({ snippet, onInsert }) {
  const deleteSnippet = useSnippetStore(state => state.deleteSnippet);

  const handleDelete = (e) => {
    e.stopPropagation();
    if (window.confirm(`Sei sicuro di voler eliminare lo snippet "${snippet.title}"?`)) {
      deleteSnippet(snippet.id);
    }
  };

  return (
    <div className="bg-editor-darker border border-editor-border rounded-lg p-4 flex flex-col justify-between hover:shadow-lg transition-shadow duration-200">
      <div>
        <h3 className="text-lg font-semibold text-white mb-1">{snippet.title}</h3>
        <p className="text-sm text-editor-border mb-2">{snippet.description}</p>
        <div className="flex flex-wrap gap-1 mb-3">
          {snippet.tags.map(tag => (
            <span key={tag} className="text-xs bg-editor-highlight text-white px-2 py-0.5 rounded-full">
              {tag}
            </span>
          ))}
        </div>
        <pre className="bg-editor-bg p-2 rounded text-xs overflow-x-auto max-h-24">
          <code className={`language-${snippet.language}`}>{snippet.code}</code>
        </pre>
      </div>
      <div className="flex justify-between items-center mt-3">
        <span className="text-xs text-blue-400 font-mono">{snippet.language.toUpperCase()}</span>
        <div className="flex space-x-2">
          <button
            onClick={() => onInsert(snippet.code)}
            className="p-1 rounded-full text-green-400 hover:bg-editor-highlight"
            title="Inserisci nell'Editor"
          >
            <Copy size={16} />
          </button>
          {snippet.isCustom && (
            <button
              onClick={handleDelete}
              className="p-1 rounded-full text-red-400 hover:bg-editor-highlight"
              title="Elimina Snippet"
            >
              <Trash2 size={16} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

SnippetCard.propTypes = {
  snippet: PropTypes.shape({
    id: PropTypes.string.isRequired,
    title: PropTypes.string.isRequired,
    description: PropTypes.string,
    language: PropTypes.string.isRequired,
    tags: PropTypes.arrayOf(PropTypes.string).isRequired,
    code: PropTypes.string.isRequired,
    isCustom: PropTypes.bool,
  }).isRequired,
  onInsert: PropTypes.func.isRequired,
};