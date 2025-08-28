import React from 'react';
import { useAppStore } from '../store/appStore';
import EnhancedShapeLibrary from './EnhancedShapeLibrary';
import EnhancedIconLibrary from './EnhancedIconLibrary';
import EnhancedHandLibrary from './EnhancedHandLibrary';
import EnhancedCharacterLibrary from './EnhancedCharacterLibrary';
import EnhancedPropsLibrary from './EnhancedPropsLibrary';
import EnhancedTextLibrary from './EnhancedTextLibrary';
import CustomAssets from './CustomAssets';
import AudioManager from './AudioManager';
import AdvancedAudioEditor from './AdvancedAudioEditor';
import AnimationTemplates from './AnimationTemplates';
import SceneTemplates from './SceneTemplates';
import PluginSystem from './PluginSystem';
import CollaborationSystem from './CollaborationSystem';
import PerformanceAnalytics from './PerformanceAnalytics';
import AIAssistant from './AIAssistant';
import AssetLibraryPopup from './AssetLibraryPopup';
import { IconDefinition } from '../data/iconLibrary';
import SvgImporter from './SvgImporter';

interface AssetCategory {
  id: string;
  name: string;
  icon: string;
  color: string;
  description: string;
}

const AssetPanel: React.FC = () => {
  const [activeCategory, setActiveCategory] = React.useState<string>('shapes');
  const [expandedSections, setExpandedSections] = React.useState<Set<string>>(new Set(['basics']));
  const [openPopups, setOpenPopups] = React.useState<{[key: string]: boolean}>({
    shapes: false,
    icons: false,
    text: false,
    hands: false,
    characters: false,
    props: false,
    images: false,
  vectors: false,
    templates: false,
    sceneTemplates: false,
    plugins: false
  });
  
  const { addObject, currentProject, currentTime } = useAppStore();

  const assetCategories: AssetCategory[] = [
    // Basic Tools
    { id: 'shapes', name: 'Shapes', icon: '⬛', color: 'bg-blue-500', description: 'Basic geometric shapes' },
    { id: 'icons', name: 'Icons', icon: '😊', color: 'bg-yellow-500', description: 'Unicode icons & symbols' },
    { id: 'text', name: 'Text', icon: 'T', color: 'bg-green-500', description: 'Text and typography' },
    
    // Visual Assets
    { id: 'hands', name: 'Hands', icon: '✋', color: 'bg-orange-500', description: 'Hand gestures' },
    { id: 'characters', name: 'Characters', icon: '👤', color: 'bg-purple-500', description: 'People & avatars' },
    { id: 'props', name: 'Props', icon: '🎭', color: 'bg-pink-500', description: 'Objects & icons' },
    { id: 'images', name: 'Images', icon: '🖼️', color: 'bg-indigo-500', description: 'Custom uploads' },
  { id: 'vectors', name: 'Vectors', icon: '🧩', color: 'bg-emerald-600', description: 'SVG import & tracing' },
    
    // Audio Tools
    { id: 'audio', name: 'Audio', icon: '🎵', color: 'bg-red-500', description: 'Basic audio' },
    { id: 'advancedAudio', name: 'Pro Audio', icon: '🎛️', color: 'bg-red-600', description: 'Advanced editing' },
    
    // Templates & Effects
    { id: 'templates', name: 'Animations', icon: '⚡', color: 'bg-yellow-500', description: 'Pre-built animations' },
    { id: 'sceneTemplates', name: 'Scenes', icon: '🎬', color: 'bg-cyan-500', description: 'Scene layouts' },
    { id: 'plugins', name: 'Effects', icon: '✨', color: 'bg-violet-500', description: 'Visual effects' },
    
    // Advanced Tools
    { id: 'collaborate', name: 'Collaborate', icon: '👥', color: 'bg-teal-500', description: 'Team tools' },
    { id: 'analytics', name: 'Analytics', icon: '📊', color: 'bg-gray-500', description: 'Performance data' },
    { id: 'ai', name: 'AI Assistant', icon: '🤖', color: 'bg-emerald-500', description: 'AI-powered tools' }
  ];

  const categoryGroups = {
    basics: { name: 'Basic Tools', categories: ['shapes', 'icons', 'text'] },
  assets: { name: 'Visual Assets', categories: ['hands', 'characters', 'props', 'images', 'vectors'] },
    audio: { name: 'Audio Tools', categories: ['audio', 'advancedAudio'] },
    templates: { name: 'Templates & Effects', categories: ['templates', 'sceneTemplates', 'plugins'] },
    advanced: { name: 'Advanced Tools', categories: ['collaborate', 'analytics', 'ai'] }
  };

  const toggleSection = (sectionId: string) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(sectionId)) {
      newExpanded.delete(sectionId);
    } else {
      newExpanded.add(sectionId);
    }
    setExpandedSections(newExpanded);
  };

  const addIconToCanvas = (icon: IconDefinition) => {
    if (!currentProject) {
      alert('Please create a project first');
      return;
    }

    const iconObj = {
      id: `icon-${Date.now()}`,
      type: 'text' as const, // Icons are rendered as text with unicode
      x: 200,
      y: 200,
      width: 100,
      height: 100,
      properties: {
        text: icon.unicode,
        fontSize: 48,
        fill: '#333333',
        fontFamily: 'Arial'
      },
      animationStart: currentTime,
      animationDuration: 5,
      animationType: 'none' as const,
      animationEasing: 'easeOut' as const
    };

    addObject(iconObj);
  };

  const openPopup = (category: string) => {
    setOpenPopups(prev => ({ ...prev, [category]: true }));
  };

  const closePopup = (category: string) => {
    setOpenPopups(prev => ({ ...prev, [category]: false }));
  };

  const activeAssetCategory = assetCategories.find(cat => cat.id === activeCategory);

  return (
    <div className="h-full flex flex-col bg-gray-900">
      {/* Header */}
      <div className="p-4 border-b border-gray-700 bg-gray-800">
        <h2 className="text-lg font-bold text-white mb-1">Asset Library</h2>
        <p className="text-xs text-gray-400">Choose tools and assets for your animation</p>
      </div>
      
      {/* Category Navigation */}
      <div className="flex-1 overflow-y-auto">
        {Object.entries(categoryGroups).map(([groupId, group]) => (
          <div key={groupId} className="border-b border-gray-700">
            <button
              className="w-full p-3 text-left flex items-center justify-between hover:bg-gray-700 transition-colors bg-gray-800 border-b border-gray-600"
              onClick={() => toggleSection(groupId)}
            >
              <span className="text-sm font-semibold text-white">{group.name}</span>
              <span className={`text-white transform transition-transform ${expandedSections.has(groupId) ? 'rotate-90' : ''}`}>
                ▶
              </span>
            </button>
            
            {expandedSections.has(groupId) && (
              <div className="bg-gray-800">
                {group.categories.map(categoryId => {
                  const category = assetCategories.find(cat => cat.id === categoryId);
                  if (!category) return null;
                  
                  return (
                    <button
                      key={categoryId}
                      className={`w-full p-3 text-left flex items-center space-x-3 hover:bg-gray-600 transition-all border-l-4 ${
                        activeCategory === categoryId ? 'bg-blue-600 hover:bg-blue-700 border-blue-400' : 'bg-gray-700 border-gray-700 hover:border-gray-500'
                      }`}
                      onClick={() => setActiveCategory(categoryId)}
                    >
                      <div className={`w-8 h-8 rounded-lg ${category.color} flex items-center justify-center text-white text-sm font-bold shadow-lg`}>
                        {category.icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-white truncate">{category.name}</div>
                        <div className="text-xs text-gray-300 truncate">{category.description}</div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Content Section */}
      <div className="border-t border-gray-700 bg-gray-800">
        <div className="p-4">
          <div className="flex items-center space-x-3 mb-3">
            <div className={`w-10 h-10 rounded-lg ${activeAssetCategory?.color || 'bg-gray-600'} flex items-center justify-center text-white font-bold shadow-lg`}>
              {activeAssetCategory?.icon || '?'}
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">{activeAssetCategory?.name || 'Select Category'}</h3>
              <p className="text-sm text-gray-300">{activeAssetCategory?.description || 'Choose a category from above'}</p>
            </div>
          </div>
        </div>

  <div className="max-h-80 overflow-y-auto px-4 pb-4">
          {activeCategory === 'text' ? (
            <div className="space-y-4">
              <button
                onClick={() => openPopup('text')}
                className="asset-button-text w-full p-6 rounded-lg transition-all transform hover:scale-105 shadow-lg font-semibold"
                style={{ 
                  background: 'linear-gradient(135deg, #059669, #10B981)',
                  color: 'white',
                  border: '2px solid #374151'
                }}
              >
                <div className="text-xl font-bold mb-2" style={{ color: 'white !important' }}>📝 Open Text Library</div>
                <div className="text-sm mb-1" style={{ color: 'rgba(255, 255, 255, 0.9) !important' }}>Browse professional text styles and typography templates</div>
                <div className="text-xs" style={{ color: 'rgba(255, 255, 255, 0.75) !important' }}>• Professional Quality • Easy Integration • Instant Preview</div>
              </button>
              
              <div className="grid grid-cols-1 gap-3">
                <div className="p-3 bg-gray-700 rounded-lg border border-gray-600">
                  <div className="text-sm font-medium text-white mb-2">Text Styles</div>
                  <div className="space-y-1 text-xs text-gray-300">
                    <div>• Headings & Titles</div>
                    <div>• Body & Paragraph</div>
                    <div>• Emphasis & Highlights</div>
                  </div>
                </div>
                <div className="p-3 bg-gray-700 rounded-lg border border-gray-600">
                  <div className="text-sm font-medium text-white mb-2">Special Types</div>
                  <div className="space-y-1 text-xs text-gray-300">
                    <div>• Interactive & CTAs</div>
                    <div>• Quotes & Testimonials</div>
                    <div>• Numbers & Statistics</div>
                  </div>
                </div>
              </div>
            </div>
          ) : activeCategory === 'shapes' ? (
            <div className="space-y-4">
              <button
                onClick={() => openPopup('shapes')}
                className="asset-button-text w-full p-6 rounded-lg transition-all transform hover:scale-105 shadow-lg font-semibold"
                style={{ 
                  background: 'linear-gradient(135deg, #1E40AF, #3B82F6)',
                  color: 'white !important',
                  border: '2px solid #374151'
                }}
              >
                <div className="text-xl font-bold mb-2" style={{ color: 'white !important' }}>🔷 Open Shape Library</div>
                <div className="text-sm mb-1" style={{ color: 'rgba(255, 255, 255, 0.9) !important' }}>Browse 70+ geometric shapes, symbols, and more</div>
                <div className="text-xs" style={{ color: 'rgba(255, 255, 255, 0.75) !important' }}>• 6 Collections • Search & Filter • Professional Tools</div>
              </button>
              
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="p-3 bg-gray-700 rounded-lg border border-gray-600">
                  <div className="text-white font-medium mb-2">✨ Collections</div>
                  <div className="space-y-1 text-gray-300">
                    <div>• Basic Shapes</div>
                    <div>• Advanced Forms</div>
                    <div>• Arrow Symbols</div>
                  </div>
                </div>
                <div className="p-3 bg-gray-700 rounded-lg border border-gray-600">
                  <div className="text-white font-medium mb-2">🎯 Features</div>
                  <div className="space-y-1 text-gray-300">
                    <div>• Instant Search</div>
                    <div>• Grid/List View</div>
                    <div>• One-Click Add</div>
                  </div>
                </div>
              </div>
            </div>
          ) : activeCategory === 'icons' ? (
            <div className="space-y-4">
              <button
                onClick={() => openPopup('icons')}
                className="asset-button-text w-full p-6 rounded-lg transition-all transform hover:scale-105 shadow-lg font-semibold"
                style={{ 
                  background: 'linear-gradient(135deg, #D97706, #F59E0B)',
                  color: 'white !important',
                  border: '2px solid #374151'
                }}
              >
                <div className="text-xl font-bold mb-2" style={{ color: 'white !important' }}>😊 Open Icon Library</div>
                <div className="text-sm mb-1" style={{ color: 'rgba(255, 255, 255, 0.9) !important' }}>Browse 100+ Unicode icons, emojis, and symbols</div>
                <div className="text-xs" style={{ color: 'rgba(255, 255, 255, 0.75) !important' }}>• 3 Collections • Perfect Scaling • Universal Support</div>
              </button>
              
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="p-3 bg-gray-700 rounded-lg border border-gray-600">
                  <div className="text-white font-medium mb-2">🎭 Categories</div>
                  <div className="space-y-1 text-gray-300">
                    <div>• Emojis & Faces</div>
                    <div>• Geometric Symbols</div>
                    <div>• Technical Icons</div>
                  </div>
                </div>
                <div className="p-3 bg-gray-700 rounded-lg border border-gray-600">
                  <div className="text-white font-medium mb-2">⚡ Benefits</div>
                  <div className="space-y-1 text-gray-300">
                    <div>• Scalable Quality</div>
                    <div>• Fast Loading</div>
                    <div>• Cross-Platform</div>
                  </div>
                </div>
              </div>
            </div>
          ) : activeCategory === 'hands' || activeCategory === 'characters' || activeCategory === 'props' ? (
            <div className="space-y-4">
              <button
                onClick={() => openPopup(activeCategory)}
                className={`asset-button-text w-full p-6 rounded-lg transition-all transform hover:scale-105 shadow-lg font-semibold`}
                style={{ 
                  background: (
                    activeCategory === 'hands'
                      ? 'linear-gradient(135deg, #EA580C, #F97316)'
                      : activeCategory === 'characters'
                      ? 'linear-gradient(135deg, #7C3AED, #8B5CF6)'
                      : 'linear-gradient(135deg, #BE185D, #DB2777)'
                  ),
                  color: 'white',
                  border: '2px solid #374151'
                }}
              >
                <div className="text-xl font-bold mb-2" style={{ color: 'white !important' }}>
                  {activeCategory === 'hands' ? '✋ Open Hand Library' :
                   activeCategory === 'characters' ? '👤 Open Character Library' :
                   '🎭 Open Props Library'}
                </div>
                <div className="text-sm mb-1" style={{ color: 'rgba(255, 255, 255, 0.9) !important' }}>
                  {activeCategory === 'hands' ? 'Browse hand gestures and poses for your animations' :
                   activeCategory === 'characters' ? 'Browse people, avatars, and character assets' :
                   'Browse objects, icons, and decorative elements'}
                </div>
                <div className="text-xs" style={{ color: 'rgba(255, 255, 255, 0.75) !important' }}>• Professional Quality • Easy Integration • Instant Preview</div>
              </button>
              
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="p-3 bg-gray-700 rounded-lg border border-gray-600">
                  <div className="text-white font-medium mb-2">📚 Content</div>
                  <div className="space-y-1 text-gray-300">
                    <div>• High Quality Assets</div>
                    <div>• Multiple Styles</div>
                    <div>• Ready to Use</div>
                  </div>
                </div>
                <div className="p-3 bg-gray-700 rounded-lg border border-gray-600">
                  <div className="text-white font-medium mb-2">⚡ Features</div>
                  <div className="space-y-1 text-gray-300">
                    <div>• Large Preview</div>
                    <div>• Easy Browse</div>
                    <div>• Quick Add</div>
                  </div>
                </div>
              </div>
            </div>
          ) : activeCategory === 'images' ? (
            <div className="space-y-4">
              <button
                onClick={() => openPopup('images')}
                className="asset-button-text w-full p-6 rounded-lg transition-all transform hover:scale-105 shadow-lg font-semibold"
                style={{ 
                  background: 'linear-gradient(135deg, #4338CA, #6366F1)',
                  color: 'white',
                  border: '2px solid #374151'
                }}
              >
                <div className="text-xl font-bold mb-2" style={{ color: 'white' }}>🖼️ Open Image Library</div>
                <div className="text-sm mb-1" style={{ color: 'rgba(255, 255, 255, 0.9)' }}>Import images, manage uploads, and add to canvas</div>
                <div className="text-xs" style={{ color: 'rgba(255, 255, 255, 0.75)' }}>• Upload • Search • Delete • One-click Add</div>
              </button>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="p-3 bg-gray-700 rounded-lg border border-gray-600">
                  <div className="text-white font-medium mb-2">📥 Supported</div>
                  <div className="space-y-1 text-gray-300">
                    <div>• JPG • PNG • GIF • SVG</div>
                    <div>• Max size: 5MB</div>
                    <div>• Local storage</div>
                  </div>
                </div>
                <div className="p-3 bg-gray-700 rounded-lg border border-gray-600">
                  <div className="text-white font-medium mb-2">✨ Tips</div>
                  <div className="space-y-1 text-gray-300">
                    <div>• Drag to canvas</div>
                    <div>• Use search</div>
                    <div>• Delete unused</div>
                  </div>
                </div>
              </div>
            </div>
          ) : activeCategory === 'vectors' ? (
            <div className="space-y-4">
              <button
                onClick={() => openPopup('vectors')}
                className="asset-button-text w-full p-6 rounded-lg transition-all transform hover:scale-105 shadow-lg font-semibold"
                style={{ 
                  background: 'linear-gradient(135deg, #065F46, #10B981)',
                  color: 'white',
                  border: '2px solid #374151'
                }}
              >
                <div className="text-xl font-bold mb-2" style={{ color: 'white' }}>🧩 Open Vector Importer</div>
                <div className="text-sm mb-1" style={{ color: 'rgba(255, 255, 255, 0.9)' }}>Import SVG files or paste path data</div>
                <div className="text-xs" style={{ color: 'rgba(255, 255, 255, 0.75)' }}>• SVG → Canvas • Multi-path • Draw animation</div>
              </button>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="p-3 bg-gray-700 rounded-lg border border-gray-600">
                  <div className="text-white font-medium mb-2">📥 Sources</div>
                  <div className="space-y-1 text-gray-300">
                    <div>• Upload .svg</div>
                    <div>• Paste path d</div>
                    <div>• Trace (soon)</div>
                  </div>
                </div>
                <div className="p-3 bg-gray-700 rounded-lg border border-gray-600">
                  <div className="text-white font-medium mb-2">✨ Benefits</div>
                  <div className="space-y-1 text-gray-300">
                    <div>• Crisp at any size</div>
                    <div>• Animate strokes</div>
                    <div>• Easy styling</div>
                  </div>
                </div>
              </div>
            </div>
          ) : activeCategory === 'templates' ? (
            <div className="space-y-4">
              <button
                onClick={() => openPopup('templates')}
                className="asset-button-text w-full p-6 rounded-lg transition-all transform hover:scale-105 shadow-lg font-semibold"
                style={{ 
                  background: 'linear-gradient(135deg, #D97706, #F59E0B)',
                  color: 'white',
                  border: '2px solid #374151'
                }}
              >
                <div className="text-xl font-bold mb-2" style={{ color: 'white' }}>⚡ Open Animation Library</div>
                <div className="text-sm mb-1" style={{ color: 'rgba(255, 255, 255, 0.9)' }}>Browse pre-built animation templates and effects</div>
                <div className="text-xs" style={{ color: 'rgba(255, 255, 255, 0.75)' }}>• Ready-to-Use • Professional • Multiple Categories</div>
              </button>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="p-3 bg-gray-700 rounded-lg border border-gray-600">
                  <div className="text-white font-medium mb-2">🎬 Categories</div>
                  <div className="space-y-1 text-gray-300">
                    <div>• Intro & Outro</div>
                    <div>• Transitions</div>
                    <div>• Emphasis Effects</div>
                  </div>
                </div>
                <div className="p-3 bg-gray-700 rounded-lg border border-gray-600">
                  <div className="text-white font-medium mb-2">✨ Features</div>
                  <div className="space-y-1 text-gray-300">
                    <div>• One-click Apply</div>
                    <div>• Customizable</div>
                    <div>• Professional Quality</div>
                  </div>
                </div>
              </div>
            </div>
          ) : activeCategory === 'sceneTemplates' ? (
            <div className="space-y-4">
              <button
                onClick={() => openPopup('sceneTemplates')}
                className="asset-button-text w-full p-6 rounded-lg transition-all transform hover:scale-105 shadow-lg font-semibold"
                style={{ 
                  background: 'linear-gradient(135deg, #0891B2, #06B6D4)',
                  color: 'white',
                  border: '2px solid #374151'
                }}
              >
                <div className="text-xl font-bold mb-2" style={{ color: 'white' }}>🎬 Open Scene Library</div>
                <div className="text-sm mb-1" style={{ color: 'rgba(255, 255, 255, 0.9)' }}>Browse complete scene layouts and templates</div>
                <div className="text-xs" style={{ color: 'rgba(255, 255, 255, 0.75)' }}>• Business • Education • Marketing • Entertainment</div>
              </button>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="p-3 bg-gray-700 rounded-lg border border-gray-600">
                  <div className="text-white font-medium mb-2">📋 Types</div>
                  <div className="space-y-1 text-gray-300">
                    <div>• Corporate Intro</div>
                    <div>• Product Demo</div>
                    <div>• Educational</div>
                  </div>
                </div>
                <div className="p-3 bg-gray-700 rounded-lg border border-gray-600">
                  <div className="text-white font-medium mb-2">⚡ Quick Start</div>
                  <div className="space-y-1 text-gray-300">
                    <div>• Pre-configured</div>
                    <div>• Easy Customization</div>
                    <div>• Multiple Durations</div>
                  </div>
                </div>
              </div>
            </div>
          ) : activeCategory === 'plugins' ? (
            <div className="space-y-4">
              <button
                onClick={() => openPopup('plugins')}
                className="asset-button-text w-full p-6 rounded-lg transition-all transform hover:scale-105 shadow-lg font-semibold"
                style={{ 
                  background: 'linear-gradient(135deg, #7C3AED, #A855F7)',
                  color: 'white',
                  border: '2px solid #374151'
                }}
              >
                <div className="text-xl font-bold mb-2" style={{ color: 'white' }}>✨ Open Effects Library</div>
                <div className="text-sm mb-1" style={{ color: 'rgba(255, 255, 255, 0.9)' }}>Browse visual effects, filters, and enhancements</div>
                <div className="text-xs" style={{ color: 'rgba(255, 255, 255, 0.75)' }}>• Visual Effects • Filters • Transitions • Particles</div>
              </button>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="p-3 bg-gray-700 rounded-lg border border-gray-600">
                  <div className="text-white font-medium mb-2">🎨 Effects</div>
                  <div className="space-y-1 text-gray-300">
                    <div>• Particle Systems</div>
                    <div>• Color Filters</div>
                    <div>• Motion Blur</div>
                  </div>
                </div>
                <div className="p-3 bg-gray-700 rounded-lg border border-gray-600">
                  <div className="text-white font-medium mb-2">🔧 Tools</div>
                  <div className="space-y-1 text-gray-300">
                    <div>• Plugin Manager</div>
                    <div>• Custom Effects</div>
                    <div>• Real-time Preview</div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-gray-900 rounded-lg p-2">
              {activeCategory === 'audio' && <AudioManager />}
              {activeCategory === 'advancedAudio' && <AdvancedAudioEditor />}
              {activeCategory === 'collaborate' && <CollaborationSystem />}
              {activeCategory === 'analytics' && <PerformanceAnalytics />}
              {activeCategory === 'ai' && <AIAssistant />}
            </div>
          )}
        </div>
      </div>

      {/* Popups */}
      <AssetLibraryPopup
        isOpen={openPopups.shapes}
        onClose={() => closePopup('shapes')}
        title="Shape Library - 70+ Professional Shapes"
      >
        <EnhancedShapeLibrary />
      </AssetLibraryPopup>

      <AssetLibraryPopup
        isOpen={openPopups.icons}
        onClose={() => closePopup('icons')}
        title="Icon Library - 100+ Unicode Symbols"
      >
        <EnhancedIconLibrary onIconSelect={(icon) => {
          addIconToCanvas(icon);
          closePopup('icons');
        }} />
      </AssetLibraryPopup>

      <AssetLibraryPopup
        isOpen={openPopups.text}
        onClose={() => closePopup('text')}
        title="Text Templates - Professional Typography"
      >
        <EnhancedTextLibrary />
      </AssetLibraryPopup>

      <AssetLibraryPopup
        isOpen={openPopups.hands}
        onClose={() => closePopup('hands')}
        title="Hand Gestures Library - Multiple Skin Tones"
      >
        <EnhancedHandLibrary />
      </AssetLibraryPopup>

      <AssetLibraryPopup
        isOpen={openPopups.characters}
        onClose={() => closePopup('characters')}
        title="Character & People Library - Diverse Assets"
      >
        <EnhancedCharacterLibrary />
      </AssetLibraryPopup>

      <AssetLibraryPopup
        isOpen={openPopups.props}
        onClose={() => closePopup('props')}
        title="Props & Objects Library - Professional Assets"
      >
        <EnhancedPropsLibrary />
      </AssetLibraryPopup>

      <AssetLibraryPopup
        isOpen={openPopups.images}
        onClose={() => closePopup('images')}
        title="Image Library - Import and Manage"
      >
        <div style={{ height: '100%', backgroundColor: '#111827', color: 'white', display: 'flex', flexDirection: 'column' }}>
          <div style={{ padding: 12, borderBottom: '1px solid #374151', flexShrink: 0 }}>
            <div style={{ fontWeight: 700 }}>🖼️ Image Library</div>
            <div style={{ fontSize: 12, color: '#9CA3AF' }}>Upload, search, and add images to your canvas</div>
          </div>
          <div style={{ flex: 1, minHeight: 0, overflow: 'auto' }}>
            <div className="p-3">
              <CustomAssets />
            </div>
          </div>
        </div>
      </AssetLibraryPopup>

      <AssetLibraryPopup
        isOpen={openPopups.vectors}
        onClose={() => closePopup('vectors')}
        title="Vector Import - SVG to Paths"
      >
        <SvgImporter />
      </AssetLibraryPopup>

      <AssetLibraryPopup
        isOpen={openPopups.templates}
        onClose={() => closePopup('templates')}
        title="Animation Templates - Professional Effects"
      >
        <AnimationTemplates />
      </AssetLibraryPopup>

      <AssetLibraryPopup
        isOpen={openPopups.sceneTemplates}
        onClose={() => closePopup('sceneTemplates')}
        title="Scene Templates - Complete Layouts"
      >
        <SceneTemplates />
      </AssetLibraryPopup>

      <AssetLibraryPopup
        isOpen={openPopups.plugins}
        onClose={() => closePopup('plugins')}
        title="Effects & Plugins - Visual Enhancements"
      >
        <PluginSystem />
      </AssetLibraryPopup>
    </div>
  );
};

export default AssetPanel;