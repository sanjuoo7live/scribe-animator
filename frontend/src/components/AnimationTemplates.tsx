import React, { useState } from 'react';
import { useAppStore } from '../store/appStore';

interface AnimationTemplate {
  id: string;
  name: string;
  description: string;
  category: 'intro' | 'transition' | 'outro' | 'emphasis' | 'presentation';
  preview: string;
  objects: any[];
  duration: number;
  thumbnail: string;
}

const AnimationTemplates: React.FC = () => {
  const { addObject, currentProject } = useAppStore();
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  // Pre-built animation templates
  const templates: AnimationTemplate[] = [
    {
      id: 'title-entrance',
      name: 'Title Entrance',
      description: 'Animated title with scaling and fade effect',
      category: 'intro',
      preview: '📝 Scale + Fade',
      duration: 3,
      thumbnail: '🎬',
      objects: [
        {
          type: 'text',
          properties: {
            text: 'Your Title Here',
            fontSize: 48,
            fill: '#2563eb',
            fontFamily: 'Arial'
          },
          animationType: 'scaleIn',
          animationDuration: 2,
          animationEasing: 'easeOut'
        }
      ]
    },
    {
      id: 'slide-presentation',
      name: 'Slide Presentation',
      description: 'Clean slide-in animation for presentations',
      category: 'presentation',
      preview: '➡️ Slide In',
      duration: 2,
      thumbnail: '📊',
      objects: [
        {
          type: 'shape',
          properties: {
            shapeType: 'rectangle',
            fill: '#f3f4f6',
            stroke: '#d1d5db',
            strokeWidth: 2
          },
          width: 400,
          height: 300,
          animationType: 'slideIn',
          animationDuration: 1.5,
          animationEasing: 'easeOut'
        },
        {
          type: 'text',
          properties: {
            text: 'Slide Content',
            fontSize: 24,
            fill: '#374151',
            fontFamily: 'Arial'
          },
          animationType: 'fadeIn',
          animationDuration: 1,
          animationEasing: 'easeOut',
          animationStart: 0.5
        }
      ]
    },
    {
      id: 'hand-pointer',
      name: 'Hand Pointer',
      description: 'Animated hand pointing to elements',
      category: 'emphasis',
      preview: '👉 Point & Draw',
      duration: 2.5,
      thumbnail: '👆',
      objects: [
        {
          type: 'image',
          properties: {
            src: '👉🏻',
            alt: 'Pointing Hand',
            assetType: 'hand'
          },
          width: 80,
          height: 80,
          animationType: 'slideIn',
          animationDuration: 1,
          animationEasing: 'easeOut'
        }
      ]
    },
    {
      id: 'number-countdown',
      name: 'Number Countdown',
      description: '3-2-1 countdown animation',
      category: 'intro',
      preview: '3️⃣2️⃣1️⃣ Count',
      duration: 4,
      thumbnail: '🔢',
      objects: [
        {
          type: 'text',
          properties: {
            text: '3',
            fontSize: 72,
            fill: '#dc2626',
            fontFamily: 'Arial'
          },
          animationType: 'scaleIn',
          animationDuration: 0.8,
          animationEasing: 'easeOut',
          animationStart: 0
        },
        {
          type: 'text',
          properties: {
            text: '2',
            fontSize: 72,
            fill: '#ea580c',
            fontFamily: 'Arial'
          },
          animationType: 'scaleIn',
          animationDuration: 0.8,
          animationEasing: 'easeOut',
          animationStart: 1
        },
        {
          type: 'text',
          properties: {
            text: '1',
            fontSize: 72,
            fill: '#16a34a',
            fontFamily: 'Arial'
          },
          animationType: 'scaleIn',
          animationDuration: 0.8,
          animationEasing: 'easeOut',
          animationStart: 2
        }
      ]
    },
    {
      id: 'arrow-flow',
      name: 'Arrow Flow',
      description: 'Sequential arrow animation for processes',
      category: 'transition',
      preview: '➡️ Process Flow',
      duration: 3,
      thumbnail: '🔄',
      objects: [
        {
          type: 'shape',
          properties: {
            shapeType: 'circle',
            fill: '#3b82f6',
            stroke: '#1d4ed8',
            strokeWidth: 2
          },
          width: 60,
          height: 60,
          x: 100,
          y: 200,
          animationType: 'scaleIn',
          animationDuration: 0.5,
          animationEasing: 'easeOut'
        },
        {
          type: 'image',
          properties: {
            src: '➡️',
            alt: 'Arrow',
            assetType: 'shape'
          },
          width: 60,
          height: 30,
          x: 200,
          y: 215,
          animationType: 'slideIn',
          animationDuration: 0.5,
          animationEasing: 'easeOut',
          animationStart: 0.5
        },
        {
          type: 'shape',
          properties: {
            shapeType: 'circle',
            fill: '#10b981',
            stroke: '#059669',
            strokeWidth: 2
          },
          width: 60,
          height: 60,
          x: 300,
          y: 200,
          animationType: 'scaleIn',
          animationDuration: 0.5,
          animationEasing: 'easeOut',
          animationStart: 1
        }
      ]
    },
    {
      id: 'attention-pulse',
      name: 'Attention Pulse',
      description: 'Pulsing animation to draw attention',
      category: 'emphasis',
      preview: '💫 Pulse Effect',
      duration: 2,
      thumbnail: '⭐',
      objects: [
        {
          type: 'shape',
          properties: {
            shapeType: 'star',
            fill: '#fbbf24',
            stroke: '#f59e0b',
            strokeWidth: 3
          },
          width: 80,
          height: 80,
          animationType: 'scaleIn',
          animationDuration: 1,
          animationEasing: 'easeInOut'
        }
      ]
    },
    {
      id: 'thank-you-outro',
      name: 'Thank You Outro',
      description: 'Professional ending with thank you message',
      category: 'outro',
      preview: '🙏 Thank You',
      duration: 3,
      thumbnail: '🎉',
      objects: [
        {
          type: 'text',
          properties: {
            text: 'Thank You!',
            fontSize: 42,
            fill: '#7c3aed',
            fontFamily: 'Arial'
          },
          animationType: 'fadeIn',
          animationDuration: 2,
          animationEasing: 'easeOut'
        },
        {
          type: 'text',
          properties: {
            text: 'Subscribe for more content',
            fontSize: 18,
            fill: '#6b7280',
            fontFamily: 'Arial'
          },
          y: 60,
          animationType: 'slideIn',
          animationDuration: 1.5,
          animationEasing: 'easeOut',
          animationStart: 1
        }
      ]
    }
  ];

  const categories = [
    { id: 'all', name: 'All Templates', icon: '📁' },
    { id: 'intro', name: 'Intros', icon: '🎬' },
    { id: 'presentation', name: 'Presentations', icon: '📊' },
    { id: 'transition', name: 'Transitions', icon: '🔄' },
    { id: 'emphasis', name: 'Emphasis', icon: '⭐' },
    { id: 'outro', name: 'Outros', icon: '🎉' }
  ];

  const applyTemplate = (template: AnimationTemplate) => {
    if (!currentProject) {
      alert('Please create a project first');
      return;
    }

    const baseTime = Math.max(0, (currentProject.objects.length * 0.5)); // Stagger templates

    template.objects.forEach((templateObj, index) => {
      const newObject = {
        id: `template-${template.id}-${Date.now()}-${index}`,
        type: templateObj.type as 'shape' | 'text' | 'image',
        x: templateObj.x || (200 + Math.random() * 100),
        y: templateObj.y || (200 + Math.random() * 100),
        width: templateObj.width || 100,
        height: templateObj.height || 100,
        properties: { ...templateObj.properties },
        animationStart: baseTime + (templateObj.animationStart || 0),
        animationDuration: templateObj.animationDuration || 2,
        animationType: templateObj.animationType || 'fadeIn',
        animationEasing: templateObj.animationEasing || 'easeOut'
      };

      addObject(newObject);
    });

    // Success feedback
    const notification = document.createElement('div');
    notification.className = 'fixed top-4 right-4 bg-green-600 text-white px-4 py-2 rounded shadow-lg z-50';
    notification.textContent = `Applied "${template.name}" template!`;
    document.body.appendChild(notification);
    setTimeout(() => document.body.removeChild(notification), 3000);
  };

  const filteredTemplates = selectedCategory === 'all' 
    ? templates 
    : templates.filter(t => t.category === selectedCategory);

  return (
    <div className="h-full">
      <h4 className="text-sm font-semibold text-gray-300 mb-4">Animation Templates</h4>
      
      {/* Category Filter */}
      <div className="mb-4">
        <div className="flex flex-wrap gap-1">
          {categories.map((category) => (
            <button
              key={category.id}
              onClick={() => setSelectedCategory(category.id)}
              className={`px-2 py-1 rounded text-xs ${
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

      {/* Templates Grid */}
      <div className="grid grid-cols-1 gap-3 max-h-96 overflow-y-auto">
        {filteredTemplates.length === 0 ? (
          <div className="text-center text-gray-400 py-8">
            <div className="text-2xl mb-2">🎭</div>
            <div className="text-sm">No templates in this category</div>
          </div>
        ) : (
          filteredTemplates.map((template) => (
            <div
              key={template.id}
              className="bg-gray-700 hover:bg-gray-600 rounded-lg p-3 transition-colors cursor-pointer group"
              onClick={() => applyTemplate(template)}
            >
              <div className="flex items-start gap-3">
                <div className="text-2xl">{template.thumbnail}</div>
                <div className="flex-1 min-w-0">
                  <h5 className="text-sm font-medium text-white group-hover:text-blue-300">
                    {template.name}
                  </h5>
                  <p className="text-xs text-gray-400 mb-2 line-clamp-2">
                    {template.description}
                  </p>
                  <div className="flex items-center justify-between">
                    <div className="text-xs text-gray-500">
                      {template.preview}
                    </div>
                    <div className="text-xs text-gray-500">
                      {template.duration}s • {template.objects.length} objects
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="mt-2 pt-2 border-t border-gray-600 opacity-0 group-hover:opacity-100 transition-opacity">
                <div className="text-xs text-blue-400">
                  Click to apply template to canvas
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Template Info */}
      <div className="mt-4 pt-4 border-t border-gray-600">
        <div className="text-xs text-gray-400">
          <div>{filteredTemplates.length} templates available</div>
          <div className="mt-1">Templates add objects to your current timeline</div>
        </div>
      </div>
    </div>
  );
};

export default AnimationTemplates;
