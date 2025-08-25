import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';

interface AssetLibraryPopupProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

const AssetLibraryPopup: React.FC<AssetLibraryPopupProps> = ({
  isOpen,
  onClose,
  title,
  children
}) => {
  const [position, setPosition] = useState({ x: 100, y: 100 });
  const [size, setSize] = useState({ width: 800, height: 600 });
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [resizeHandle, setResizeHandle] = useState<string>('');
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [resizeStart, setResizeStart] = useState({ x: 0, y: 0, width: 0, height: 0, posX: 0, posY: 0 });
  const popupRef = useRef<HTMLDivElement>(null);

  // Handle ESC key
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen) {
        event.preventDefault();
        event.stopPropagation();
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown, true);
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown, true);
    };
  }, [isOpen, onClose]);

  // Handle dragging
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget || (e.target as HTMLElement).classList.contains('drag-handle')) {
      setIsDragging(true);
      setDragStart({
        x: e.clientX - position.x,
        y: e.clientY - position.y
      });
    }
  };

  // Handle resizing
  const handleResizeStart = (e: React.MouseEvent, handle: string) => {
    e.preventDefault();
    e.stopPropagation();
    setIsResizing(true);
    setResizeHandle(handle);
    setResizeStart({
      x: e.clientX,
      y: e.clientY,
      width: size.width,
      height: size.height,
      posX: position.x,
      posY: position.y
    });
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging) {
        const newX = Math.max(0, Math.min(window.innerWidth - size.width, e.clientX - dragStart.x));
        const newY = Math.max(0, Math.min(window.innerHeight - size.height, e.clientY - dragStart.y));
        setPosition({ x: newX, y: newY });
      }
      
      if (isResizing && resizeHandle) {
        const deltaX = e.clientX - resizeStart.x;
        const deltaY = e.clientY - resizeStart.y;
        
        let newWidth = resizeStart.width;
        let newHeight = resizeStart.height;
        let newX = resizeStart.posX;
        let newY = resizeStart.posY;
        
        const minSize = 400;
        const padding = 20;
        
        // Handle different resize directions with proper constraints
        if (resizeHandle.includes('right')) {
          newWidth = Math.max(minSize, Math.min(window.innerWidth - newX - padding, resizeStart.width + deltaX));
        }
        if (resizeHandle.includes('left')) {
          const maxWidthIncrease = resizeStart.posX; // Can't move left beyond screen edge
          const deltaWidth = -deltaX; // Negative delta increases width when moving left
          newWidth = Math.max(minSize, Math.min(resizeStart.width + maxWidthIncrease, resizeStart.width + deltaWidth));
          newX = Math.max(0, resizeStart.posX - Math.max(0, newWidth - resizeStart.width));
        }
        if (resizeHandle.includes('bottom')) {
          newHeight = Math.max(minSize, Math.min(window.innerHeight - newY - padding, resizeStart.height + deltaY));
        }
        if (resizeHandle.includes('top')) {
          const maxHeightIncrease = resizeStart.posY; // Can't move up beyond screen edge  
          const deltaHeight = -deltaY; // Negative delta increases height when moving up
          newHeight = Math.max(minSize, Math.min(resizeStart.height + maxHeightIncrease, resizeStart.height + deltaHeight));
          newY = Math.max(0, resizeStart.posY - Math.max(0, newHeight - resizeStart.height));
        }
        
        // Ensure window doesn't go beyond screen boundaries
        newX = Math.max(0, Math.min(window.innerWidth - newWidth, newX));
        newY = Math.max(0, Math.min(window.innerHeight - newHeight, newY));
        
        setSize({ width: newWidth, height: newHeight });
        setPosition({ x: newX, y: newY });
      }
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      setIsResizing(false);
      setResizeHandle('');
    };

    if (isDragging || isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, isResizing, dragStart, resizeStart, resizeHandle, position, size]);

  if (!isOpen) return null;

  return createPortal(
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        ref={popupRef}
        style={{
          position: 'fixed',
          left: position.x,
          top: position.y,
          width: size.width,
          height: size.height,
          backgroundColor: '#1F2937',
          borderRadius: '12px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          border: '1px solid #374151',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          cursor: isDragging ? 'grabbing' : 'default',
          minWidth: '400px',
          minHeight: '400px'
        }}
      >
        {/* Header */}
        <div
          className="drag-handle"
          style={{
            padding: '16px 20px',
            backgroundColor: '#111827',
            borderBottom: '1px solid #374151',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            cursor: 'grab',
            userSelect: 'none'
          }}
          onMouseDown={handleMouseDown}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '8px',
              height: '8px',
              backgroundColor: '#EF4444',
              borderRadius: '50%'
            }}></div>
            <div style={{
              width: '8px',
              height: '8px',
              backgroundColor: '#F59E0B',
              borderRadius: '50%'
            }}></div>
            <div style={{
              width: '8px',
              height: '8px',
              backgroundColor: '#10B981',
              borderRadius: '50%'
            }}></div>
            <h3 style={{
              fontSize: '18px',
              fontWeight: 'bold',
              color: 'white',
              margin: '0',
              marginLeft: '12px'
            }}>
              {title}
            </h3>
          </div>

          <button
            onClick={onClose}
            style={{
              padding: '6px',
              backgroundColor: 'transparent',
              border: 'none',
              borderRadius: '6px',
              color: '#9CA3AF',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.2s'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#374151';
              e.currentTarget.style.color = 'white';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
              e.currentTarget.style.color = '#9CA3AF';
            }}
          >
            <svg style={{ width: '18px', height: '18px' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div style={{
          flex: '1',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column'
        }}>
          {children}
        </div>

        {/* Instructions Footer */}
        <div style={{
          padding: '12px 20px',
          backgroundColor: '#111827',
          borderTop: '1px solid #374151',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          fontSize: '12px',
          color: '#9CA3AF'
        }}>
          <div style={{ color: '#3B82F6', fontSize: '14px' }}>💡</div>
          <span>Drag from header to move • Click outside or press ESC to close • Click any asset to add to canvas • Drag edges to resize</span>
        </div>

        {/* Resize Handles */}
        {/* Right */}
        <div
          onMouseDown={(e) => handleResizeStart(e, 'right')}
          style={{
            position: 'absolute',
            right: 0,
            top: '20px',
            bottom: '20px',
            width: '4px',
            cursor: 'ew-resize',
            backgroundColor: 'transparent'
          }}
        />
        
        {/* Bottom */}
        <div
          onMouseDown={(e) => handleResizeStart(e, 'bottom')}
          style={{
            position: 'absolute',
            bottom: 0,
            left: '20px',
            right: '20px',
            height: '4px',
            cursor: 'ns-resize',
            backgroundColor: 'transparent'
          }}
        />
        
        {/* Bottom Right Corner */}
        <div
          onMouseDown={(e) => handleResizeStart(e, 'bottom-right')}
          style={{
            position: 'absolute',
            bottom: 0,
            right: 0,
            width: '20px',
            height: '20px',
            cursor: 'nw-resize',
            backgroundColor: 'transparent'
          }}
        />
        
        {/* Left */}
        <div
          onMouseDown={(e) => handleResizeStart(e, 'left')}
          style={{
            position: 'absolute',
            left: 0,
            top: '20px',
            bottom: '20px',
            width: '4px',
            cursor: 'ew-resize',
            backgroundColor: 'transparent'
          }}
        />
        
        {/* Top */}
        <div
          onMouseDown={(e) => handleResizeStart(e, 'top')}
          style={{
            position: 'absolute',
            top: 0,
            left: '20px',
            right: '20px',
            height: '4px',
            cursor: 'ns-resize',
            backgroundColor: 'transparent'
          }}
        />
        
        {/* Top Left Corner */}
        <div
          onMouseDown={(e) => handleResizeStart(e, 'top-left')}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '20px',
            height: '20px',
            cursor: 'nw-resize',
            backgroundColor: 'transparent'
          }}
        />
        
        {/* Top Right Corner */}
        <div
          onMouseDown={(e) => handleResizeStart(e, 'top-right')}
          style={{
            position: 'absolute',
            top: 0,
            right: 0,
            width: '20px',
            height: '20px',
            cursor: 'ne-resize',
            backgroundColor: 'transparent'
          }}
        />
        
        {/* Bottom Left Corner */}
        <div
          onMouseDown={(e) => handleResizeStart(e, 'bottom-left')}
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            width: '20px',
            height: '20px',
            cursor: 'ne-resize',
            backgroundColor: 'transparent'
          }}
        />
      </div>
    </div>,
    document.body
  );
};

export default AssetLibraryPopup;
