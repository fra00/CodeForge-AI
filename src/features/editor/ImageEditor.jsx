import React from 'react';
import Box from '../../components/ui/Box';
import ToolPanel from './ToolPanel';
import EditorCanvas from './EditorCanvas';
import LayerPanel from './LayerPanel';

const ImageEditor = () => {
  return (
    <Box className="flex flex-row h-[calc(100vh-64px)]">
      {/* Left Panel: Tools */}
      <ToolPanel />

      {/* Center: Canvas Area */}
      <EditorCanvas />

      {/* Right Panel: Layers */}
      <LayerPanel />
    </Box>
  );
};

export default ImageEditor;