import React, { useState, useRef, useEffect, useCallback } from 'react';
import PropTypes from 'prop-types';
import { useFileStore } from '../../stores/useFileStore';
import { buildPreviewHTML } from '../../utils/previewBuilder';
import { PreviewToolbar } from './PreviewToolbar';
import { ConsolePanel } from './Console';

const viewportSizes = {
  mobile: { width: 375, height: '100%', label: 'iPhone SE' },
  tablet: { width: 768, height: '100%', label: 'iPad' },
  desktop: { width: '100%', height: '100%', label: 'Desktop' },
  full: { width: '100%', height: '100%', label: 'Full' },
};

/**
 * Componente principale per la Live Preview.
 * Gestisce il rendering dell'iframe, l'auto-refresh e la console.
 */
export function LivePreview({ className = '' }) {
  const { files, rootId } = useFileStore();
  const [logs, setLogs] = useState([]);
  const [viewport, setViewport] = useState('desktop');
  const iframeRef = useRef(null);
  const currentViewport = viewportSizes[viewport];

  const handleClearConsole = useCallback(() => {
    setLogs([]);
  }, []);

  const updateIframe = useCallback(() => {
    const htmlContent = buildPreviewHTML(files, rootId);
    const iframe = iframeRef.current;
    if (iframe) {
      iframe.srcdoc = htmlContent;
    }
  }, [files, rootId]);

  // Auto-refresh quando i file cambiano
  useEffect(() => {
    updateIframe();
  }, [files, updateIframe]);

  // Listener per i messaggi dalla console dell'iframe
  useEffect(() => {
    const handleMessage = (event) => {
      // Ignora messaggi da altre origini
      if (event.source !== iframeRef.current?.contentWindow) return;

      const { type, data } = event.data;
      if (['log', 'error', 'warn'].includes(type)) {
        setLogs(prevLogs => [...prevLogs, { type, data, timestamp: new Date().toISOString() }]);
      }
    };

    window.addEventListener('message', handleMessage);
    return () => {
      window.removeEventListener('message', handleMessage);
    };
  }, []);

  return (
    <div className={`flex flex-col h-full w-full bg-editor-bg ${className}`}>
      <PreviewToolbar
        onRefresh={updateIframe}
        onViewportChange={setViewport}
        currentViewport={viewport}
      />
      
      <div className="flex-1 flex items-center overflow-hidden">
        <iframe
          ref={iframeRef}
          title="Live Preview"
          sandbox="allow-scripts allow-same-origin" // allow-same-origin è necessario per postMessage
          className="bg-white border border-editor-border transition-all duration-300"
          style={{
            width: currentViewport.width,
            height: currentViewport.height,
            maxWidth: viewport === 'full' ? '100%' : currentViewport.width,
            maxHeight: viewport === 'full' ? '100%' : currentViewport.height,
          }}
        />
      </div>

      <ConsolePanel logs={logs} onClear={handleClearConsole} />
    </div>
  );
}

LivePreview.propTypes = {
  className: PropTypes.string,
};