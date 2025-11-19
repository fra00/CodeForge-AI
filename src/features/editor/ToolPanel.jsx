import React from 'react';
import { useEditorStore } from '../../store/useEditorStore';
import Button from '../../components/ui/Button';
import Box from '../../components/ui/Box';
import { MousePointer, PaintBucket, Minus, Crop, Undo, Redo } from 'lucide-react';

const tools = [
  { name: 'Select', icon: MousePointer, description: 'Seleziona e sposta livelli' },
  { name: 'Fill', icon: PaintBucket, description: 'Secchiello (riempie lo sfondo)' },
  { name: 'Line', icon: Minus, description: 'Disegna una linea' },
  { name: 'Crop', icon: Crop, description: 'Ritaglia l\'area di lavoro' },
];

const ToolPanel = () => {
  const { activeTool, setActiveTool, undo, redo, historyIndex, history } = useEditorStore();
  
  const canUndo = historyIndex > 0;
  const canRedo = historyIndex < history.length - 1;

  return (
    <Box className="flex flex-col w-16 bg-gray-100 dark:bg-gray-800 p-2 space-y-4 border-r border-gray-300 dark:border-gray-700 h-full">
      
      {/* Undo / Redo Controls */}
      <Box className="flex flex-col space-y-1">
        <Button 
          size="small" 
          variant="secondary" 
          onClick={undo} 
          disabled={!canUndo}
          title="Annulla (Undo)"
        >
          <Undo size={18} />
        </Button>
        <Button 
          size="small" 
          variant="secondary" 
          onClick={redo} 
          disabled={!canRedo}
          title="Ripeti (Redo)"
        >
          <Redo size={18} />
        </Button>
      </Box>

      <Box className="border-t border-gray-300 dark:border-gray-700 pt-4 space-y-1">
        {/* Tool Selection */}
        {tools.map((tool) => (
          <Button
            key={tool.name}
            size="small"
            variant={activeTool === tool.name ? 'primary' : 'ghost'}
            onClick={() => setActiveTool(tool.name)}
            title={tool.description}
          >
            <tool.icon size={18} />
          </Button>
        ))}
      </Box>
    </Box>
  );
};

export default ToolPanel;