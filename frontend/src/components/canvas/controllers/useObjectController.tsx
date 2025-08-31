import { useCallback } from 'react';

// Object controller hook for unified selection/drag/transform handling
export const useObjectController = (
  obj: any,
  onUpdate: (id: string, updates: any) => void,
  onSelect: (id: string | null) => void,
  onDblClick?: (id: string) => void
) => {
  const handleClick = useCallback((id: string) => {
    onSelect(id);
  }, [onSelect]);

  const handleDragEnd = useCallback((id: string, target: any) => {
    const newX = target.x();
    const newY = target.y();
    onUpdate(id, { x: newX, y: newY });
  }, [onUpdate]);

  const handleTransformEnd = useCallback((id: string, target: any) => {
    const newX = target.x();
    const newY = target.y();
    const newRotation = target.rotation();
    const newScaleX = target.scaleX();
    const newScaleY = target.scaleY();

    // Reset scale to 1 and adjust width/height accordingly
    const updates: any = {
      x: newX,
      y: newY,
      rotation: newRotation,
    };

    if (obj.type === 'text') {
      // For text, scale affects font size
      const baseFontSize = obj.properties?.fontSize || 16;
      updates.properties = {
        ...obj.properties,
        fontSize: baseFontSize * Math.max(newScaleX, newScaleY),
      };
    } else {
      // For other objects, scale affects width/height
      updates.width = (obj.width || 100) * newScaleX;
      updates.height = (obj.height || 100) * newScaleY;
    }

    // Reset the node's scale to (1,1)
    target.scaleX(1);
    target.scaleY(1);

    onUpdate(id, updates);
  }, [onUpdate, obj]);

  const handleDblClick = useCallback((id: string) => {
    // Handle double-click actions (e.g., edit text)
    if (onDblClick) {
      onDblClick(id);
    } else if (obj.type === 'text') {
      // Fallback for text editing if no callback provided
      console.log('Edit text for', id);
    }
  }, [obj.type, onDblClick]);

  return {
    handleClick,
    handleDragEnd,
    handleTransformEnd,
    handleDblClick,
  };
};
