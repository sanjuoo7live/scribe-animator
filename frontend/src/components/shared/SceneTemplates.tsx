import React, { useState } from 'react';
import { useAppStore } from '../../store/appStore';
import './SceneTemplates.css';

interface SceneTemplate {
  id: string;
  name: string;
  description: string;
  category: 'business' | 'education' | 'entertainment' | 'marketing' | 'explainer';
  thumbnail: string;
  duration: number;
  objects: any[];
  previewUrl?: string;
  tags: string[];
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  isPopular?: boolean;
  isNew?: boolean;
}

const SceneTemplates: React.FC = () => {
  const { setProject, currentProject } = useAppStore();
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState<SceneTemplate | null>(null);
  const [showPreview, setShowPreview] = useState(false);

  const sceneTemplates: SceneTemplate[] = [
    {
      id: 'business-intro',
      name: 'Corporate Introduction',
      description: 'Professional company introduction with logo animation and key metrics',
      category: 'business',
      thumbnail: '🏢',
      duration: 15,
      objects: [
        { type: 'text', properties: { text: 'Company Name', fontSize: 48 } },
        { type: 'shape', properties: { fill: '#007bff' } },
        { type: 'text', properties: { text: 'Established 2020', fontSize: 24 } }
      ],
      tags: ['corporate', 'intro', 'professional'],
      difficulty: 'beginner',
      isPopular: true
    },
    {
      id: 'product-demo',
      name: 'Product Feature Demo',
      description: 'Showcase product features with animated callouts and highlights',
      category: 'marketing',
      thumbnail: '📱',
      duration: 20,
      objects: [
        { type: 'image', properties: { src: 'product-mockup' } },
        { type: 'text', properties: { text: 'New Features', fontSize: 36 } },
        { type: 'shape', properties: { fill: '#28a745' } }
      ],
      tags: ['product', 'demo', 'features'],
      difficulty: 'intermediate',
      isNew: true
    },
    {
      id: 'educational-lesson',
      name: 'Educational Lesson',
      description: 'Step-by-step learning content with interactive elements',
      category: 'education',
      thumbnail: '📚',
      duration: 30,
      objects: [
        { type: 'text', properties: { text: 'Lesson 1: Introduction', fontSize: 32 } },
        { type: 'shape', properties: { fill: '#ffc107' } },
        { type: 'text', properties: { text: 'Key Points', fontSize: 20 } }
      ],
      tags: ['education', 'lesson', 'learning'],
      difficulty: 'beginner'
    },
    {
      id: 'social-media-post',
      name: 'Social Media Announcement',
      description: 'Eye-catching social media content with trendy animations',
      category: 'marketing',
      thumbnail: '📢',
      duration: 10,
      objects: [
        { type: 'text', properties: { text: 'Big News!', fontSize: 40 } },
        { type: 'shape', properties: { fill: '#e91e63' } },
        { type: 'text', properties: { text: '@YourBrand', fontSize: 18 } }
      ],
      tags: ['social', 'announcement', 'trendy'],
      difficulty: 'beginner',
      isPopular: true
    },
    {
      id: 'explainer-video',
      name: 'Process Explainer',
      description: 'Complex process breakdown with step-by-step visualization',
      category: 'explainer',
      thumbnail: '🔄',
      duration: 45,
      objects: [
        { type: 'text', properties: { text: 'How It Works', fontSize: 36 } },
        { type: 'shape', properties: { fill: '#17a2b8' } },
        { type: 'text', properties: { text: 'Step 1', fontSize: 24 } }
      ],
      tags: ['process', 'explainer', 'tutorial'],
      difficulty: 'advanced'
    },
    {
      id: 'entertainment-intro',
      name: 'Entertainment Show Intro',
      description: 'Dynamic show introduction with music sync and visual effects',
      category: 'entertainment',
      thumbnail: '🎬',
      duration: 12,
      objects: [
        { type: 'text', properties: { text: 'SHOW TIME', fontSize: 48 } },
        { type: 'shape', properties: { fill: '#6f42c1' } },
        { type: 'text', properties: { text: 'Tonight at 8PM', fontSize: 20 } }
      ],
      tags: ['entertainment', 'show', 'intro'],
      difficulty: 'intermediate',
      isNew: true
    }
  ];

  const categories = [
    { id: 'all', name: 'All Templates', icon: '🎯' },
    { id: 'business', name: 'Business', icon: '🏢' },
    { id: 'education', name: 'Education', icon: '📚' },
    { id: 'entertainment', name: 'Entertainment', icon: '🎬' },
    { id: 'marketing', name: 'Marketing', icon: '📢' },
    { id: 'explainer', name: 'Explainer', icon: '🔄' }
  ];

  const filteredTemplates = sceneTemplates.filter(template => {
    const matchesCategory = selectedCategory === 'all' || template.category === selectedCategory;
    const matchesSearch = template.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         template.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         template.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()));
    return matchesCategory && matchesSearch;
  });

  const handleTemplateSelect = (template: SceneTemplate) => {
    setSelectedTemplate(template);
    setShowPreview(true);
  };

  const applyTemplate = (template: SceneTemplate) => {
    const newProject = {
      id: `project-${Date.now()}`,
      name: template.name,
      width: 1920,
      height: 1080,
      fps: 30,
      duration: template.duration,
      objects: template.objects.map((obj, index) => ({
        id: `obj-${index}-${Date.now()}`,
        type: obj.type,
        x: 100 + (index * 50),
        y: 100 + (index * 50),
        width: 200,
        height: 100,
        properties: obj.properties,
        animationStart: index * 2,
        animationDuration: 3,
        animationType: 'fadeIn' as const,
        animationEasing: 'easeOut' as const
      })),
      backgroundColor: '#000000'
    };

    setProject(newProject);
    setShowPreview(false);
    alert(`Applied template: ${template.name}`);
  };

  const duplicateTemplate = (template: SceneTemplate) => {
    // In a real app, this would be added to a user's custom templates
    console.log(`Duplicating template: ${template.name}`);
    alert(`Template "${template.name}" duplicated to your custom templates!`);
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'beginner': return '#28a745';
      case 'intermediate': return '#ffc107';
      case 'advanced': return '#dc3545';
      default: return '#6c757d';
    }
  };

  return (
    <div className="scene-templates">
      <div className="templates-header">
        <h3>🎬 Scene Templates</h3>
        <div className="templates-stats">
          <span>{filteredTemplates.length} templates</span>
        </div>
      </div>

      <div className="templates-filters">
        <div className="search-filter">
          <input
            type="text"
            placeholder="Search templates..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
        </div>

        <div className="category-filter">
          {categories.map(category => (
            <button
              key={category.id}
              onClick={() => setSelectedCategory(category.id)}
              className={`category-btn ${selectedCategory === category.id ? 'active' : ''}`}
            >
              <span className="category-icon">{category.icon}</span>
              <span className="category-name">{category.name}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="templates-grid">
        {filteredTemplates.map(template => (
          <div key={template.id} className="template-card">
            <div className="template-thumbnail">
              <div className="thumbnail-content">
                <span className="thumbnail-icon">{template.thumbnail}</span>
                {template.isPopular && <div className="badge popular">Popular</div>}
                {template.isNew && <div className="badge new">New</div>}
              </div>
              <div className="template-overlay">
                <button
                  onClick={() => handleTemplateSelect(template)}
                  className="preview-btn"
                >
                  👁️ Preview
                </button>
              </div>
            </div>

            <div className="template-info">
              <div className="template-header">
                <h4>{template.name}</h4>
                <div 
                  className="difficulty-indicator"
                  style={{ backgroundColor: getDifficultyColor(template.difficulty) }}
                >
                  {template.difficulty}
                </div>
              </div>
              
              <p className="template-description">{template.description}</p>
              
              <div className="template-meta">
                <span className="duration">⏱️ {template.duration}s</span>
                <span className="objects-count">📦 {template.objects.length} objects</span>
              </div>

              <div className="template-tags">
                {template.tags.slice(0, 3).map(tag => (
                  <span key={tag} className="tag">#{tag}</span>
                ))}
              </div>

              <div className="template-actions">
                <button
                  onClick={() => applyTemplate(template)}
                  className="apply-btn"
                >
                  ✨ Use Template
                </button>
                <button
                  onClick={() => duplicateTemplate(template)}
                  className="duplicate-btn"
                >
                  📋 Copy
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Scroll hint for large lists */}
      {filteredTemplates.length > 6 && (
        <div style={{ 
          position: 'absolute', 
          bottom: '10px', 
          right: '20px', 
          background: 'rgba(0,0,0,0.7)', 
          color: 'white', 
          padding: '4px 8px', 
          borderRadius: '12px', 
          fontSize: '11px',
          pointerEvents: 'none'
        }}>
          ↕️ Scroll for more templates
        </div>
      )}

      {filteredTemplates.length === 0 && (
        <div className="no-templates">
          <div className="no-templates-icon">🔍</div>
          <h4>No templates found</h4>
          <p>Try adjusting your search or category filter</p>
        </div>
      )}

      {showPreview && selectedTemplate && (
        <div className="template-preview-modal">
          <div className="preview-modal-content">
            <div className="preview-header">
              <h3>{selectedTemplate.name}</h3>
              <button
                onClick={() => setShowPreview(false)}
                className="close-btn"
              >
                ✕
              </button>
            </div>

            <div className="preview-content">
              <div className="preview-thumbnail">
                <span className="preview-icon">{selectedTemplate.thumbnail}</span>
                <div className="preview-info">
                  <p>{selectedTemplate.description}</p>
                  <div className="preview-details">
                    <span>Duration: {selectedTemplate.duration}s</span>
                    <span>Objects: {selectedTemplate.objects.length}</span>
                    <span>Category: {selectedTemplate.category}</span>
                    <span 
                      className="difficulty"
                      style={{ color: getDifficultyColor(selectedTemplate.difficulty) }}
                    >
                      Difficulty: {selectedTemplate.difficulty}
                    </span>
                  </div>
                </div>
              </div>

              <div className="preview-objects">
                <h4>Template Objects:</h4>
                <div className="objects-list">
                  {selectedTemplate.objects.map((obj, index) => (
                    <div key={index} className="object-item">
                      <span className="object-type">{obj.type}</span>
                      <span className="object-props">
                        {obj.type === 'text' ? obj.properties.text : 
                         obj.type === 'shape' ? `Fill: ${obj.properties.fill}` :
                         'Properties configured'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="preview-actions">
              <button
                onClick={() => applyTemplate(selectedTemplate)}
                className="apply-preview-btn"
              >
                ✨ Apply This Template
              </button>
              <button
                onClick={() => duplicateTemplate(selectedTemplate)}
                className="duplicate-preview-btn"
              >
                📋 Duplicate Template
              </button>
            </div>
          </div>
        </div>
      )}

      {currentProject && (
        <div className="current-project-info">
          <h4>Current Project: {currentProject.name}</h4>
          <p>You can apply a new template to replace your current project, or duplicate a template to save it for later use.</p>
        </div>
      )}
    </div>
  );
};

export default SceneTemplates;
