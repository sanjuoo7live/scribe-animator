import { useEffect } from 'react';
import { useAppStore } from '../store/appStore';

const KeyboardShortcuts: React.FC = () => {
  const { undo, redo, canUndo, canRedo, removeObject, selectedObject } = useAppStore();

  // Helper function to show notifications
  const showNotification = (message: string, type: 'success' | 'info' = 'info') => {
    const notification = document.createElement('div');
    notification.className = `fixed top-4 left-1/2 transform -translate-x-1/2 ${
      type === 'success' ? 'bg-green-600' : 'bg-blue-600'
    } text-white px-4 py-2 rounded shadow-lg z-50 transition-opacity`;
    notification.textContent = message;
    document.body.appendChild(notification);
    
    // Fade out and remove after 2 seconds
    setTimeout(() => {
      notification.style.opacity = '0';
      setTimeout(() => {
        document.body.removeChild(notification);
      }, 300);
    }, 2000);
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Always handle Delete/Backspace for deleting selected object
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedObject) {
        e.preventDefault();
        removeObject(selectedObject);
        showNotification('Object deleted', 'success');
        return;
      }

      // Below require modifier keys (Cmd on Mac, Ctrl on Windows/Linux)
      const isModifierPressed = e.metaKey || e.ctrlKey;
      if (!isModifierPressed) return;

      switch (e.key.toLowerCase()) {
        case 'z':
          if (e.shiftKey) {
            // Cmd/Ctrl + Shift + Z = Redo
            if (canRedo()) {
              e.preventDefault();
              redo();
              showNotification('Redo action performed', 'info');
            }
          } else {
            // Cmd/Ctrl + Z = Undo
            if (canUndo()) {
              e.preventDefault();
              undo();
              showNotification('Undo action performed', 'info');
            }
          }
          break;
          
        case 'y':
          // Cmd/Ctrl + Y = Redo (alternative shortcut)
          if (canRedo()) {
            e.preventDefault();
            redo();
            showNotification('Redo action performed', 'info');
          }
          break;
          
  // Delete handled above without modifiers
      }
    };

    // Add event listener
    document.addEventListener('keydown', handleKeyDown);
    
    // Cleanup
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [undo, redo, canUndo, canRedo, removeObject, selectedObject]);

  return null; // This component doesn't render anything
};

export default KeyboardShortcuts;
