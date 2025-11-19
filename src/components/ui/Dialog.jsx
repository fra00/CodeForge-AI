import React, { useState, useRef, useEffect, useCallback } from "react";
import Card from "./Card";
import "./Dialog.css";

const MIN_WIDTH = 300;
const MIN_HEIGHT = 200;

const clamp = (value, min, max) => Math.max(min, Math.min(value, max));

const Dialog = ({
  isOpen,
  onClose,
  title,
  children,
  footer,
  initialWidth = 500,
  initialHeight = 300,
  initialX,
  initialY,
}) => {
  // Calcola dimensioni viewport
  const getViewport = () => ({
    width: window.innerWidth,
    height: window.innerHeight,
  });

  // Calcola posizione iniziale centrata e limitata
  const getInitialPosition = () => {
    const { width, height } = getViewport();
    const x =
      initialX !== undefined
        ? clamp(initialX, 0, width - initialWidth)
        : clamp(width / 2 - initialWidth / 2, 0, width - initialWidth);
    const y =
      initialY !== undefined
        ? clamp(initialY, 0, height - initialHeight)
        : clamp(height / 2 - initialHeight / 2, 0, height - initialHeight);
    return { x, y };
  };

  const [position, setPosition] = useState(getInitialPosition());
  const [size, setSize] = useState({
    width: initialWidth,
    height: initialHeight,
  });
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);

  const dialogRef = useRef(null);
  const dragOffset = useRef({ x: 0, y: 0 });

  // Aggiorna posizione se viewport cambia
  useEffect(() => {
    if (!isOpen) return;
    const handleResize = () => {
      setPosition((pos) => {
        const { width, height } = getViewport();
        return {
          x: clamp(pos.x, 0, width - size.width),
          y: clamp(pos.y, 0, height - size.height),
        };
      });
      setSize((s) => {
        const { width, height } = getViewport();
        return {
          width: clamp(s.width, MIN_WIDTH, width),
          height: clamp(s.height, MIN_HEIGHT, height),
        };
      });
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [isOpen, size.width, size.height]);

  const handleMouseDownDrag = (e) => {
    if (e.target.classList.contains("dialog-header-draggable-area")) {
      setIsDragging(true);
      dragOffset.current = {
        x: e.clientX - position.x,
        y: e.clientY - position.y,
      };
      e.preventDefault();
    }
  };

  const handleMouseDownResize = (e) => {
    setIsResizing(true);
    e.preventDefault();
  };

  const handleMouseMove = useCallback(
    (e) => {
      const { width, height } = getViewport();
      if (isDragging) {
        const newX = clamp(
          e.clientX - dragOffset.current.x,
          0,
          width - size.width
        );
        const newY = clamp(
          e.clientY - dragOffset.current.y,
          0,
          height - size.height
        );
        setPosition({ x: newX, y: newY });
      }
      if (isResizing) {
        setSize((prevSize) => {
          const newWidth = clamp(
            prevSize.width + e.movementX,
            MIN_WIDTH,
            width - position.x
          );
          const newHeight = clamp(
            prevSize.height + e.movementY,
            MIN_HEIGHT,
            height - position.y
          );
          return { width: newWidth, height: newHeight };
        });
      }
    },
    [isDragging, isResizing, size.width, size.height, position.x, position.y]
  );

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
    setIsResizing(false);
  }, []);

  useEffect(() => {
    if (isDragging || isResizing) {
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
    } else {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    }
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isDragging, isResizing, handleMouseMove, handleMouseUp]);

  useEffect(() => {
    if (isOpen) {
      setPosition(getInitialPosition());
      setSize({ width: initialWidth, height: initialHeight });
    }
    // eslint-disable-next-line
  }, [isOpen, initialWidth, initialHeight, initialX, initialY]);

  if (!isOpen) {
    return null;
  }

  return (
    <div
      ref={dialogRef}
      className="dialog-window"
      style={{
        position: "fixed",
        left: 0,
        top: 0,
        transform: `translate(${position.x}px, ${position.y}px)`,
        width: `${size.width}px`,
        height: `${size.height}px`,
        zIndex: 9999,
      }}
    >
      <Card className="dialog-card">
        <div
          className="dialog-header dialog-header-draggable-area"
          onMouseDown={handleMouseDownDrag}
        >
          <h3 className="dialog-title">{title}</h3>
          {onClose && (
            <button
              onClick={onClose}
              className="dialog-close-button"
              aria-label="Close"
            >
              &times;
            </button>
          )}
        </div>
        <div className="dialog-body">{children}</div>
        {footer && <div className="dialog-footer">{footer}</div>}
        <div
          className="dialog-resize-handle"
          onMouseDown={handleMouseDownResize}
        ></div>
      </Card>
    </div>
  );
};

export default Dialog;
