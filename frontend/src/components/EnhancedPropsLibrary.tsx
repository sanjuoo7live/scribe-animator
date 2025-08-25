import React, { useState, useMemo } from 'react';
import { useAppStore } from '../store/appStore';

interface Prop {
  id: string;
  name: string;
  unicode: string;
  category: string;
  description: string;
  tags: string[];
}

const EnhancedPropsLibrary: React.FC = () => {
  const { addObject, currentProject, currentTime } = useAppStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');

  // Comprehensive props library
  const props: Prop[] = useMemo(() => [
    // Technology & Devices
    { id: 'laptop', name: 'Laptop Computer', unicode: '💻', category: 'technology', description: 'Portable computer', tags: ['computer', 'laptop', 'work', 'technology', 'device'] },
    { id: 'desktop-computer', name: 'Desktop Computer', unicode: '🖥️', category: 'technology', description: 'Desktop computer', tags: ['computer', 'desktop', 'work', 'technology', 'monitor'] },
    { id: 'keyboard', name: 'Keyboard', unicode: '⌨️', category: 'technology', description: 'Computer keyboard', tags: ['keyboard', 'typing', 'input', 'computer'] },
    { id: 'computer-mouse', name: 'Computer Mouse', unicode: '🖱️', category: 'technology', description: 'Computer mouse', tags: ['mouse', 'click', 'computer', 'pointing'] },
    { id: 'trackball', name: 'Trackball', unicode: '🖲️', category: 'technology', description: 'Trackball device', tags: ['trackball', 'pointing', 'computer', 'input'] },
    
    { id: 'mobile-phone', name: 'Mobile Phone', unicode: '📱', category: 'technology', description: 'Smartphone device', tags: ['phone', 'mobile', 'smartphone', 'device', 'communication'] },
    { id: 'telephone', name: 'Telephone', unicode: '☎️', category: 'technology', description: 'Traditional telephone', tags: ['phone', 'telephone', 'communication', 'call'] },
    { id: 'printer', name: 'Printer', unicode: '🖨️', category: 'technology', description: 'Document printer', tags: ['printer', 'print', 'document', 'office'] },
    { id: 'fax-machine', name: 'Fax Machine', unicode: '📠', category: 'technology', description: 'Fax machine', tags: ['fax', 'communication', 'document', 'office'] },
    
    // Audio & Video
    { id: 'camera', name: 'Camera', unicode: '📷', category: 'media', description: 'Photography camera', tags: ['camera', 'photo', 'photography', 'picture'] },
    { id: 'video-camera', name: 'Video Camera', unicode: '📹', category: 'media', description: 'Video recording camera', tags: ['video', 'camera', 'recording', 'film'] },
    { id: 'movie-camera', name: 'Movie Camera', unicode: '🎥', category: 'media', description: 'Professional movie camera', tags: ['movie', 'film', 'cinema', 'camera'] },
    { id: 'microphone', name: 'Microphone', unicode: '🎤', category: 'media', description: 'Audio microphone', tags: ['microphone', 'audio', 'sound', 'recording', 'voice'] },
    { id: 'headphones', name: 'Headphones', unicode: '🎧', category: 'media', description: 'Audio headphones', tags: ['headphones', 'audio', 'music', 'sound', 'listening'] },
    { id: 'speaker', name: 'Speaker', unicode: '🔊', category: 'media', description: 'Audio speaker', tags: ['speaker', 'sound', 'audio', 'music', 'loud'] },
    { id: 'radio', name: 'Radio', unicode: '📻', category: 'media', description: 'Radio device', tags: ['radio', 'music', 'broadcast', 'audio'] },
    { id: 'tv', name: 'Television', unicode: '📺', category: 'media', description: 'Television set', tags: ['tv', 'television', 'screen', 'entertainment'] },

    // Office & Work
    { id: 'briefcase', name: 'Briefcase', unicode: '💼', category: 'office', description: 'Business briefcase', tags: ['briefcase', 'business', 'work', 'professional', 'carry'] },
    { id: 'file-folder', name: 'File Folder', unicode: '📁', category: 'office', description: 'Document folder', tags: ['folder', 'file', 'document', 'organize', 'office'] },
    { id: 'open-file-folder', name: 'Open File Folder', unicode: '📂', category: 'office', description: 'Open document folder', tags: ['folder', 'file', 'open', 'document', 'office'] },
    { id: 'card-index-dividers', name: 'Card Index Dividers', unicode: '🗂️', category: 'office', description: 'Index card dividers', tags: ['index', 'cards', 'organize', 'filing', 'office'] },
    { id: 'calendar', name: 'Calendar', unicode: '📅', category: 'office', description: 'Date calendar', tags: ['calendar', 'date', 'schedule', 'time', 'planning'] },
    { id: 'tear-off-calendar', name: 'Tear-Off Calendar', unicode: '📆', category: 'office', description: 'Daily calendar', tags: ['calendar', 'daily', 'date', 'schedule'] },
    { id: 'spiral-notepad', name: 'Spiral Notepad', unicode: '🗒️', category: 'office', description: 'Spiral-bound notepad', tags: ['notepad', 'notes', 'writing', 'paper'] },
    { id: 'clipboard', name: 'Clipboard', unicode: '📋', category: 'office', description: 'Writing clipboard', tags: ['clipboard', 'writing', 'notes', 'office'] },
    { id: 'pushpin', name: 'Pushpin', unicode: '📌', category: 'office', description: 'Pin for boards', tags: ['pin', 'pushpin', 'attach', 'notice', 'board'] },
    { id: 'round-pushpin', name: 'Round Pushpin', unicode: '📍', category: 'office', description: 'Round pin marker', tags: ['pin', 'marker', 'location', 'point'] },
    { id: 'paperclip', name: 'Paperclip', unicode: '📎', category: 'office', description: 'Paper clip', tags: ['paperclip', 'attach', 'clip', 'office', 'paper'] },
    { id: 'linked-paperclips', name: 'Linked Paperclips', unicode: '🖇️', category: 'office', description: 'Connected paperclips', tags: ['paperclip', 'linked', 'connection', 'attach'] },

    // Books & Education
    { id: 'closed-book', name: 'Closed Book', unicode: '📕', category: 'education', description: 'Closed red book', tags: ['book', 'read', 'education', 'learning', 'knowledge'] },
    { id: 'open-book', name: 'Open Book', unicode: '📖', category: 'education', description: 'Open book', tags: ['book', 'open', 'read', 'education', 'study'] },
    { id: 'green-book', name: 'Green Book', unicode: '📗', category: 'education', description: 'Green book', tags: ['book', 'green', 'education', 'learning'] },
    { id: 'blue-book', name: 'Blue Book', unicode: '📘', category: 'education', description: 'Blue book', tags: ['book', 'blue', 'education', 'learning'] },
    { id: 'orange-book', name: 'Orange Book', unicode: '📙', category: 'education', description: 'Orange book', tags: ['book', 'orange', 'education', 'learning'] },
    { id: 'books', name: 'Books', unicode: '📚', category: 'education', description: 'Stack of books', tags: ['books', 'stack', 'education', 'library', 'learning'] },
    { id: 'notebook', name: 'Notebook', unicode: '📓', category: 'education', description: 'Spiral notebook', tags: ['notebook', 'notes', 'writing', 'study'] },
    { id: 'ledger', name: 'Ledger', unicode: '📒', category: 'education', description: 'Accounting ledger', tags: ['ledger', 'accounting', 'record', 'book'] },
    { id: 'notebook-decorative-cover', name: 'Notebook with Cover', unicode: '📔', category: 'education', description: 'Decorative notebook', tags: ['notebook', 'decorative', 'journal', 'writing'] },

    // Writing & Art
    { id: 'pencil', name: 'Pencil', unicode: '✏️', category: 'writing', description: 'Writing pencil', tags: ['pencil', 'write', 'draw', 'writing', 'tool'] },
    { id: 'pen', name: 'Pen', unicode: '✒️', category: 'writing', description: 'Ink pen', tags: ['pen', 'write', 'ink', 'writing', 'tool'] },
    { id: 'fountain-pen', name: 'Fountain Pen', unicode: '🖋️', category: 'writing', description: 'Fountain pen', tags: ['fountain pen', 'pen', 'writing', 'ink', 'elegant'] },
    { id: 'paintbrush', name: 'Paintbrush', unicode: '🖌️', category: 'writing', description: 'Paint brush', tags: ['paintbrush', 'paint', 'art', 'brush', 'creative'] },
    { id: 'crayon', name: 'Crayon', unicode: '🖍️', category: 'writing', description: 'Coloring crayon', tags: ['crayon', 'color', 'draw', 'art', 'child'] },

    // Lighting & Energy
    { id: 'light-bulb', name: 'Light Bulb', unicode: '💡', category: 'lighting', description: 'Idea light bulb', tags: ['lightbulb', 'idea', 'innovation', 'bright', 'electricity'] },
    { id: 'flashlight', name: 'Flashlight', unicode: '🔦', category: 'lighting', description: 'Portable flashlight', tags: ['flashlight', 'light', 'torch', 'battery'] },
    { id: 'candle', name: 'Candle', unicode: '🕯️', category: 'lighting', description: 'Wax candle', tags: ['candle', 'light', 'flame', 'wax'] },
    { id: 'electric-plug', name: 'Electric Plug', unicode: '🔌', category: 'lighting', description: 'Electrical plug', tags: ['plug', 'electric', 'power', 'electricity'] },
    { id: 'battery', name: 'Battery', unicode: '🔋', category: 'lighting', description: 'Battery power', tags: ['battery', 'power', 'energy', 'electricity'] },

    // Tools & Instruments
    { id: 'hammer', name: 'Hammer', unicode: '🔨', category: 'tools', description: 'Construction hammer', tags: ['hammer', 'tool', 'build', 'construction', 'repair'] },
    { id: 'wrench', name: 'Wrench', unicode: '🔧', category: 'tools', description: 'Adjustable wrench', tags: ['wrench', 'tool', 'repair', 'fix', 'mechanical'] },
    { id: 'screwdriver', name: 'Screwdriver', unicode: '🪛', category: 'tools', description: 'Screwdriver tool', tags: ['screwdriver', 'tool', 'screw', 'repair', 'fix'] },
    { id: 'nut-and-bolt', name: 'Nut and Bolt', unicode: '🔩', category: 'tools', description: 'Nut and bolt', tags: ['nut', 'bolt', 'fastener', 'mechanical', 'hardware'] },
    { id: 'gear', name: 'Gear', unicode: '⚙️', category: 'tools', description: 'Mechanical gear', tags: ['gear', 'mechanical', 'settings', 'machine', 'cog'] },
    { id: 'chains', name: 'Chains', unicode: '⛓️', category: 'tools', description: 'Metal chains', tags: ['chain', 'link', 'metal', 'connect', 'strong'] },

    // Security & Safety
    { id: 'key', name: 'Key', unicode: '🔑', category: 'security', description: 'Door key', tags: ['key', 'lock', 'security', 'access', 'door'] },
    { id: 'old-key', name: 'Old Key', unicode: '🗝️', category: 'security', description: 'Vintage key', tags: ['key', 'old', 'vintage', 'antique', 'lock'] },
    { id: 'locked', name: 'Locked', unicode: '🔒', category: 'security', description: 'Closed lock', tags: ['lock', 'locked', 'security', 'safe', 'closed'] },
    { id: 'unlocked', name: 'Unlocked', unicode: '🔓', category: 'security', description: 'Open lock', tags: ['lock', 'unlocked', 'open', 'access', 'free'] },
    { id: 'locked-with-pen', name: 'Locked with Pen', unicode: '🔏', category: 'security', description: 'Lock with pen', tags: ['lock', 'pen', 'secure', 'write', 'protected'] },
    { id: 'locked-with-key', name: 'Locked with Key', unicode: '🔐', category: 'security', description: 'Lock with key', tags: ['lock', 'key', 'secure', 'access', 'protected'] },
    { id: 'shield', name: 'Shield', unicode: '🛡️', category: 'security', description: 'Protection shield', tags: ['shield', 'protection', 'security', 'defend', 'safe'] },

    // Time & Measurement
    { id: 'alarm-clock', name: 'Alarm Clock', unicode: '⏰', category: 'time', description: 'Alarm clock', tags: ['clock', 'alarm', 'time', 'wake', 'schedule'] },
    { id: 'stopwatch', name: 'Stopwatch', unicode: '⏱️', category: 'time', description: 'Timer stopwatch', tags: ['stopwatch', 'timer', 'time', 'measure', 'speed'] },
    { id: 'timer-clock', name: 'Timer Clock', unicode: '⏲️', category: 'time', description: 'Kitchen timer', tags: ['timer', 'clock', 'time', 'countdown', 'cooking'] },
    { id: 'hourglass-done', name: 'Hourglass Done', unicode: '⌛', category: 'time', description: 'Completed hourglass', tags: ['hourglass', 'time', 'sand', 'complete', 'finished'] },
    { id: 'hourglass-not-done', name: 'Hourglass Flowing', unicode: '⏳', category: 'time', description: 'Flowing hourglass', tags: ['hourglass', 'time', 'sand', 'flowing', 'waiting'] },
    { id: 'straight-ruler', name: 'Straight Ruler', unicode: '📏', category: 'time', description: 'Measuring ruler', tags: ['ruler', 'measure', 'length', 'tool', 'straight'] },
    { id: 'triangular-ruler', name: 'Triangular Ruler', unicode: '📐', category: 'time', description: 'Triangle ruler', tags: ['ruler', 'triangle', 'measure', 'angle', 'geometry'] },

    // Money & Business
    { id: 'money-bag', name: 'Money Bag', unicode: '💰', category: 'business', description: 'Bag of money', tags: ['money', 'bag', 'wealth', 'rich', 'cash'] },
    { id: 'dollar-banknote', name: 'Dollar Banknote', unicode: '💵', category: 'business', description: 'Dollar bill', tags: ['dollar', 'money', 'cash', 'bill', 'currency'] },
    { id: 'yen-banknote', name: 'Yen Banknote', unicode: '💴', category: 'business', description: 'Yen currency', tags: ['yen', 'money', 'currency', 'japanese'] },
    { id: 'euro-banknote', name: 'Euro Banknote', unicode: '💶', category: 'business', description: 'Euro currency', tags: ['euro', 'money', 'currency', 'european'] },
    { id: 'pound-banknote', name: 'Pound Banknote', unicode: '💷', category: 'business', description: 'British pound', tags: ['pound', 'money', 'currency', 'british'] },
    { id: 'credit-card', name: 'Credit Card', unicode: '💳', category: 'business', description: 'Payment card', tags: ['credit card', 'payment', 'card', 'money', 'purchase'] },
    { id: 'chart-increasing', name: 'Chart Increasing', unicode: '📈', category: 'business', description: 'Growth chart', tags: ['chart', 'graph', 'growth', 'increase', 'success'] },
    { id: 'chart-decreasing', name: 'Chart Decreasing', unicode: '📉', category: 'business', description: 'Decline chart', tags: ['chart', 'graph', 'decline', 'decrease', 'loss'] },
    { id: 'bar-chart', name: 'Bar Chart', unicode: '📊', category: 'business', description: 'Data bar chart', tags: ['chart', 'bar', 'data', 'statistics', 'analysis'] },

    // Awards & Achievement
    { id: 'trophy', name: 'Trophy', unicode: '🏆', category: 'awards', description: 'Winner trophy', tags: ['trophy', 'winner', 'award', 'champion', 'success'] },
    { id: 'medal', name: 'Medal', unicode: '🏅', category: 'awards', description: 'Achievement medal', tags: ['medal', 'award', 'achievement', 'honor', 'recognition'] },
    { id: 'first-place-medal', name: 'First Place Medal', unicode: '🥇', category: 'awards', description: 'Gold medal', tags: ['gold', 'medal', 'first', 'winner', 'champion'] },
    { id: 'second-place-medal', name: 'Second Place Medal', unicode: '🥈', category: 'awards', description: 'Silver medal', tags: ['silver', 'medal', 'second', 'runner-up'] },
    { id: 'third-place-medal', name: 'Third Place Medal', unicode: '🥉', category: 'awards', description: 'Bronze medal', tags: ['bronze', 'medal', 'third', 'achievement'] },
    { id: 'ribbon', name: 'Ribbon', unicode: '🎀', category: 'awards', description: 'Decorative ribbon', tags: ['ribbon', 'decoration', 'gift', 'bow'] },
    { id: 'rosette', name: 'Rosette', unicode: '🏵️', category: 'awards', description: 'Award rosette', tags: ['rosette', 'award', 'flower', 'decoration'] },

    // Targets & Goals
    { id: 'direct-hit', name: 'Direct Hit', unicode: '🎯', category: 'goals', description: 'Target bullseye', tags: ['target', 'bullseye', 'goal', 'aim', 'success'] },
    { id: 'bow-and-arrow', name: 'Bow and Arrow', unicode: '🏹', category: 'goals', description: 'Archery equipment', tags: ['bow', 'arrow', 'archery', 'target', 'aim'] },
    { id: 'dart', name: 'Dart', unicode: '🎯', category: 'goals', description: 'Dartboard target', tags: ['dart', 'target', 'game', 'precision', 'aim'] }
  ], []);

  // Category options
  const categories = [
    { id: 'all', name: 'All Categories', icon: '🎭' },
    { id: 'technology', name: 'Technology', icon: '💻' },
    { id: 'media', name: 'Audio & Video', icon: '📷' },
    { id: 'office', name: 'Office & Work', icon: '💼' },
    { id: 'education', name: 'Books & Education', icon: '📚' },
    { id: 'writing', name: 'Writing & Art', icon: '✏️' },
    { id: 'lighting', name: 'Lighting & Energy', icon: '💡' },
    { id: 'tools', name: 'Tools & Instruments', icon: '🔨' },
    { id: 'security', name: 'Security & Safety', icon: '🔑' },
    { id: 'time', name: 'Time & Measurement', icon: '⏰' },
    { id: 'business', name: 'Money & Business', icon: '💰' },
    { id: 'awards', name: 'Awards & Achievement', icon: '🏆' },
    { id: 'goals', name: 'Targets & Goals', icon: '🎯' }
  ];

  const addPropToCanvas = (prop: Prop) => {
    if (!currentProject) {
      alert('Please create a project first');
      return;
    }

    const propObj = {
      id: `prop-${Date.now()}`,
      type: 'text' as const, // Props are rendered as text with unicode
      x: Math.random() * 200 + 100,
      y: Math.random() * 200 + 100,
      width: 80,
      height: 80,
      properties: {
        text: prop.unicode,
        fontSize: 48,
        fill: '#000000',
        fontFamily: 'Arial, sans-serif',
        propId: prop.id,
        propName: prop.name,
        propCategory: prop.category
      },
      animation: {
        keyframes: [{ time: currentTime, properties: {} }]
      }
    };

    addObject(propObj);
    
    // Success notification
    const notification = document.createElement('div');
    notification.className = 'fixed top-4 right-4 bg-green-600 text-white p-3 rounded-lg shadow-lg z-50 animate-pulse';
    notification.textContent = `🎭 Added ${prop.name} to canvas!`;
    document.body.appendChild(notification);
    setTimeout(() => document.body.removeChild(notification), 2000);
  };

  // Filter props based on search and category
  const filteredProps = useMemo(() => {
    let filtered = props;

    // Filter by category
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(prop => prop.category === selectedCategory);
    }

    // Filter by search term
    if (searchTerm.trim()) {
      const search = searchTerm.toLowerCase();
      filtered = filtered.filter(prop =>
        prop.name.toLowerCase().includes(search) ||
        prop.description.toLowerCase().includes(search) ||
        prop.tags.some(tag => tag.toLowerCase().includes(search))
      );
    }

    return filtered;
  }, [props, selectedCategory, searchTerm]);

  return (
    <div style={{ 
      height: '100%', 
      backgroundColor: '#111827', 
      color: 'white',
      display: 'flex',
      flexDirection: 'column',
      fontFamily: 'system-ui, -apple-system, sans-serif'
    }}>
      {/* Header */}
      <div style={{ 
        padding: '20px', 
        borderBottom: '1px solid #374151',
        flexShrink: 0,
        backgroundColor: '#111827'
      }}>
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: '12px',
          marginBottom: '16px'
        }}>
          <span style={{ fontSize: '28px' }}>🎭</span>
          <div>
            <h3 style={{ 
              fontSize: '20px', 
              fontWeight: 'bold', 
              margin: '0',
              color: 'white'
            }}>Props & Objects Library</h3>
            <p style={{ 
              fontSize: '14px', 
              color: '#9CA3AF', 
              margin: '4px 0 0 0' 
            }}>
              Professional objects, icons, and decorative elements
            </p>
          </div>
        </div>

        {/* Search Bar */}
        <div style={{ marginBottom: '16px' }}>
          <input
            type="text"
            placeholder="Search props and objects..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              width: '100%',
              padding: '10px 12px',
              backgroundColor: '#374151',
              color: 'white',
              border: '1px solid #4B5563',
              borderRadius: '8px',
              fontSize: '14px'
            }}
          />
        </div>

        {/* Category Filter */}
        <div>
          <div style={{ fontSize: '12px', color: '#9CA3AF', marginBottom: '8px', fontWeight: 'medium' }}>
            Category
          </div>
          <div style={{ 
            display: 'flex', 
            flexWrap: 'wrap', 
            gap: '6px'
          }}>
            {categories.map((category) => (
              <button
                key={category.id}
                onClick={() => setSelectedCategory(category.id)}
                style={{
                  padding: '6px 12px',
                  backgroundColor: selectedCategory === category.id ? '#EC4899' : '#374151',
                  color: 'white',
                  border: 'none',
                  borderRadius: '16px',
                  fontSize: '12px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  fontWeight: selectedCategory === category.id ? '600' : '400'
                }}
              >
                <span style={{ fontSize: '12px' }}>{category.icon}</span>
                {category.name}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Props Grid */}
      <div style={{ 
        flex: '1', 
        overflow: 'auto', 
        padding: '20px'
      }}>
        {filteredProps.length === 0 ? (
          <div style={{ 
            textAlign: 'center', 
            color: '#6B7280', 
            padding: '60px 20px'
          }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>🔍</div>
            <div style={{ fontSize: '18px', fontWeight: 'bold', color: 'white', marginBottom: '8px' }}>
              No props found
            </div>
            <div style={{ fontSize: '14px' }}>
              Try adjusting your search or category filter
            </div>
          </div>
        ) : (
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', 
            gap: '12px'
          }}>
            {filteredProps.map((prop) => (
              <button
                key={prop.id}
                onClick={() => addPropToCanvas(prop)}
                style={{
                  padding: '16px 8px',
                  backgroundColor: '#374151',
                  border: '1px solid #4B5563',
                  borderRadius: '12px',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '8px'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#4B5563';
                  e.currentTarget.style.borderColor = '#EC4899';
                  e.currentTarget.style.transform = 'translateY(-2px)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = '#374151';
                  e.currentTarget.style.borderColor = '#4B5563';
                  e.currentTarget.style.transform = 'translateY(0)';
                }}
              >
                <div style={{ fontSize: '36px' }}>{prop.unicode}</div>
                <div style={{ 
                  fontSize: '11px', 
                  color: '#D1D5DB', 
                  textAlign: 'center',
                  fontWeight: '500',
                  lineHeight: '1.2'
                }}>
                  {prop.name}
                </div>
                <div style={{ 
                  fontSize: '9px', 
                  color: '#9CA3AF', 
                  textAlign: 'center',
                  lineHeight: '1.2'
                }}>
                  {prop.category}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Footer Stats */}
      <div style={{ 
        padding: '12px 20px', 
        borderTop: '1px solid #374151',
        backgroundColor: '#111827',
        fontSize: '12px',
        color: '#9CA3AF',
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        flexShrink: 0
      }}>
        <span style={{ color: '#EC4899', fontSize: '14px' }}>🎭</span>
        <span>
          {filteredProps.length} of {props.length} props and objects
          {searchTerm && ` matching "${searchTerm}"`}
          {selectedCategory !== 'all' && ` in ${categories.find(c => c.id === selectedCategory)?.name}`}
        </span>
      </div>
    </div>
  );
};

export default EnhancedPropsLibrary;
