import React from 'react';
import useEditorStore from '../../store/useEditorStore';

const PropertyEditor = () => {
  const { selectedComponentId, components, updateComponentProps } = useEditorStore();

  const selectedComponent = components.find(c => c.id === selectedComponentId);

  if (!selectedComponent) {
    return (
      <div className="property-editor p-4 border-l border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-semibold mb-4">Properties</h3>
        <p className="text-gray-500">Select a component to see its properties.</p>
      </div>
    );
  }

  const handlePropChange = (propName, value) => {
    updateComponentProps(selectedComponentId, { [propName]: value });
  };

  return (
    <div className="property-editor p-4 border-l border-gray-200 dark:border-gray-700">
      <h3 className="text-lg font-semibold mb-4">Properties for {selectedComponent.type}</h3>
      <div>
        {Object.entries(selectedComponent.props).map(([key, value]) => (
          <div key={key} className="mb-4">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {key}
            </label>
            <input
              type="text"
              value={value}
              onChange={(e) => handlePropChange(key, e.target.value)}
              className="w-full p-2 border rounded-md bg-gray-50 dark:bg-gray-700 dark:border-gray-600"
            />
          </div>
        ))}
      </div>
    </div>
  );
};

export default PropertyEditor;
