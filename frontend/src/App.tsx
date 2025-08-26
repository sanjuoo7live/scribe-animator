import React, { useState, useCallback } from 'react';
import CanvasEditor from './components/CanvasEditor';
import Timeline from './components/Timeline';
import AssetPanel from './components/AssetPanel';
import PropertiesPanel from './components/PropertiesPanel';
import ProjectTemplates from './components/ProjectTemplates';
import ProjectManager from './components/ProjectManager';
import ExportSystem from './components/ExportSystem';
import AIAssistant from './components/AIAssistant';
import KeyboardShortcuts from './components/KeyboardShortcuts';
import { useAppStore, createDefaultProject } from './store/appStore';
import './App.css';

const App: React.FC = () => {
  const { currentProject, setProject, isPlaying, compactUIOnPlay } = useAppStore();
  const [showProjectTemplates, setShowProjectTemplates] = useState(false);
  const [showProjectManager, setShowProjectManager] = useState(false);
  const [projectManagerMode, setProjectManagerMode] = useState<'load' | 'save' | 'organize'>('load');
  const [showExportSystem, setShowExportSystem] = useState(false);
  const [leftPanelWidth, setLeftPanelWidth] = useState(320);
  const [leftPanelCollapsed, setLeftPanelCollapsed] = useState(false);
  const [timelineHeight, setTimelineHeight] = useState(300);
  const [isResizingLeft, setIsResizingLeft] = useState(false);
  const [isResizingTimeline, setIsResizingTimeline] = useState(false);
  const [showRightPanel, setShowRightPanel] = useState(false); // Right panel is hidden by default
  const { selectedObject } = useAppStore();

  // Quick Save: PUT current project to backend (creates or updates)
  const quickSaveProject = React.useCallback(async () => {
    try {
      if (!currentProject) return;
      // If no name, open Save dialog for richer input
      if (!currentProject.name || !currentProject.name.trim()) {
        setProjectManagerMode('save');
        setShowProjectManager(true);
        return;
      }

      const payload = {
        ...currentProject,
        updatedAt: new Date().toISOString(),
      } as any;

      const res = await fetch(`http://localhost:3001/api/projects/${currentProject.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error(`Save failed: ${res.status}`);
      const saved = await res.json();
      setProject(saved);

      // Toast
      const note = document.createElement('div');
      note.className = 'fixed top-4 right-4 bg-green-600 text-white px-3 py-2 rounded shadow z-[9999]';
      note.textContent = `Saved: ${saved.name}`;
      document.body.appendChild(note);
      setTimeout(() => note.remove(), 2000);
    } catch (err) {
      console.error('Quick save failed:', err);
      const note = document.createElement('div');
      note.className = 'fixed top-4 right-4 bg-red-600 text-white px-3 py-2 rounded shadow z-[9999]';
      note.textContent = 'Save failed';
      document.body.appendChild(note);
      setTimeout(() => note.remove(), 2500);
    }
  }, [currentProject, setProject]);

  // Auto-open properties panel when an object is selected
  React.useEffect(() => {
    if (selectedObject) {
      setShowRightPanel(true);
    }
  }, [selectedObject]);

  // Keyboard shortcut for toggling left panel (Ctrl/Cmd + B)
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'b') {
        e.preventDefault();
        setLeftPanelCollapsed(prev => !prev);
      }
      // Quick Save: Ctrl/Cmd + S
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        quickSaveProject();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [quickSaveProject]);

  // Initialize default project if none exists
  React.useEffect(() => {
    if (!currentProject) {
      setProject(createDefaultProject());
    }
  }, [currentProject, setProject]);

  // Handle left panel resizing
  const handleLeftPanelMouseMove = useCallback((e: MouseEvent) => {
    if (isResizingLeft) {
      const newWidth = Math.min(Math.max(e.clientX, 250), 500);
      setLeftPanelWidth(newWidth);
    }
  }, [isResizingLeft]);

  const handleLeftPanelMouseUp = useCallback(() => {
    setIsResizingLeft(false);
    document.removeEventListener('mousemove', handleLeftPanelMouseMove);
    document.removeEventListener('mouseup', handleLeftPanelMouseUp);
  }, [handleLeftPanelMouseMove]);

  const handleLeftPanelMouseDown = (e: React.MouseEvent) => {
    setIsResizingLeft(true);
    document.addEventListener('mousemove', handleLeftPanelMouseMove);
    document.addEventListener('mouseup', handleLeftPanelMouseUp);
    e.preventDefault();
  };

  // Handle timeline resizing
  const handleTimelineMouseMove = useCallback((e: MouseEvent) => {
    if (isResizingTimeline) {
      const rect = document.querySelector('.app-layout')?.getBoundingClientRect();
      if (rect) {
        const newHeight = Math.min(Math.max(rect.bottom - e.clientY, 200), 500);
        setTimelineHeight(newHeight);
      }
    }
  }, [isResizingTimeline]);

  const handleTimelineMouseUp = useCallback(() => {
    setIsResizingTimeline(false);
    document.removeEventListener('mousemove', handleTimelineMouseMove);
    document.removeEventListener('mouseup', handleTimelineMouseUp);
  }, [handleTimelineMouseMove]);

  const handleTimelineMouseDown = (e: React.MouseEvent) => {
    setIsResizingTimeline(true);
    document.addEventListener('mousemove', handleTimelineMouseMove);
    document.addEventListener('mouseup', handleTimelineMouseUp);
    e.preventDefault();
  };

  // Cleanup event listeners on unmount
  React.useEffect(() => {
    return () => {
      document.removeEventListener('mousemove', handleLeftPanelMouseMove);
      document.removeEventListener('mouseup', handleLeftPanelMouseUp);
      document.removeEventListener('mousemove', handleTimelineMouseMove);
      document.removeEventListener('mouseup', handleTimelineMouseUp);
    };
  }, [handleLeftPanelMouseMove, handleLeftPanelMouseUp, handleTimelineMouseMove, handleTimelineMouseUp]);

  return (
    <div className="app">
      <KeyboardShortcuts />
      <header className="app-header">
        <div className="header-left">
          <h1>Scribe Animator</h1>
          <div className="project-info">
            {currentProject?.name && <span className="project-name">{currentProject.name}</span>}
          </div>
        </div>
        <div className="header-actions">
          <button
            className="btn btn-secondary"
            onClick={() => setLeftPanelCollapsed(!leftPanelCollapsed)}
            title={leftPanelCollapsed ? "Show Asset Panel (Ctrl/Cmd + B)" : "Hide Asset Panel (Ctrl/Cmd + B)"}
          >
            {leftPanelCollapsed ? '◀ Show Assets' : '▶ Hide Assets'}
          </button>
          
          <button
            className="btn btn-secondary"
            onClick={() => {
              setProjectManagerMode('save');
              setShowProjectManager(true);
            }}
            title="Save Current Project"
          >
            💾 Save
          </button>
          
          <button
            className="btn btn-secondary"
            onClick={() => {
              setProjectManagerMode('load');
              setShowProjectManager(true);
            }}
            title="Load Project"
          >
            📁 Load
          </button>
          
          <button
            className="btn btn-secondary"
            onClick={() => setShowProjectTemplates(true)}
          >
            ➕ New Project
          </button>
          
          <button
            className="btn btn-secondary"
            onClick={() => {
              setProjectManagerMode('organize');
              setShowProjectManager(true);
            }}
            title="Organize Projects"
          >
            📂 Organize
          </button>
          
          <button
            className="btn btn-secondary"
            onClick={() => setShowRightPanel(!showRightPanel)}
          >
            {showRightPanel ? 'Hide Properties' : 'Show Properties'}
          </button>
          <button
            className="btn btn-primary"
            onClick={() => setShowExportSystem(true)}
          >
            Export Video
          </button>
        </div>
      </header>

      <div className="app-layout">
        <div 
          className={`left-panel ${leftPanelCollapsed ? 'collapsed' : ''}`} 
          style={{ width: leftPanelCollapsed ? '40px' : `${leftPanelWidth}px` }}
        >
          {!leftPanelCollapsed && <AssetPanel />}
          {leftPanelCollapsed && (
            <div className="collapsed-panel-content">
              <button
                className="expand-panel-btn"
                onClick={() => setLeftPanelCollapsed(false)}
                title="Show Asset Panel (Ctrl/Cmd + B)"
              >
                ◀
              </button>
              
              {/* Mini category indicators */}
              <div className="mini-category-indicators">
                <div 
                  className="mini-category" 
                  title="Shapes"
                  onClick={() => {
                    setLeftPanelCollapsed(false);
                    // Could integrate with AssetPanel to set active category
                  }}
                >⬛</div>
                <div 
                  className="mini-category" 
                  title="Icons"
                  onClick={() => setLeftPanelCollapsed(false)}
                >😊</div>
                <div 
                  className="mini-category" 
                  title="Text"
                  onClick={() => setLeftPanelCollapsed(false)}
                >T</div>
                <div 
                  className="mini-category" 
                  title="Hands"
                  onClick={() => setLeftPanelCollapsed(false)}
                >✋</div>
                <div 
                  className="mini-category" 
                  title="Characters"
                  onClick={() => setLeftPanelCollapsed(false)}
                >👤</div>
                <div 
                  className="mini-category" 
                  title="Props"
                  onClick={() => setLeftPanelCollapsed(false)}
                >🎭</div>
                <div 
                  className="mini-category" 
                  title="Images"
                  onClick={() => setLeftPanelCollapsed(false)}
                >🖼️</div>
                <div 
                  className="mini-category" 
                  title="Templates"
                  onClick={() => setLeftPanelCollapsed(false)}
                >⚡</div>
                <div 
                  className="mini-category" 
                  title="Effects"
                  onClick={() => setLeftPanelCollapsed(false)}
                >✨</div>
              </div>
            </div>
          )}
          {!leftPanelCollapsed && (
            <div 
              className={`panel-resizer ${isResizingLeft ? 'resizing' : ''}`}
              onMouseDown={handleLeftPanelMouseDown}
            />
          )}
        </div>
        
  <div className={`main-content`}>
          <div className="canvas-container">
            <CanvasEditor />
          </div>
          <div 
            className={`timeline-resizer ${isResizingTimeline ? 'resizing' : ''}`}
            onMouseDown={handleTimelineMouseDown}
          />
          <div className="timeline-container" style={{ height: `${timelineHeight}px` }}>
            <Timeline />
          </div>
        </div>
        
  {(showRightPanel && !(isPlaying && compactUIOnPlay)) && (
          <div className="right-panel">
            <PropertiesPanel />
          </div>
        )}
      </div>

      {showProjectTemplates && (
        <ProjectTemplates
          onClose={() => setShowProjectTemplates(false)}
        />
      )}

      {showProjectManager && (
        <ProjectManager
          isOpen={showProjectManager}
          onClose={() => setShowProjectManager(false)}
          mode={projectManagerMode}
        />
      )}

      {showExportSystem && (
        <ExportSystem 
          isOpen={showExportSystem}
          onClose={() => setShowExportSystem(false)} 
        />
      )}
      
      {/* AI Assistant - Floating Widget */}
      <AIAssistant />
    </div>
  );
};

export default App;
