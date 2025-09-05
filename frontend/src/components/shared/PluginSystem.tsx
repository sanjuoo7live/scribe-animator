import React, { useState, useEffect } from 'react';
import { useAppStore, SceneObject } from '../../store/appStore';
import './PluginSystem.css';

// Plugin System Types
export interface PluginEffect {
  id: string;
  name: string;
  description: string;
  category: 'animation' | 'filter' | 'transform' | 'audio';
  parameters: PluginParameter[];
  apply: (object: SceneObject, params: any) => SceneObject;
  preview?: (object: SceneObject, params: any) => string; // Returns preview URL or CSS
}

export interface PluginParameter {
  id: string;
  name: string;
  type: 'number' | 'string' | 'boolean' | 'color' | 'select' | 'range';
  defaultValue: any;
  min?: number;
  max?: number;
  step?: number;
  options?: { label: string; value: any }[];
  description?: string;
}

export interface InstalledPlugin {
  id: string;
  name: string;
  version: string;
  author: string;
  description: string;
  effects: PluginEffect[];
  enabled: boolean;
  installDate: Date;
}

// Built-in Effects
const builtInEffects: PluginEffect[] = [
  {
    id: 'fade-in',
    name: 'Fade In',
    description: 'Gradually increase opacity from 0 to 1',
    category: 'animation',
    parameters: [
      { id: 'duration', name: 'Duration', type: 'range', defaultValue: 1, min: 0.1, max: 5, step: 0.1 },
      { id: 'delay', name: 'Delay', type: 'range', defaultValue: 0, min: 0, max: 10, step: 0.1 }
    ],
    apply: (object, params) => ({
      ...object,
      animationType: 'fadeIn',
      animationDuration: params.duration,
      animationStart: params.delay
    })
  },
  {
    id: 'slide-in',
    name: 'Slide In',
    description: 'Slide object from outside the canvas',
    category: 'animation',
    parameters: [
      { id: 'direction', name: 'Direction', type: 'select', defaultValue: 'left', 
        options: [
          { label: 'From Left', value: 'left' },
          { label: 'From Right', value: 'right' },
          { label: 'From Top', value: 'top' },
          { label: 'From Bottom', value: 'bottom' }
        ]
      },
      { id: 'duration', name: 'Duration', type: 'range', defaultValue: 1, min: 0.1, max: 5, step: 0.1 },
      { id: 'easing', name: 'Easing', type: 'select', defaultValue: 'easeOut',
        options: [
          { label: 'Linear', value: 'linear' },
          { label: 'Ease In', value: 'easeIn' },
          { label: 'Ease Out', value: 'easeOut' },
          { label: 'Ease In Out', value: 'easeInOut' }
        ]
      }
    ],
    apply: (object, params) => ({
      ...object,
      animationType: 'slideIn',
      animationDuration: params.duration,
      animationEasing: params.easing,
      properties: {
        ...object.properties,
        slideDirection: params.direction
      }
    })
  },
  {
    id: 'glow-effect',
    name: 'Glow Effect',
    description: 'Add a glowing outline to objects',
    category: 'filter',
    parameters: [
      { id: 'color', name: 'Glow Color', type: 'color', defaultValue: '#00ff00' },
      { id: 'intensity', name: 'Intensity', type: 'range', defaultValue: 10, min: 1, max: 50, step: 1 },
      { id: 'blur', name: 'Blur Radius', type: 'range', defaultValue: 5, min: 1, max: 20, step: 1 }
    ],
    apply: (object, params) => ({
      ...object,
      properties: {
        ...object.properties,
        shadowColor: params.color,
        shadowBlur: params.blur,
        shadowOffset: 0,
        shadowOpacity: params.intensity / 50
      }
    })
  },
  {
    id: 'typewriter',
    name: 'Typewriter Effect',
    description: 'Reveal text character by character',
    category: 'animation',
    parameters: [
      { id: 'speed', name: 'Typing Speed (chars/sec)', type: 'range', defaultValue: 10, min: 1, max: 50, step: 1 },
      { id: 'cursor', name: 'Show Cursor', type: 'boolean', defaultValue: true },
      { id: 'cursorChar', name: 'Cursor Character', type: 'string', defaultValue: '|' }
    ],
    apply: (object, params) => ({
      ...object,
      animationType: 'typewriter' as any,
      properties: {
        ...object.properties,
        typewriterSpeed: params.speed,
        showCursor: params.cursor,
        cursorCharacter: params.cursorChar
      }
    })
  }
];

const PluginSystem: React.FC = () => {
  const { selectedObject, currentProject, updateObject } = useAppStore();
  const [installedPlugins, setInstalledPlugins] = useState<InstalledPlugin[]>([
    {
      id: 'core-effects',
      name: 'Core Effects',
      version: '1.0.0',
      author: 'Scribe Animator',
      description: 'Built-in animation and effect plugins',
      effects: builtInEffects,
      enabled: true,
      installDate: new Date()
    }
  ]);
  
  const [selectedEffect, setSelectedEffect] = useState<PluginEffect | null>(null);
  const [effectParams, setEffectParams] = useState<any>({});
  const [activeTab, setActiveTab] = useState<'effects' | 'installed' | 'store'>('effects');
  const [filterCategory, setFilterCategory] = useState<string>('all');

  // Initialize effect parameters with defaults
  useEffect(() => {
    if (selectedEffect) {
      const defaults = selectedEffect.parameters.reduce((acc, param) => {
        acc[param.id] = param.defaultValue;
        return acc;
      }, {} as any);
      setEffectParams(defaults);
    }
  }, [selectedEffect]);

  // Get all available effects from installed plugins
  const availableEffects = installedPlugins
    .filter(plugin => plugin.enabled)
    .flatMap(plugin => plugin.effects)
    .filter(effect => filterCategory === 'all' || effect.category === filterCategory);

  // Get selected object
  const currentObject = selectedObject && currentProject 
    ? currentProject.objects.find(obj => obj.id === selectedObject)
    : null;

  // Apply effect to selected object
  const applyEffect = () => {
    if (!selectedEffect || !currentObject) return;

    try {
      const modifiedObject = selectedEffect.apply(currentObject, effectParams);
      updateObject(currentObject.id, modifiedObject);
      
      // Show success message
      alert(`Applied "${selectedEffect.name}" effect successfully!`);
    } catch (error) {
      console.error('Error applying effect:', error);
      alert('Failed to apply effect. Please check the parameters.');
    }
  };

  // Render parameter input
  const renderParameter = (param: PluginParameter) => {
    const value = effectParams[param.id] ?? param.defaultValue;

    switch (param.type) {
      case 'number':
      case 'range':
        return (
          <input
            type="range"
            min={param.min}
            max={param.max}
            step={param.step}
            value={value}
            onChange={(e) => setEffectParams((prev: any) => ({
              ...prev,
              [param.id]: parseFloat(e.target.value)
            }))}
            className="parameter-range"
          />
        );
      
      case 'color':
        return (
          <input
            type="color"
            value={value}
            onChange={(e) => setEffectParams((prev: any) => ({
              ...prev,
              [param.id]: e.target.value
            }))}
            className="parameter-color"
          />
        );
      
      case 'boolean':
        return (
          <input
            type="checkbox"
            checked={value}
            onChange={(e) => setEffectParams((prev: any) => ({
              ...prev,
              [param.id]: e.target.checked
            }))}
            className="parameter-checkbox"
          />
        );
      
      case 'select':
        return (
          <select
            value={value}
            onChange={(e) => setEffectParams((prev: any) => ({
              ...prev,
              [param.id]: e.target.value
            }))}
            className="parameter-select"
          >
            {param.options?.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        );
      
      case 'string':
        return (
          <input
            type="text"
            value={value}
            onChange={(e) => setEffectParams((prev: any) => ({
              ...prev,
              [param.id]: e.target.value
            }))}
            className="parameter-text"
          />
        );
      
      default:
        return null;
    }
  };

  // Toggle plugin enabled state
  const togglePlugin = (pluginId: string) => {
    setInstalledPlugins(prev => prev.map(plugin => 
      plugin.id === pluginId 
        ? { ...plugin, enabled: !plugin.enabled }
        : plugin
    ));
  };

  return (
    <div className="plugin-system">
      <div className="plugin-header">
        <h3>Plugin System</h3>
        <div className="tab-buttons">
          <button 
            className={`tab-btn ${activeTab === 'effects' ? 'active' : ''}`}
            onClick={() => setActiveTab('effects')}
          >
            Effects
          </button>
          <button 
            className={`tab-btn ${activeTab === 'installed' ? 'active' : ''}`}
            onClick={() => setActiveTab('installed')}
          >
            Plugins
          </button>
          <button 
            className={`tab-btn ${activeTab === 'store' ? 'active' : ''}`}
            onClick={() => setActiveTab('store')}
          >
            Store
          </button>
        </div>
      </div>

      {activeTab === 'effects' && (
        <div className="effects-panel">
          <div className="category-filter">
            <label>Category:</label>
            <select 
              value={filterCategory} 
              onChange={(e) => setFilterCategory(e.target.value)}
              className="category-select"
            >
              <option value="all">All Categories</option>
              <option value="animation">Animation</option>
              <option value="filter">Filters</option>
              <option value="transform">Transform</option>
              <option value="audio">Audio</option>
            </select>
          </div>

          <div className="effects-list">
            {availableEffects.map(effect => (
              <div
                key={effect.id}
                className={`effect-card ${selectedEffect?.id === effect.id ? 'selected' : ''}`}
                onClick={() => setSelectedEffect(effect)}
              >
                <div className="effect-name">{effect.name}</div>
                <div className="effect-description">{effect.description}</div>
                <div className="effect-category">{effect.category}</div>
              </div>
            ))}
          </div>

          {selectedEffect && (
            <div className="effect-editor">
              <h4>{selectedEffect.name} Parameters</h4>
              
              {selectedEffect.parameters.map(param => (
                <div key={param.id} className="parameter-group">
                  <label className="parameter-label">
                    {param.name}
                    {param.description && (
                      <span className="parameter-description"> - {param.description}</span>
                    )}
                  </label>
                  <div className="parameter-control">
                    {renderParameter(param)}
                    {param.type === 'range' && (
                      <span className="parameter-value">{effectParams[param.id] ?? param.defaultValue}</span>
                    )}
                  </div>
                </div>
              ))}
              
              <div className="effect-actions">
                <button
                  onClick={applyEffect}
                  disabled={!currentObject}
                  className="apply-effect-btn"
                >
                  {currentObject ? 'Apply Effect' : 'Select an object first'}
                </button>
                {selectedEffect.preview && currentObject && (
                  <button className="preview-effect-btn">
                    Preview
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'installed' && (
        <div className="plugins-panel">
          <div className="plugins-list">
            {installedPlugins.map(plugin => (
              <div key={plugin.id} className="plugin-card">
                <div className="plugin-header">
                  <div className="plugin-info">
                    <div className="plugin-name">{plugin.name}</div>
                    <div className="plugin-version">v{plugin.version}</div>
                    <div className="plugin-author">by {plugin.author}</div>
                  </div>
                  <div className="plugin-controls">
                    <button
                      onClick={() => togglePlugin(plugin.id)}
                      className={`toggle-btn ${plugin.enabled ? 'enabled' : 'disabled'}`}
                    >
                      {plugin.enabled ? 'Enabled' : 'Disabled'}
                    </button>
                  </div>
                </div>
                <div className="plugin-description">{plugin.description}</div>
                <div className="plugin-effects">
                  <strong>Effects:</strong> {plugin.effects.map(e => e.name).join(', ')}
                </div>
                <div className="plugin-install-date">
                  Installed: {plugin.installDate.toLocaleDateString()}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'store' && (
        <div className="plugin-store">
          <div className="store-header">
            <h4>Plugin Store</h4>
            <div className="search-bar">
              <input type="text" placeholder="Search plugins..." />
              <button>Search</button>
            </div>
          </div>
          
          <div className="store-categories">
            <button className="store-category active">All</button>
            <button className="store-category">Animation</button>
            <button className="store-category">Filters</button>
            <button className="store-category">Audio</button>
            <button className="store-category">Utilities</button>
          </div>

          <div className="store-plugins">
            <div className="store-plugin-card">
              <div className="plugin-preview">🎨</div>
              <div className="plugin-details">
                <div className="plugin-name">Advanced Particles</div>
                <div className="plugin-author">by EffectStudio</div>
                <div className="plugin-description">Create stunning particle effects and animations</div>
                <div className="plugin-price">$9.99</div>
              </div>
              <button className="install-btn">Install</button>
            </div>

            <div className="store-plugin-card">
              <div className="plugin-preview">🌊</div>
              <div className="plugin-details">
                <div className="plugin-name">Water Effects</div>
                <div className="plugin-author">by NatureFX</div>
                <div className="plugin-description">Realistic water, rain, and liquid animations</div>
                <div className="plugin-price">Free</div>
              </div>
              <button className="install-btn">Install</button>
            </div>

            <div className="store-plugin-card">
              <div className="plugin-preview">📊</div>
              <div className="plugin-details">
                <div className="plugin-name">Chart Animations</div>
                <div className="plugin-author">by DataViz Pro</div>
                <div className="plugin-description">Animated charts and data visualizations</div>
                <div className="plugin-price">$14.99</div>
              </div>
              <button className="install-btn">Install</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PluginSystem;
