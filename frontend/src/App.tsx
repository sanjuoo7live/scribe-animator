import React, { useState, useCallback } from 'react';
import CanvasEditor from './components/CanvasEditor';
import Timeline from './components/Timeline';
import AssetPanel from './components/AssetPanel';
import PropertiesPanel from './components/PropertiesPanel';
import ProjectTemplates from './components/ProjectTemplates';
import ExportSystem from './components/ExportSystem';
import AIAssistant from './components/AIAssistant';
import { useAppStore, createDefaultProject } from './store/appStore';
import './App.css';

const App: React.FC = () => {
  const { currentProject, setProject, isPlaying, compactUIOnPlay } = useAppStore();
  const [showProjectTemplates, setShowProjectTemplates] = useState(false);
  const [showExportSystem, setShowExportSystem] = useState(false);
  const [leftPanelWidth, setLeftPanelWidth] = useState(320);
  const [timelineHeight, setTimelineHeight] = useState(300);
  const [isResizingLeft, setIsResizingLeft] = useState(false);
  const [isResizingTimeline, setIsResizingTimeline] = useState(false);
  const [showRightPanel, setShowRightPanel] = useState(false); // Right panel is hidden by default

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
            onClick={() => setShowProjectTemplates(true)}
          >
            New Project
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
        <div className="left-panel" style={{ width: `${leftPanelWidth}px` }}>
          <AssetPanel />
          <div 
            className={`panel-resizer ${isResizingLeft ? 'resizing' : ''}`}
            onMouseDown={handleLeftPanelMouseDown}
          />
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
