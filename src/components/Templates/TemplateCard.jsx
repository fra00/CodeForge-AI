import React from 'react';
import PropTypes from 'prop-types';
import { Play, FileText } from 'lucide-react';

/**
 * Componente per visualizzare una singola card di template.
 */
export function TemplateCard({ template, onSelect }) {
  return (
    <div
      className="bg-editor-darker border border-editor-border rounded-lg p-4 flex flex-col justify-between hover:shadow-lg hover:border-blue-600 transition-all duration-200 cursor-pointer"
      onClick={() => onSelect(template.id)}
    >
      <div>
        <div className="flex items-center mb-2">
          <span className="text-2xl mr-2">{template.icon}</span>
          <h3 className="text-lg font-semibold text-white">{template.name}</h3>
        </div>
        <p className="text-sm text-editor-border mb-3">{template.description}</p>
        <div className="flex flex-wrap gap-1 mb-3">
          {template.tags.map(tag => (
            <span key={tag} className="text-xs bg-editor-highlight text-white px-2 py-0.5 rounded-full">
              {tag}
            </span>
          ))}
        </div>
        
        {/* File Preview (Placeholder) */}
        <div className="text-xs text-editor-border mt-2">
          <p className="font-semibold mb-1">Files:</p>
          <div className="flex flex-wrap gap-x-3 gap-y-1">
            {Object.values(template.files).slice(0, 4).map(file => (
              <span key={file.name} className="flex items-center">
                <FileText size={12} className="mr-1" />
                {file.name}
              </span>
            ))}
            {Object.values(template.files).length > 4 && <span>...</span>}
          </div>
        </div>
      </div>
      <div className="flex justify-end items-center mt-3">
        <button
          className="flex items-center px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors duration-150"
        >
          <Play size={16} className="mr-1" />
          Carica Progetto
        </button>
      </div>
    </div>
  );
}

TemplateCard.propTypes = {
  template: PropTypes.shape({
    id: PropTypes.string.isRequired,
    name: PropTypes.string.isRequired,
    description: PropTypes.string.isRequired,
    icon: PropTypes.string.isRequired,
    tags: PropTypes.arrayOf(PropTypes.string).isRequired,
    files: PropTypes.object.isRequired,
  }).isRequired,
  onSelect: PropTypes.func.isRequired,
};