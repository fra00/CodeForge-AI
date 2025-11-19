import React from 'react';
import { useEditorStore } from '../../store/useEditorStore';
import Box from '../../components/ui/Box';
import List from '../../components/ui/List';
import ListItem from '../../components/ui/ListItem';
import ToggleSwitch from '../../components/ui/ToggleSwitch';
import { Eye, EyeOff } from 'lucide-react';

const LayerPanel = () => {
  const layers = useEditorStore((state) => state.layers);
  const updateLayer = useEditorStore((state) => state.updateLayer);

  const handleToggleVisibility = (layerId, isVisible) => {
    updateLayer(layerId, { visible: isVisible });
  };

  // Layers are displayed in reverse order (top layer first)
  const reversedLayers = [...layers].reverse();

  return (
    <Box className="w-64 bg-gray-100 dark:bg-gray-800 p-4 border-l border-gray-300 dark:border-gray-700 flex flex-col h-full">
      <h3 className="text-lg font-semibold mb-3">Livelli ({layers.length})</h3>
      
      <List className="flex-grow overflow-y-auto space-y-1">
        {reversedLayers.map((layer) => (
          <ListItem 
            key={layer.id} 
            className="flex justify-between items-center p-2 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700"
          >
            <span className="truncate text-sm">
              {layer.name} ({layer.type})
            </span>
            <ToggleSwitch
              id={`toggle-${layer.id}`}
              checked={layer.visible}
              onChange={(e) => handleToggleVisibility(layer.id, e.target.checked)}
              label={layer.visible ? <Eye size={16} /> : <EyeOff size={16} />}
              // Disable toggling background visibility for simplicity
              disabled={layer.type === 'background'}
            />
          </ListItem>
        ))}
      </List>
    </Box>
  );
};

export default LayerPanel;