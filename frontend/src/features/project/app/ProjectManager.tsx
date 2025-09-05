import React, { useState, useEffect, useCallback } from 'react';
import { useAppStore } from '../../../store/appStore';
import '../ui/ProjectManager.css';

interface SavedProject {
  id: string;
  name: string;
  description?: string;
  folder?: string;
  thumbnail?: string;
  createdAt: string;
  updatedAt: string;
  // Some projects come from backend with nested settings, others are flattened
  settings?: {
    width: number;
    height: number;
    fps: number;
    duration: number;
  };
  width?: number;
  height?: number;
  fps?: number;
  duration?: number;
  objects?: any[];
}

interface ProjectFolder {
  id: string;
  name: string;
  color: string;
  projectCount: number;
}

interface ProjectManagerProps {
  isOpen: boolean;
  onClose: () => void;
  mode: 'load' | 'save' | 'organize';
}

const ProjectManager: React.FC<ProjectManagerProps> = ({ isOpen, onClose, mode }) => {
  const { currentProject, setProject } = useAppStore();
  const [projects, setProjects] = useState<SavedProject[]>([]);
  const [folders, setFolders] = useState<ProjectFolder[]>([
    { id: 'default', name: 'My Projects', color: '#3b82f6', projectCount: 0 },
    { id: 'business', name: 'Business', color: '#10b981', projectCount: 0 },
    { id: 'education', name: 'Education', color: '#f59e0b', projectCount: 0 },
    { id: 'personal', name: 'Personal', color: '#ef4444', projectCount: 0 }
  ]);
  const [activeFolder, setActiveFolder] = useState<string>('default');
  const [loading, setLoading] = useState(false);
  const [showNewFolder, setShowNewFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [saveProjectName, setSaveProjectName] = useState('');
  const [saveProjectDescription, setSaveProjectDescription] = useState('');
  const [selectedFolder, setSelectedFolder] = useState('default');

  // Load projects from backend
  const loadProjects = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch('http://localhost:3001/api/projects');
      if (response.ok) {
        const projectData = await response.json();
        setProjects(projectData);
        updateFolderCounts(projectData);
      }
    } catch (error) {
      console.error('Failed to load projects:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  // Update folder project counts
  const updateFolderCounts = (projectData: SavedProject[]) => {
    setFolders(prev => prev.map(folder => ({
      ...folder,
      projectCount: projectData.filter(p => (p.folder || 'default') === folder.id).length
    })));
  };

  // Save current project
  const saveProject = async () => {
    if (!currentProject || !saveProjectName.trim()) {
      alert('Please enter a project name');
      return;
    }

    setLoading(true);
    try {
      const projectToSave = {
        ...currentProject,
        name: saveProjectName.trim(),
        description: saveProjectDescription.trim(),
        folder: selectedFolder,
        updatedAt: new Date().toISOString()
      };

      const method = currentProject.id ? 'PUT' : 'POST';
      const url = currentProject.id 
        ? `http://localhost:3001/api/projects/${currentProject.id}`
        : 'http://localhost:3001/api/projects';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(projectToSave)
      });

      if (response.ok) {
        const savedProject = await response.json();
        setProject(savedProject);
        await loadProjects();
        onClose();
      } else {
        alert('Failed to save project');
      }
    } catch (error) {
      console.error('Failed to save project:', error);
      alert('Failed to save project');
    } finally {
      setLoading(false);
    }
  };

  // Load selected project
  const loadProject = async (projectId: string) => {
    setLoading(true);
    try {
      const response = await fetch(`http://localhost:3001/api/projects/${projectId}`);
      if (response.ok) {
        const project = await response.json();
        setProject(project);
        onClose();
      }
    } catch (error) {
      console.error('Failed to load project:', error);
    } finally {
      setLoading(false);
    }
  };

  // Delete project
  const deleteProject = async (projectId: string) => {
    // eslint-disable-next-line no-restricted-globals
    if (!confirm('Are you sure you want to delete this project?')) return;

    try {
      const response = await fetch(`http://localhost:3001/api/projects/${projectId}`, {
        method: 'DELETE'
      });
      
      if (response.ok) {
        await loadProjects();
      }
    } catch (error) {
      console.error('Failed to delete project:', error);
    }
  };

  // Add new folder
  const addFolder = () => {
    if (!newFolderName.trim()) return;

    const newFolder: ProjectFolder = {
      id: Date.now().toString(),
      name: newFolderName.trim(),
      color: `#${Math.floor(Math.random()*16777215).toString(16)}`,
      projectCount: 0
    };

    setFolders(prev => [...prev, newFolder]);
    setNewFolderName('');
    setShowNewFolder(false);
  };

  useEffect(() => {
    if (isOpen) {
      loadProjects();
      if (currentProject) {
        setSaveProjectName(currentProject.name || '');
        setSaveProjectDescription('');
      }
    }
  }, [isOpen, currentProject, loadProjects]);

  if (!isOpen) return null;

  const filteredProjects = projects.filter(p => (p.folder || 'default') === activeFolder);

  return (
    <div className="project-manager-overlay">
      <div className="project-manager-modal">
        <div className="project-manager-header">
          <h2>
            {mode === 'save' && '💾 Save Project'}
            {mode === 'load' && '📁 Load Project'}
            {mode === 'organize' && '📂 Organize Projects'}
          </h2>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>

        <div className="project-manager-content">
          {/* Sidebar with folders */}
          <div className="folders-sidebar">
            <div className="folders-header">
              <h3>📁 Folders</h3>
              <button 
                className="add-folder-btn"
                onClick={() => setShowNewFolder(true)}
                title="Add New Folder"
              >
                +
              </button>
            </div>

            <div className="folders-list">
              {folders.map(folder => (
                <div
                  key={folder.id}
                  className={`folder-item ${activeFolder === folder.id ? 'active' : ''}`}
                  onClick={() => setActiveFolder(folder.id)}
                  style={{ borderLeftColor: folder.color }}
                >
                  <span className="folder-name">{folder.name}</span>
                  <span className="project-count">{folder.projectCount}</span>
                </div>
              ))}
            </div>

            {showNewFolder && (
              <div className="new-folder-form">
                <input
                  type="text"
                  placeholder="Folder name"
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && addFolder()}
                  autoFocus
                />
                <div className="new-folder-actions">
                  <button onClick={addFolder}>✓</button>
                  <button onClick={() => setShowNewFolder(false)}>✕</button>
                </div>
              </div>
            )}
          </div>

          {/* Main content */}
          <div className="projects-main">
            {mode === 'save' && (
              <div className="save-project-form">
                <h3>Save Current Project</h3>
                <div className="form-group">
                  <label>Project Name *</label>
                  <input
                    type="text"
                    value={saveProjectName}
                    onChange={(e) => setSaveProjectName(e.target.value)}
                    placeholder="Enter project name"
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Description</label>
                  <textarea
                    value={saveProjectDescription}
                    onChange={(e) => setSaveProjectDescription(e.target.value)}
                    placeholder="Optional description"
                    rows={3}
                  />
                </div>
                <div className="form-group">
                  <label>Save to Folder</label>
                  <select 
                    value={selectedFolder} 
                    onChange={(e) => setSelectedFolder(e.target.value)}
                  >
                    {folders.map(folder => (
                      <option key={folder.id} value={folder.id}>
                        {folder.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="save-actions">
                  <button 
                    className="save-btn" 
                    onClick={saveProject}
                    disabled={loading || !saveProjectName.trim()}
                  >
                    {loading ? '💾 Saving...' : '💾 Save Project'}
                  </button>
                </div>
              </div>
            )}

            {(mode === 'load' || mode === 'organize') && (
              <div className="projects-grid">
                <div className="projects-header">
                  <h3>
                    {folders.find(f => f.id === activeFolder)?.name} 
                    <span className="count">({filteredProjects.length})</span>
                  </h3>
                </div>

                {loading ? (
                  <div className="loading">Loading projects...</div>
                ) : filteredProjects.length === 0 ? (
                  <div className="empty-state">
                    <div className="empty-icon">📄</div>
                    <p>No projects in this folder</p>
                    <p className="empty-hint">Create a new project or move existing ones here</p>
                  </div>
                ) : (
                  <div className="projects-list">
                    {filteredProjects.map(project => (
                      <div key={project.id} className="project-card">
                        <div className="project-thumbnail">
                          {project.thumbnail || '🎬'}
                        </div>
                        <div className="project-info">
                          <h4 className="project-name">{project.name}</h4>
                          {project.description && (
                            <p className="project-description">{project.description}</p>
                          )}
                          <div className="project-meta">
                            <span className="project-date">
                              {new Date(project.updatedAt).toLocaleDateString()}
                            </span>
                            <span className="project-size">
                              {(project.settings?.width ?? project.width ?? 1920)}×{(project.settings?.height ?? project.height ?? 1080)}
                            </span>
                          </div>
                        </div>
                        <div className="project-actions">
                          {mode === 'load' && (
                            <button 
                              className="load-btn"
                              onClick={() => loadProject(project.id)}
                            >
                              📂 Load
                            </button>
                          )}
                          {mode === 'organize' && (
                            <select
                              value={project.folder || 'default'}
                              onChange={(e) => {
                                // TODO: Move project to different folder
                              }}
                              className="folder-select"
                            >
                              {folders.map(folder => (
                                <option key={folder.id} value={folder.id}>
                                  {folder.name}
                                </option>
                              ))}
                            </select>
                          )}
                          <button 
                            className="delete-btn"
                            onClick={() => deleteProject(project.id)}
                            title="Delete Project"
                          >
                            🗑️
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProjectManager;
