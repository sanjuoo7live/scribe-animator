import React from 'react';
import { useAppStore } from '../store/appStore';
import AssetLibrary from './AssetLibrary';
import CustomAssets from './CustomAssets';
import AudioManager from './AudioManager';
import AdvancedAudioEditor from './AdvancedAudioEditor';
import AnimationTemplates from './AnimationTemplates';
import SceneTemplates from './SceneTemplates';
import PluginSystem from './PluginSystem';
import CollaborationSystem from './CollaborationSystem';
import PerformanceAnalytics from './PerformanceAnalytics';
import AIAssistant from './AIAssistant';

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
  
  const { addObject, currentProject, currentTime } = useAppStore();

  const assetCategories: AssetCategory[] = [
    // Basic Tools
    { id: 'shapes', name: 'Shapes', icon: '⬛', color: 'bg-blue-500', description: 'Basic geometric shapes' },
    { id: 'text', name: 'Text', icon: 'T', color: 'bg-green-500', description: 'Text and typography' },
    
    // Visual Assets
    { id: 'hands', name: 'Hands', icon: '✋', color: 'bg-orange-500', description: 'Hand gestures' },
    { id: 'characters', name: 'Characters', icon: '👤', color: 'bg-purple-500', description: 'People & avatars' },
    { id: 'props', name: 'Props', icon: '🎭', color: 'bg-pink-500', description: 'Objects & icons' },
    { id: 'images', name: 'Images', icon: '🖼️', color: 'bg-indigo-500', description: 'Custom uploads' },
    
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
    basics: { name: 'Basic Tools', categories: ['shapes', 'text'] },
    assets: { name: 'Visual Assets', categories: ['hands', 'characters', 'props', 'images'] },
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

  const addTextToCanvas = () => {
    if (!currentProject) {
      alert('Please create a project first');
      return;
    }

    const textObj = {
      id: `text-${Date.now()}`,
      type: 'text' as const,
      x: 200,
      y: 200,
      width: 320,
      height: 0,
      properties: {
        text: 'Sample Text',
        fontSize: 28,
        fill: '#111111',
        fontFamily: 'Arial'
      },
      animationStart: currentTime, // Start at current timeline position
      animationDuration: 5,
      animationType: 'none' as const,
      animationEasing: 'easeOut' as const
    };

    addObject(textObj);
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
                onClick={addTextToCanvas}
                className="w-full p-4 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-lg hover:from-green-700 hover:to-green-800 transition-all transform hover:scale-105 shadow-lg font-semibold"
              >
                <div className="text-lg font-bold">+ Add Text</div>
                <div className="text-sm opacity-90">Click to add text to your animation</div>
              </button>
              
              <div className="grid grid-cols-1 gap-3">
                <div className="p-3 bg-gray-700 rounded-lg border border-gray-600">
                  <div className="text-sm font-medium text-white mb-2">Font Styles</div>
                  <div className="space-y-1 text-xs text-gray-300">
                    <div>• Headings & Titles</div>
                    <div>• Body Text</div>
                    <div>• Captions</div>
                  </div>
                </div>
                <div className="p-3 bg-gray-700 rounded-lg border border-gray-600">
                  <div className="text-sm font-medium text-white mb-2">Text Effects</div>
                  <div className="space-y-1 text-xs text-gray-300">
                    <div>• Fade In/Out</div>
                    <div>• Slide In</div>
                    <div>• Typewriter</div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-gray-900 rounded-lg p-2">
              {activeCategory === 'shapes' && <AssetLibrary category="shapes" />}
              {activeCategory === 'hands' && <AssetLibrary category="hands" />}
              {activeCategory === 'characters' && <AssetLibrary category="characters" />}
              {activeCategory === 'props' && <AssetLibrary category="props" />}
              {activeCategory === 'images' && <CustomAssets />}
              {activeCategory === 'audio' && <AudioManager />}
              {activeCategory === 'advancedAudio' && <AdvancedAudioEditor />}
              {activeCategory === 'templates' && <AnimationTemplates />}
              {activeCategory === 'sceneTemplates' && <SceneTemplates />}
              {activeCategory === 'plugins' && <PluginSystem />}
              {activeCategory === 'collaborate' && <CollaborationSystem />}
              {activeCategory === 'analytics' && <PerformanceAnalytics />}
              {activeCategory === 'ai' && <AIAssistant />}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AssetPanel;