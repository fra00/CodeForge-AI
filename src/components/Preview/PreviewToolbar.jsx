import React from "react";
import PropTypes from "prop-types";
import {
  RefreshCw,
  Monitor,
  Tablet,
  Smartphone,
  ExternalLink,
} from "lucide-react";
import Button from "../ui/Button";
import Select from "../ui/Select";

/**
 * Toolbar per la Live Preview.
 */
export function PreviewToolbar({
  onRefresh,
  onViewportChange,
  currentViewport,
  srcDoc,
}) {
  const handleOpenInNewWindow = () => {
    const newWindow = window.open("", "LivePreview", "width=800,height=600,resizable=yes,scrollbars=yes");
    if (newWindow) {
      newWindow.document.write(srcDoc);
      newWindow.document.close();
    }
  };

  const viewportOptions = [
    { value: "desktop", label: "Desktop" },
    { value: "tablet", label: "Tablet" },
    { value: "mobile", label: "Mobile" },
    { value: "full", label: "Full" },
  ];

  const getViewportIcon = (viewport) => {
    switch (viewport) {
      case "tablet":
        return <Tablet size={16} />;
      case "mobile":
        return <Smartphone size={16} />;
      case "desktop":
      case "full":
      default:
        return <Monitor size={16} />;
    }
  };

  return (
    <div className="flex justify-between items-center h-10 px-2 border-b border-editor-border bg-editor-darker text-editor-border">
      <span className="text-sm font-semibold text-white">LIVE PREVIEW</span>
      <div className="flex space-x-2 items-center">
        {/* Viewport Selector */}
        <Select
          id="viewport-select"
          options={viewportOptions}
          value={currentViewport}
          onChange={(e) => onViewportChange(e.target.value)}
          className="w-28 text-xs h-7"
        />

        {/* Refresh Button */}
        <Button
          onClick={onRefresh}
          variant="ghost"
          size="small"
          title="Ricarica Preview"
          className="p-1"
        >
          <RefreshCw size={16} />
        </Button>

        {/* Open in New Window (Placeholder) */}
        <Button
          onClick={handleOpenInNewWindow}
          variant="ghost"
          size="small"
          title="Apri in Nuova Finestra"
          className="p-1"
        >
          <ExternalLink size={16} />
        </Button>
      </div>
    </div>
  );
}

PreviewToolbar.propTypes = {
  onRefresh: PropTypes.func.isRequired,
  onViewportChange: PropTypes.func.isRequired,
  currentViewport: PropTypes.oneOf(["desktop", "tablet", "mobile", "full"])
    .isRequired,
  srcDoc: PropTypes.string.isRequired,
};
