import React, { useRef, useState } from 'react';
import { useEditorStore } from '../../store/useEditorStore';
import Box from '../../components/ui/Box';
import Button from '../../components/ui/Button';
import { Plus } from 'lucide-react';

const LayerRenderer = ({ layer }) => {
  if (!layer.visible) return null;

  const style = {
    position: 'absolute',
    left: layer.x,
    top: layer.y,
    width: layer.width,
    height: layer.height,
    backgroundColor: layer.color,
    opacity: layer.opacity || 1,
    zIndex: layer.zIndex || 1,
    cursor: 'move',
  };

  switch (layer.type) {
    case 'background':
      return (
        <Box 
          className="absolute top-0 left-0" 
          style={{ ...style, width: '100%', height: '100%', zIndex: 0 }} 
        />
      );
    case 'shape':
      return (
        <Box 
          className="border border-dashed border-gray-500" 
          style={style} 
          title={layer.name}
        />
      );
    case 'line':
      // Simplified line rendering using a div rotated/stretched between two points
      // This is a complex geometric calculation, simplified here for demonstration
      const lineStyle = {
        position: 'absolute',
        left: layer.x,
        top: layer.y,
        width: Math.sqrt(Math.pow(layer.x2 - layer.x, 2) + Math.pow(layer.y2 - layer.y, 2)),
        height: layer.width, // thickness
        backgroundColor: layer.color,
        transformOrigin: '0 0',
        transform: `rotate(${Math.atan2(layer.y2 - layer.y, layer.x2 - layer.x)}rad)`,
        zIndex: layer.zIndex || 1,
      };
      return <Box style={lineStyle} title={layer.name} />;
    default:
      return null;
  }
};

const EditorCanvas = () => {
  const canvasRef = useRef(null);
  const { layers, canvasSize, activeTool, addLayer, applyFill, applyLine } = useEditorStore();
  const [isDrawing, setIsDrawing] = useState(false);
  const [startPoint, setStartPoint] = useState(null);

  const getRelativeCoordinates = (e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  };

  const handleCanvasClick = (e) => {
    const { x, y } = getRelativeCoordinates(e);

    if (activeTool === 'Fill') {
      // Secchiello: Apply fill to background (using a fixed color for simplicity)
      applyFill('#f0f0f0');
    } else if (activeTool === 'Line') {
      if (!isDrawing) {
        // Start drawing
        setIsDrawing(true);
        setStartPoint({ x, y });
      } else {
        // Finish drawing
        applyLine(startPoint.x, startPoint.y, x, y, '#0000ff');
        setIsDrawing(false);
        setStartPoint(null);
      }
    } else if (activeTool === 'Select') {
      // Add a new shape layer on click (for testing layer management)
      addLayer({
        type: 'shape',
        name: `Shape ${layers.length}`,
        color: `#${Math.floor(Math.random()*16777215).toString(16)}`,
        x: x - 50,
        y: y - 50,
        width: 100,
        height: 100,
      });
    }
    // Crop tool logic is handled separately (e.g., via a dedicated form/modal)
  };

  return (
    <Box className="flex-grow flex justify-center items-center p-4 overflow-auto">
      <Box
        ref={canvasRef}
        className="relative shadow-xl border border-gray-400 dark:border-gray-600 cursor-crosshair"
        style={{ width: canvasSize.width, height: canvasSize.height }}
        onClick={handleCanvasClick}
      >
        {layers.map((layer) => (
          <LayerRenderer key={layer.id} layer={layer} />
        ))}
        
        {/* Visual feedback for Line tool drawing */}
        {isDrawing && startPoint && (
          <Box 
            className="absolute border border-dashed border-blue-500 pointer-events-none"
            style={{ left: startPoint.x - 5, top: startPoint.y - 5, width: 10, height: 10 }}
          />
        )}
      </Box>
      
      {/* Debug/Action button for Crop (since it's complex to implement interactively) */}
      {activeTool === 'Crop' && (
        <Box className="absolute bottom-4">
          <Button onClick={() => useEditorStore.getState().applyCrop(400, 200)}>
            <Plus size={16} /> Applica Ritaglia (400x200)
          </Button>
        </Box>
      )}
    </Box>
  );
};

export default EditorCanvas;