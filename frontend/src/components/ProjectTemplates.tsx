import React, { useState } from 'react';
// Removed portal in favor of AssetLibraryPopup
import AssetLibraryPopup from './AssetLibraryPopup';
import { useAppStore } from '../store/appStore';

interface ProjectTemplate {
  id: string;
  name: string;
  description: string;
  category: 'business' | 'education' | 'social' | 'marketing' | 'tutorial';
  thumbnail: string;
  settings: {
    width: number;
    height: number;
    fps: number;
    duration: number;
    boardStyle?: string;
    backgroundColor?: string;
  };
  objects: any[];
  previewImage?: string;
}

interface ProjectTemplatesProps {
  onClose: () => void;
  onProjectCreated?: (project: any) => void;
}

const ProjectTemplates: React.FC<ProjectTemplatesProps> = ({ onClose, onProjectCreated }) => {
  const { setProject } = useAppStore();
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [showNameDialog, setShowNameDialog] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<ProjectTemplate | null>(null);
  const [projectName, setProjectName] = useState('');
  const [projectDescription, setProjectDescription] = useState('');
  const [saveToLibrary, setSaveToLibrary] = useState(true);
  const [customProject, setCustomProject] = useState({
    name: '',
    width: 1920,
    height: 1080,
    fps: 30,
    duration: 60,
    backgroundColor: '#ffffff'
  });

  const projectTemplates: ProjectTemplate[] = [
    {
      id: 'business-presentation',
      name: 'Business Presentation',
      description: 'Professional template for business presentations and pitches',
      category: 'business',
      thumbnail: '💼',
      settings: {
        width: 1920,
        height: 1080,
        fps: 30,
        duration: 60,
        boardStyle: 'whiteboard',
        backgroundColor: '#ffffff'
      },
      objects: [
        {
          type: 'text',
          x: 960,
          y: 200,
          properties: {
            text: 'Business Presentation',
            fontSize: 48,
            fill: '#1e40af',
            fontFamily: 'Arial'
          },
          animationType: 'fadeIn',
          animationDuration: 2,
          animationStart: 0
        },
        {
          type: 'shape',
          x: 400,
          y: 400,
          width: 300,
          height: 200,
          properties: {
            shapeType: 'rectangle',
            fill: '#f3f4f6',
            stroke: '#d1d5db',
            strokeWidth: 2
          },
          animationType: 'slideIn',
          animationDuration: 1.5,
          animationStart: 2
        },
        {
          type: 'text',
          x: 550,
          y: 480,
          properties: {
            text: 'Key Points',
            fontSize: 24,
            fill: '#374151',
            fontFamily: 'Arial'
          },
          animationType: 'fadeIn',
          animationDuration: 1,
          animationStart: 3
        }
      ]
    },
    {
      id: 'educational-lesson',
      name: 'Educational Lesson',
      description: 'Perfect for online courses and educational content',
      category: 'education',
      thumbnail: '🎓',
      settings: {
        width: 1280,
        height: 720,
        fps: 30,
        duration: 120,
        boardStyle: 'chalkboard',
        backgroundColor: '#1f2937'
      },
      objects: [
        {
          type: 'text',
          x: 640,
          y: 100,
          properties: {
            text: 'Today\'s Lesson',
            fontSize: 36,
            fill: '#ffffff',
            fontFamily: 'Arial'
          },
          animationType: 'slideIn',
          animationDuration: 2,
          animationStart: 0
        },
        {
          type: 'shape',
          x: 200,
          y: 250,
          width: 150,
          height: 150,
          properties: {
            shapeType: 'circle',
            fill: 'transparent',
            stroke: '#10b981',
            strokeWidth: 3
          },
          animationType: 'drawIn',
          animationDuration: 2,
          animationStart: 2
        },
        {
          type: 'text',
          x: 400,
          y: 320,
          properties: {
            text: 'Step 1: Introduction',
            fontSize: 20,
            fill: '#d1fae5',
            fontFamily: 'Arial'
          },
          animationType: 'fadeIn',
          animationDuration: 1.5,
          animationStart: 4
        }
      ]
    },
    {
      id: 'social-media-video',
      name: 'Social Media Video',
      description: 'Optimized for Instagram, TikTok, and vertical platforms',
      category: 'social',
      thumbnail: '📱',
      settings: {
        width: 1080,
        height: 1920,
        fps: 30,
        duration: 30,
        boardStyle: 'glassboard',
        backgroundColor: '#8b5cf6'
      },
      objects: [
        {
          type: 'text',
          x: 540,
          y: 400,
          properties: {
            text: 'Social Post',
            fontSize: 42,
            fill: '#ffffff',
            fontFamily: 'Arial'
          },
          animationType: 'scaleIn',
          animationDuration: 1.5,
          animationStart: 0
        },
        {
          type: 'shape',
          x: 440,
          y: 700,
          width: 200,
          height: 200,
          properties: {
            shapeType: 'heart',
            fill: '#ef4444',
            stroke: '#dc2626',
            strokeWidth: 2
          },
          animationType: 'scaleIn',
          animationDuration: 1,
          animationStart: 1.5
        },
        {
          type: 'text',
          x: 540,
          y: 1200,
          properties: {
            text: '#trending',
            fontSize: 24,
            fill: '#a78bfa',
            fontFamily: 'Arial'
          },
          animationType: 'slideIn',
          animationDuration: 1,
          animationStart: 2.5
        }
      ]
    },
    {
      id: 'marketing-promo',
      name: 'Marketing Promo',
      description: 'Eye-catching template for product promotions and ads',
      category: 'marketing',
      thumbnail: '🎯',
      settings: {
        width: 1920,
        height: 1080,
        fps: 30,
        duration: 45,
        boardStyle: 'custom',
        backgroundColor: '#1e1b4b'
      },
      objects: [
        {
          type: 'text',
          x: 960,
          y: 300,
          properties: {
            text: 'SPECIAL OFFER',
            fontSize: 54,
            fill: '#fbbf24',
            fontFamily: 'Arial'
          },
          animationType: 'scaleIn',
          animationDuration: 1.5,
          animationStart: 0
        },
        {
          type: 'text',
          x: 960,
          y: 400,
          properties: {
            text: '50% OFF',
            fontSize: 72,
            fill: '#ef4444',
            fontFamily: 'Arial'
          },
          animationType: 'scaleIn',
          animationDuration: 2,
          animationStart: 1
        },
        {
          type: 'shape',
          x: 760,
          y: 500,
          width: 400,
          height: 100,
          properties: {
            shapeType: 'rectangle',
            fill: '#10b981',
            stroke: '#059669',
            strokeWidth: 3
          },
          animationType: 'slideIn',
          animationDuration: 1,
          animationStart: 3
        },
        {
          type: 'text',
          x: 960,
          y: 540,
          properties: {
            text: 'Limited Time Only!',
            fontSize: 28,
            fill: '#ffffff',
            fontFamily: 'Arial'
          },
          animationType: 'fadeIn',
          animationDuration: 1,
          animationStart: 3.5
        }
      ]
    },
    {
      id: 'tutorial-howto',
      name: 'Tutorial How-To',
      description: 'Step-by-step tutorial template with numbered sections',
      category: 'tutorial',
      thumbnail: '📚',
      settings: {
        width: 1920,
        height: 1080,
        fps: 30,
        duration: 180,
        boardStyle: 'whiteboard',
        backgroundColor: '#ffffff'
      },
      objects: [
        {
          type: 'text',
          x: 960,
          y: 150,
          properties: {
            text: 'How To Guide',
            fontSize: 42,
            fill: '#1f2937',
            fontFamily: 'Arial'
          },
          animationType: 'fadeIn',
          animationDuration: 2,
          animationStart: 0
        },
        {
          type: 'shape',
          x: 200,
          y: 300,
          width: 80,
          height: 80,
          properties: {
            shapeType: 'circle',
            fill: '#3b82f6',
            stroke: '#1d4ed8',
            strokeWidth: 3
          },
          animationType: 'scaleIn',
          animationDuration: 1,
          animationStart: 2
        },
        {
          type: 'text',
          x: 240,
          y: 330,
          properties: {
            text: '1',
            fontSize: 36,
            fill: '#ffffff',
            fontFamily: 'Arial'
          },
          animationType: 'fadeIn',
          animationDuration: 0.5,
          animationStart: 2.5
        },
        {
          type: 'text',
          x: 320,
          y: 330,
          properties: {
            text: 'First step explanation',
            fontSize: 24,
            fill: '#374151',
            fontFamily: 'Arial'
          },
          animationType: 'slideIn',
          animationDuration: 1.5,
          animationStart: 3
        }
      ]
    },
    {
      id: 'blank-canvas',
      name: 'Blank Canvas',
      description: 'Start from scratch with a clean slate',
      category: 'business',
      thumbnail: '⬜',
      settings: {
        width: 1920,
        height: 1080,
        fps: 30,
        duration: 60,
        boardStyle: 'whiteboard',
        backgroundColor: '#ffffff'
      },
      objects: []
    }
  ];

  const categories = [
    { id: 'all', name: 'All Templates', icon: '📁' },
    { id: 'custom', name: 'Custom Project', icon: '✨' },
    { id: 'business', name: 'Business', icon: '💼' },
    { id: 'education', name: 'Education', icon: '🎓' },
    { id: 'social', name: 'Social Media', icon: '📱' },
    { id: 'marketing', name: 'Marketing', icon: '🎯' },
    { id: 'tutorial', name: 'Tutorial', icon: '📚' }
  ];

  const createProjectFromTemplate = (_templateOrEvent: any, templateMaybe?: ProjectTemplate) => {
    // Support old/new signatures seamlessly
    const template = (templateMaybe || _templateOrEvent) as ProjectTemplate;
    setSelectedTemplate(template);
    setProjectName(template.name);
    setProjectDescription(`Created from template: ${template.description}`);
    setShowNameDialog(true);
  };

  const createProjectWithName = async () => {
    if (!projectName.trim()) {
      alert('Please enter a project name');
      return;
    }

    const template = selectedTemplate;
    if (!template) return;

    const newProject = {
      id: `project-${Date.now()}`,
      name: projectName.trim(),
      description: projectDescription.trim(),
      width: template.settings.width,
      height: template.settings.height,
      fps: template.settings.fps,
      duration: template.settings.duration,
      objects: template.objects.map((obj, index) => ({
        id: `obj-${Date.now()}-${index}`,
        ...obj
      })),
      boardStyle: template.settings.boardStyle,
      backgroundColor: template.settings.backgroundColor,
      cameraPosition: { x: 0, y: 0, zoom: 1 },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    // Save to backend if requested
    if (saveToLibrary) {
      try {
        const response = await fetch('http://localhost:3001/api/projects', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(newProject)
        });

        if (response.ok) {
          const savedProject = await response.json();
          setProject(savedProject);
          onProjectCreated?.(savedProject);
        } else {
          // If save fails, still create the project locally
          setProject(newProject);
        }
      } catch (error) {
        console.error('Failed to save project:', error);
        setProject(newProject);
      }
    } else {
      setProject(newProject);
    }

  setShowNameDialog(false);
    onClose();

    // Success notification
    const notification = document.createElement('div');
    notification.className = 'fixed top-4 right-4 bg-green-600 text-white px-4 py-2 rounded shadow-lg z-50';
    notification.textContent = `Created project: "${projectName}"`;
    document.body.appendChild(notification);
    setTimeout(() => document.body.removeChild(notification), 3000);
  };

  const createCustomProject = () => {
    if (!customProject.name.trim()) {
      alert('Please enter a project name');
      return;
    }

    const newProject = {
      id: `project-${Date.now()}`,
      name: customProject.name,
      width: customProject.width,
      height: customProject.height,
      fps: customProject.fps,
      duration: customProject.duration,
      objects: [],
      boardStyle: 'whiteboard',
      backgroundColor: customProject.backgroundColor,
      cameraPosition: { x: 0, y: 0, zoom: 1 }
    };

    setProject(newProject);
    onClose();

    // Success notification
    const notification = document.createElement('div');
    notification.className = 'fixed top-4 right-4 bg-green-600 text-white px-4 py-2 rounded shadow-lg z-50';
    notification.textContent = `Created custom project: "${customProject.name}"`;
    document.body.appendChild(notification);
    setTimeout(() => document.body.removeChild(notification), 3000);
  };

  const filteredTemplates = selectedCategory === 'all' 
    ? projectTemplates 
    : selectedCategory === 'custom'
    ? []
    : projectTemplates.filter(t => t.category === selectedCategory);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60]">
      <div className="bg-gray-800 rounded-lg p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-semibold text-white">Choose Project Template</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white text-xl"
          >
            ×
          </button>
        </div>

        {/* Category Filter */}
        <div className="mb-6">
          <div className="flex flex-wrap gap-2">
            {categories.map((category) => (
              <button
                key={category.id}
                onClick={() => setSelectedCategory(category.id)}
                className={`px-3 py-2 rounded text-sm ${
                  selectedCategory === category.id
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
              >
                {category.icon} {category.name}
              </button>
            ))}
          </div>
        </div>

        {/* Custom Project Form */}
        {selectedCategory === 'custom' && (
          <div className="mb-6 bg-gray-700 rounded-lg p-6">
            <h4 className="text-lg font-semibold text-white mb-4">Create Custom Project</h4>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Project Name */}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Project Name *
                </label>
                <input
                  type="text"
                  value={customProject.name}
                  onChange={(e) => setCustomProject({...customProject, name: e.target.value})}
                  placeholder="Enter project name..."
                  className="w-full p-3 bg-gray-600 text-white rounded-lg border border-gray-500 focus:border-blue-500 focus:outline-none"
                />
              </div>

              {/* Resolution */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Resolution
                </label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    value={customProject.width}
                    onChange={(e) => setCustomProject({...customProject, width: Number(e.target.value)})}
                    placeholder="Width"
                    className="w-full p-3 bg-gray-600 text-white rounded-lg border border-gray-500 focus:border-blue-500 focus:outline-none"
                  />
                  <span className="text-gray-400 flex items-center">×</span>
                  <input
                    type="number"
                    value={customProject.height}
                    onChange={(e) => setCustomProject({...customProject, height: Number(e.target.value)})}
                    placeholder="Height"
                    className="w-full p-3 bg-gray-600 text-white rounded-lg border border-gray-500 focus:border-blue-500 focus:outline-none"
                  />
                </div>
                <div className="mt-2 flex flex-wrap gap-1">
                  <button
                    onClick={() => setCustomProject({...customProject, width: 1920, height: 1080})}
                    className="text-xs px-2 py-1 bg-gray-600 text-gray-300 rounded hover:bg-gray-500"
                  >
                    1920×1080
                  </button>
                  <button
                    onClick={() => setCustomProject({...customProject, width: 1080, height: 1080})}
                    className="text-xs px-2 py-1 bg-gray-600 text-gray-300 rounded hover:bg-gray-500"
                  >
                    1080×1080
                  </button>
                  <button
                    onClick={() => setCustomProject({...customProject, width: 1080, height: 1920})}
                    className="text-xs px-2 py-1 bg-gray-600 text-gray-300 rounded hover:bg-gray-500"
                  >
                    1080×1920
                  </button>
                </div>
              </div>

              {/* Duration */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Duration (seconds)
                </label>
                <input
                  type="number"
                  value={customProject.duration}
                  onChange={(e) => setCustomProject({...customProject, duration: Number(e.target.value)})}
                  min="1"
                  max="600"
                  className="w-full p-3 bg-gray-600 text-white rounded-lg border border-gray-500 focus:border-blue-500 focus:outline-none"
                />
              </div>

              {/* Frame Rate */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Frame Rate (FPS)
                </label>
                <select
                  value={customProject.fps}
                  onChange={(e) => setCustomProject({...customProject, fps: Number(e.target.value)})}
                  className="w-full p-3 bg-gray-600 text-white rounded-lg border border-gray-500 focus:border-blue-500 focus:outline-none"
                >
                  <option value={24}>24 fps (Cinematic)</option>
                  <option value={30}>30 fps (Standard)</option>
                  <option value={60}>60 fps (Smooth)</option>
                </select>
              </div>

              {/* Background Color */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Background Color
                </label>
                <div className="flex gap-2">
                  <input
                    type="color"
                    value={customProject.backgroundColor}
                    onChange={(e) => setCustomProject({...customProject, backgroundColor: e.target.value})}
                    className="w-16 h-12 bg-gray-600 rounded-lg border border-gray-500 cursor-pointer"
                  />
                  <input
                    type="text"
                    value={customProject.backgroundColor}
                    onChange={(e) => setCustomProject({...customProject, backgroundColor: e.target.value})}
                    placeholder="#ffffff"
                    className="flex-1 p-3 bg-gray-600 text-white rounded-lg border border-gray-500 focus:border-blue-500 focus:outline-none"
                  />
                </div>
              </div>
            </div>

            <div className="mt-6 flex gap-3">
              <button
                onClick={createCustomProject}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
              >
                Create Project
              </button>
              <button
                onClick={() => setSelectedCategory('all')}
                className="px-6 py-3 bg-gray-600 text-gray-300 rounded-lg hover:bg-gray-500 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Templates Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredTemplates.map((template) => (
            <div
              key={template.id}
              className="bg-gray-700 hover:bg-gray-600 rounded-lg p-4 transition-colors cursor-pointer group"
              onClick={() => createProjectFromTemplate(template)}
            >
              <div className="text-center mb-3">
                <div className="text-4xl mb-2">{template.thumbnail}</div>
                <h4 className="text-lg font-medium text-white group-hover:text-blue-300">
                  {template.name}
                </h4>
              </div>
              
              <p className="text-sm text-gray-400 mb-4 line-clamp-3">
                {template.description}
              </p>
              
              <div className="space-y-2">
                <div className="flex justify-between text-xs text-gray-500">
                  <span>Resolution:</span>
                  <span>{template.settings.width}×{template.settings.height}</span>
                </div>
                <div className="flex justify-between text-xs text-gray-500">
                  <span>Duration:</span>
                  <span>{template.settings.duration}s</span>
                </div>
                <div className="flex justify-between text-xs text-gray-500">
                  <span>Objects:</span>
                  <span>{template.objects.length}</span>
                </div>
              </div>
              
              <div className="mt-4 pt-3 border-t border-gray-600 opacity-0 group-hover:opacity-100 transition-opacity">
                <div className="text-sm text-blue-400 text-center">
                  Click to create project
                </div>
              </div>
            </div>
          ))}
        </div>

        {filteredTemplates.length === 0 && (
          <div className="text-center text-gray-400 py-12">
            <div className="text-4xl mb-4">📂</div>
            <div className="text-lg">No templates in this category</div>
            <div className="text-sm">Try selecting a different category</div>
          </div>
        )}
      </div>

      {/* Project Name Dialog in a draggable/resizable popup */}
      {showNameDialog && (
        <AssetLibraryPopup
          isOpen={showNameDialog}
          onClose={() => { setShowNameDialog(false); }}
          title="Name Your Project"
          initialX={Math.max(0, Math.floor((typeof window !== 'undefined' ? window.innerWidth : 1024) / 2 - 480 / 2))}
          initialY={Math.max(0, Math.floor((typeof window !== 'undefined' ? window.innerHeight : 768) / 2 - 360 / 2))}
          initialWidth={480}
          initialHeight={360}
          minWidth={360}
          minHeight={280}
          footerText="Drag header to move • Drag edges to resize • ESC to close"
        >
          <div className="p-4 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Project Name *</label>
              <input
                type="text"
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                placeholder="Enter project name"
                className="w-full p-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-blue-500"
                autoFocus
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Description (Optional)</label>
              <textarea
                value={projectDescription}
                onChange={(e) => setProjectDescription(e.target.value)}
                placeholder="Brief description of your project"
                rows={3}
                className="w-full p-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-blue-500 resize-vertical"
              />
            </div>
            <div className="flex items-center">
              <input
                type="checkbox"
                id="saveToLibrary"
                checked={saveToLibrary}
                onChange={(e) => setSaveToLibrary(e.target.checked)}
                className="mr-2"
              />
              <label htmlFor="saveToLibrary" className="text-sm text-gray-300">Save to project library</label>
            </div>
            <div className="flex gap-3 pt-2">
              <button
                onClick={() => { setShowNameDialog(false); }}
                className="flex-1 px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={createProjectWithName}
                disabled={!projectName.trim()}
                className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
              >
                Create Project
              </button>
            </div>
          </div>
        </AssetLibraryPopup>
      )}
    </div>
  );
};

export default ProjectTemplates;
