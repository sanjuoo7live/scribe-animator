import React, { useState, useMemo } from 'react';
import { useAppStore } from '../store/appStore';

interface HandGesture {
  id: string;
  name: string;
  unicode: string;
  category: string;
  skinTone: string;
  description: string;
  tags: string[];
}

const EnhancedHandLibrary: React.FC = () => {
  const { addObject, currentProject, currentTime } = useAppStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedSkinTone, setSelectedSkinTone] = useState('all');

  // Comprehensive hand gesture library
  const handGestures: HandGesture[] = useMemo(() => [
    // Pointing Gestures
    { id: 'point-up', name: 'Point Up', unicode: '☝️', category: 'pointing', skinTone: 'default', description: 'Index finger pointing up', tags: ['direction', 'up', 'index'] },
    { id: 'point-up-light', name: 'Point Up Light', unicode: '☝🏻', category: 'pointing', skinTone: 'light', description: 'Index finger pointing up', tags: ['direction', 'up', 'index'] },
    { id: 'point-up-medium-light', name: 'Point Up Medium-Light', unicode: '☝🏼', category: 'pointing', skinTone: 'medium-light', description: 'Index finger pointing up', tags: ['direction', 'up', 'index'] },
    { id: 'point-up-medium', name: 'Point Up Medium', unicode: '☝🏽', category: 'pointing', skinTone: 'medium', description: 'Index finger pointing up', tags: ['direction', 'up', 'index'] },
    { id: 'point-up-medium-dark', name: 'Point Up Medium-Dark', unicode: '☝🏾', category: 'pointing', skinTone: 'medium-dark', description: 'Index finger pointing up', tags: ['direction', 'up', 'index'] },
    { id: 'point-up-dark', name: 'Point Up Dark', unicode: '☝🏿', category: 'pointing', skinTone: 'dark', description: 'Index finger pointing up', tags: ['direction', 'up', 'index'] },
    
    { id: 'point-right', name: 'Point Right', unicode: '👉', category: 'pointing', skinTone: 'default', description: 'Index finger pointing right', tags: ['direction', 'right', 'index'] },
    { id: 'point-right-light', name: 'Point Right Light', unicode: '👉🏻', category: 'pointing', skinTone: 'light', description: 'Index finger pointing right', tags: ['direction', 'right', 'index'] },
    { id: 'point-right-medium-light', name: 'Point Right Medium-Light', unicode: '👉🏼', category: 'pointing', skinTone: 'medium-light', description: 'Index finger pointing right', tags: ['direction', 'right', 'index'] },
    { id: 'point-right-medium', name: 'Point Right Medium', unicode: '👉🏽', category: 'pointing', skinTone: 'medium', description: 'Index finger pointing right', tags: ['direction', 'right', 'index'] },
    { id: 'point-right-medium-dark', name: 'Point Right Medium-Dark', unicode: '👉🏾', category: 'pointing', skinTone: 'medium-dark', description: 'Index finger pointing right', tags: ['direction', 'right', 'index'] },
    { id: 'point-right-dark', name: 'Point Right Dark', unicode: '👉🏿', category: 'pointing', skinTone: 'dark', description: 'Index finger pointing right', tags: ['direction', 'right', 'index'] },
    
    { id: 'point-left', name: 'Point Left', unicode: '👈', category: 'pointing', skinTone: 'default', description: 'Index finger pointing left', tags: ['direction', 'left', 'index'] },
    { id: 'point-left-light', name: 'Point Left Light', unicode: '👈🏻', category: 'pointing', skinTone: 'light', description: 'Index finger pointing left', tags: ['direction', 'left', 'index'] },
    { id: 'point-left-medium-light', name: 'Point Left Medium-Light', unicode: '👈🏼', category: 'pointing', skinTone: 'medium-light', description: 'Index finger pointing left', tags: ['direction', 'left', 'index'] },
    { id: 'point-left-medium', name: 'Point Left Medium', unicode: '👈🏽', category: 'pointing', skinTone: 'medium', description: 'Index finger pointing left', tags: ['direction', 'left', 'index'] },
    { id: 'point-left-medium-dark', name: 'Point Left Medium-Dark', unicode: '👈🏾', category: 'pointing', skinTone: 'medium-dark', description: 'Index finger pointing left', tags: ['direction', 'left', 'index'] },
    { id: 'point-left-dark', name: 'Point Left Dark', unicode: '👈🏿', category: 'pointing', skinTone: 'dark', description: 'Index finger pointing left', tags: ['direction', 'left', 'index'] },
    
    { id: 'point-down', name: 'Point Down', unicode: '👇', category: 'pointing', skinTone: 'default', description: 'Index finger pointing down', tags: ['direction', 'down', 'index'] },
    { id: 'point-down-light', name: 'Point Down Light', unicode: '👇🏻', category: 'pointing', skinTone: 'light', description: 'Index finger pointing down', tags: ['direction', 'down', 'index'] },
    { id: 'point-down-medium-light', name: 'Point Down Medium-Light', unicode: '👇🏼', category: 'pointing', skinTone: 'medium-light', description: 'Index finger pointing down', tags: ['direction', 'down', 'index'] },
    { id: 'point-down-medium', name: 'Point Down Medium', unicode: '👇🏽', category: 'pointing', skinTone: 'medium', description: 'Index finger pointing down', tags: ['direction', 'down', 'index'] },
    { id: 'point-down-medium-dark', name: 'Point Down Medium-Dark', unicode: '👇🏾', category: 'pointing', skinTone: 'medium-dark', description: 'Index finger pointing down', tags: ['direction', 'down', 'index'] },
    { id: 'point-down-dark', name: 'Point Down Dark', unicode: '👇🏿', category: 'pointing', skinTone: 'dark', description: 'Index finger pointing down', tags: ['direction', 'down', 'index'] },

    // Approval Gestures
    { id: 'thumbs-up', name: 'Thumbs Up', unicode: '👍', category: 'approval', skinTone: 'default', description: 'Thumbs up approval', tags: ['positive', 'good', 'approval', 'like'] },
    { id: 'thumbs-up-light', name: 'Thumbs Up Light', unicode: '👍🏻', category: 'approval', skinTone: 'light', description: 'Thumbs up approval', tags: ['positive', 'good', 'approval', 'like'] },
    { id: 'thumbs-up-medium-light', name: 'Thumbs Up Medium-Light', unicode: '👍🏼', category: 'approval', skinTone: 'medium-light', description: 'Thumbs up approval', tags: ['positive', 'good', 'approval', 'like'] },
    { id: 'thumbs-up-medium', name: 'Thumbs Up Medium', unicode: '👍🏽', category: 'approval', skinTone: 'medium', description: 'Thumbs up approval', tags: ['positive', 'good', 'approval', 'like'] },
    { id: 'thumbs-up-medium-dark', name: 'Thumbs Up Medium-Dark', unicode: '👍🏾', category: 'approval', skinTone: 'medium-dark', description: 'Thumbs up approval', tags: ['positive', 'good', 'approval', 'like'] },
    { id: 'thumbs-up-dark', name: 'Thumbs Up Dark', unicode: '👍🏿', category: 'approval', skinTone: 'dark', description: 'Thumbs up approval', tags: ['positive', 'good', 'approval', 'like'] },
    
    { id: 'thumbs-down', name: 'Thumbs Down', unicode: '👎', category: 'approval', skinTone: 'default', description: 'Thumbs down disapproval', tags: ['negative', 'bad', 'disapproval', 'dislike'] },
    { id: 'thumbs-down-light', name: 'Thumbs Down Light', unicode: '👎🏻', category: 'approval', skinTone: 'light', description: 'Thumbs down disapproval', tags: ['negative', 'bad', 'disapproval', 'dislike'] },
    { id: 'thumbs-down-medium-light', name: 'Thumbs Down Medium-Light', unicode: '👎🏼', category: 'approval', skinTone: 'medium-light', description: 'Thumbs down disapproval', tags: ['negative', 'bad', 'disapproval', 'dislike'] },
    { id: 'thumbs-down-medium', name: 'Thumbs Down Medium', unicode: '👎🏽', category: 'approval', skinTone: 'medium', description: 'Thumbs down disapproval', tags: ['negative', 'bad', 'disapproval', 'dislike'] },
    { id: 'thumbs-down-medium-dark', name: 'Thumbs Down Medium-Dark', unicode: '👎🏾', category: 'approval', skinTone: 'medium-dark', description: 'Thumbs down disapproval', tags: ['negative', 'bad', 'disapproval', 'dislike'] },
    { id: 'thumbs-down-dark', name: 'Thumbs Down Dark', unicode: '👎🏿', category: 'approval', skinTone: 'dark', description: 'Thumbs down disapproval', tags: ['negative', 'bad', 'disapproval', 'dislike'] },

    // Hand Signs
    { id: 'ok-hand', name: 'OK Hand', unicode: '👌', category: 'signs', skinTone: 'default', description: 'OK hand gesture', tags: ['ok', 'perfect', 'good', 'circle'] },
    { id: 'ok-hand-light', name: 'OK Hand Light', unicode: '👌🏻', category: 'signs', skinTone: 'light', description: 'OK hand gesture', tags: ['ok', 'perfect', 'good', 'circle'] },
    { id: 'ok-hand-medium-light', name: 'OK Hand Medium-Light', unicode: '👌🏼', category: 'signs', skinTone: 'medium-light', description: 'OK hand gesture', tags: ['ok', 'perfect', 'good', 'circle'] },
    { id: 'ok-hand-medium', name: 'OK Hand Medium', unicode: '👌🏽', category: 'signs', skinTone: 'medium', description: 'OK hand gesture', tags: ['ok', 'perfect', 'good', 'circle'] },
    { id: 'ok-hand-medium-dark', name: 'OK Hand Medium-Dark', unicode: '👌🏾', category: 'signs', skinTone: 'medium-dark', description: 'OK hand gesture', tags: ['ok', 'perfect', 'good', 'circle'] },
    { id: 'ok-hand-dark', name: 'OK Hand Dark', unicode: '👌🏿', category: 'signs', skinTone: 'dark', description: 'OK hand gesture', tags: ['ok', 'perfect', 'good', 'circle'] },

    { id: 'victory', name: 'Victory Hand', unicode: '✌️', category: 'signs', skinTone: 'default', description: 'Victory or peace sign', tags: ['peace', 'victory', 'two', 'fingers'] },
    { id: 'victory-light', name: 'Victory Hand Light', unicode: '✌🏻', category: 'signs', skinTone: 'light', description: 'Victory or peace sign', tags: ['peace', 'victory', 'two', 'fingers'] },
    { id: 'victory-medium-light', name: 'Victory Hand Medium-Light', unicode: '✌🏼', category: 'signs', skinTone: 'medium-light', description: 'Victory or peace sign', tags: ['peace', 'victory', 'two', 'fingers'] },
    { id: 'victory-medium', name: 'Victory Hand Medium', unicode: '✌🏽', category: 'signs', skinTone: 'medium', description: 'Victory or peace sign', tags: ['peace', 'victory', 'two', 'fingers'] },
    { id: 'victory-medium-dark', name: 'Victory Hand Medium-Dark', unicode: '✌🏾', category: 'signs', skinTone: 'medium-dark', description: 'Victory or peace sign', tags: ['peace', 'victory', 'two', 'fingers'] },
    { id: 'victory-dark', name: 'Victory Hand Dark', unicode: '✌🏿', category: 'signs', skinTone: 'dark', description: 'Victory or peace sign', tags: ['peace', 'victory', 'two', 'fingers'] },

    // Interactive Gestures
    { id: 'wave', name: 'Waving Hand', unicode: '👋', category: 'interactive', skinTone: 'default', description: 'Waving hello or goodbye', tags: ['hello', 'goodbye', 'greeting', 'wave'] },
    { id: 'wave-light', name: 'Waving Hand Light', unicode: '👋🏻', category: 'interactive', skinTone: 'light', description: 'Waving hello or goodbye', tags: ['hello', 'goodbye', 'greeting', 'wave'] },
    { id: 'wave-medium-light', name: 'Waving Hand Medium-Light', unicode: '👋🏼', category: 'interactive', skinTone: 'medium-light', description: 'Waving hello or goodbye', tags: ['hello', 'goodbye', 'greeting', 'wave'] },
    { id: 'wave-medium', name: 'Waving Hand Medium', unicode: '👋🏽', category: 'interactive', skinTone: 'medium', description: 'Waving hello or goodbye', tags: ['hello', 'goodbye', 'greeting', 'wave'] },
    { id: 'wave-medium-dark', name: 'Waving Hand Medium-Dark', unicode: '👋🏾', category: 'interactive', skinTone: 'medium-dark', description: 'Waving hello or goodbye', tags: ['hello', 'goodbye', 'greeting', 'wave'] },
    { id: 'wave-dark', name: 'Waving Hand Dark', unicode: '👋🏿', category: 'interactive', skinTone: 'dark', description: 'Waving hello or goodbye', tags: ['hello', 'goodbye', 'greeting', 'wave'] },

    { id: 'clap', name: 'Clapping Hands', unicode: '👏', category: 'interactive', skinTone: 'default', description: 'Clapping hands', tags: ['applause', 'clap', 'celebration', 'approval'] },
    { id: 'clap-light', name: 'Clapping Hands Light', unicode: '👏🏻', category: 'interactive', skinTone: 'light', description: 'Clapping hands', tags: ['applause', 'clap', 'celebration', 'approval'] },
    { id: 'clap-medium-light', name: 'Clapping Hands Medium-Light', unicode: '👏🏼', category: 'interactive', skinTone: 'medium-light', description: 'Clapping hands', tags: ['applause', 'clap', 'celebration', 'approval'] },
    { id: 'clap-medium', name: 'Clapping Hands Medium', unicode: '👏🏽', category: 'interactive', skinTone: 'medium', description: 'Clapping hands', tags: ['applause', 'clap', 'celebration', 'approval'] },
    { id: 'clap-medium-dark', name: 'Clapping Hands Medium-Dark', unicode: '👏🏾', category: 'interactive', skinTone: 'medium-dark', description: 'Clapping hands', tags: ['applause', 'clap', 'celebration', 'approval'] },
    { id: 'clap-dark', name: 'Clapping Hands Dark', unicode: '👏🏿', category: 'interactive', skinTone: 'dark', description: 'Clapping hands', tags: ['applause', 'clap', 'celebration', 'approval'] },

    // Open Palm Gestures
    { id: 'raised-hand', name: 'Raised Hand', unicode: '✋', category: 'palm', skinTone: 'default', description: 'Raised hand palm', tags: ['stop', 'high-five', 'palm', 'halt'] },
    { id: 'raised-hand-light', name: 'Raised Hand Light', unicode: '✋🏻', category: 'palm', skinTone: 'light', description: 'Raised hand palm', tags: ['stop', 'high-five', 'palm', 'halt'] },
    { id: 'raised-hand-medium-light', name: 'Raised Hand Medium-Light', unicode: '✋🏼', category: 'palm', skinTone: 'medium-light', description: 'Raised hand palm', tags: ['stop', 'high-five', 'palm', 'halt'] },
    { id: 'raised-hand-medium', name: 'Raised Hand Medium', unicode: '✋🏽', category: 'palm', skinTone: 'medium', description: 'Raised hand palm', tags: ['stop', 'high-five', 'palm', 'halt'] },
    { id: 'raised-hand-medium-dark', name: 'Raised Hand Medium-Dark', unicode: '✋🏾', category: 'palm', skinTone: 'medium-dark', description: 'Raised hand palm', tags: ['stop', 'high-five', 'palm', 'halt'] },
    { id: 'raised-hand-dark', name: 'Raised Hand Dark', unicode: '✋🏿', category: 'palm', skinTone: 'dark', description: 'Raised hand palm', tags: ['stop', 'high-five', 'palm', 'halt'] },

    // Fist Gestures
    { id: 'fist-raised', name: 'Raised Fist', unicode: '✊', category: 'fist', skinTone: 'default', description: 'Raised fist', tags: ['power', 'solidarity', 'strength', 'protest'] },
    { id: 'fist-raised-light', name: 'Raised Fist Light', unicode: '✊🏻', category: 'fist', skinTone: 'light', description: 'Raised fist', tags: ['power', 'solidarity', 'strength', 'protest'] },
    { id: 'fist-raised-medium-light', name: 'Raised Fist Medium-Light', unicode: '✊🏼', category: 'fist', skinTone: 'medium-light', description: 'Raised fist', tags: ['power', 'solidarity', 'strength', 'protest'] },
    { id: 'fist-raised-medium', name: 'Raised Fist Medium', unicode: '✊🏽', category: 'fist', skinTone: 'medium', description: 'Raised fist', tags: ['power', 'solidarity', 'strength', 'protest'] },
    { id: 'fist-raised-medium-dark', name: 'Raised Fist Medium-Dark', unicode: '✊🏾', category: 'fist', skinTone: 'medium-dark', description: 'Raised fist', tags: ['power', 'solidarity', 'strength', 'protest'] },
    { id: 'fist-raised-dark', name: 'Raised Fist Dark', unicode: '✊🏿', category: 'fist', skinTone: 'dark', description: 'Raised fist', tags: ['power', 'solidarity', 'strength', 'protest'] },

    { id: 'fist-oncoming', name: 'Oncoming Fist', unicode: '👊', category: 'fist', skinTone: 'default', description: 'Oncoming fist bump', tags: ['fist-bump', 'punch', 'bump', 'solidarity'] },
    { id: 'fist-oncoming-light', name: 'Oncoming Fist Light', unicode: '👊🏻', category: 'fist', skinTone: 'light', description: 'Oncoming fist bump', tags: ['fist-bump', 'punch', 'bump', 'solidarity'] },
    { id: 'fist-oncoming-medium-light', name: 'Oncoming Fist Medium-Light', unicode: '👊🏼', category: 'fist', skinTone: 'medium-light', description: 'Oncoming fist bump', tags: ['fist-bump', 'punch', 'bump', 'solidarity'] },
    { id: 'fist-oncoming-medium', name: 'Oncoming Fist Medium', unicode: '👊🏽', category: 'fist', skinTone: 'medium', description: 'Oncoming fist bump', tags: ['fist-bump', 'punch', 'bump', 'solidarity'] },
    { id: 'fist-oncoming-medium-dark', name: 'Oncoming Fist Medium-Dark', unicode: '👊🏾', category: 'fist', skinTone: 'medium-dark', description: 'Oncoming fist bump', tags: ['fist-bump', 'punch', 'bump', 'solidarity'] },
    { id: 'fist-oncoming-dark', name: 'Oncoming Fist Dark', unicode: '👊🏿', category: 'fist', skinTone: 'dark', description: 'Oncoming fist bump', tags: ['fist-bump', 'punch', 'bump', 'solidarity'] },
  ], []);

  // Category and skin tone options
  const categories = [
    { id: 'all', name: 'All Categories', icon: '✋' },
    { id: 'pointing', name: 'Pointing', icon: '☝️' },
    { id: 'approval', name: 'Approval', icon: '👍' },
    { id: 'signs', name: 'Hand Signs', icon: '👌' },
    { id: 'interactive', name: 'Interactive', icon: '👋' },
    { id: 'palm', name: 'Open Palm', icon: '✋' },
    { id: 'fist', name: 'Fist', icon: '✊' }
  ];

  const skinTones = [
    { id: 'all', name: 'All Skin Tones', icon: '🌈' },
    { id: 'default', name: 'Default', icon: '✋' },
    { id: 'light', name: 'Light', icon: '✋🏻' },
    { id: 'medium-light', name: 'Medium-Light', icon: '✋🏼' },
    { id: 'medium', name: 'Medium', icon: '✋🏽' },
    { id: 'medium-dark', name: 'Medium-Dark', icon: '✋🏾' },
    { id: 'dark', name: 'Dark', icon: '✋🏿' }
  ];

  const addHandToCanvas = (hand: HandGesture) => {
    if (!currentProject) {
      alert('Please create a project first');
      return;
    }

    const handObj = {
      id: `hand-${Date.now()}`,
      type: 'text' as const, // Hands are rendered as text with unicode
      x: Math.random() * 200 + 100,
      y: Math.random() * 200 + 100,
      width: 80,
      height: 80,
      properties: {
        text: hand.unicode,
        fontSize: 48,
        fill: '#000000',
        fontFamily: 'Arial, sans-serif',
        handId: hand.id,
        handName: hand.name,
        handCategory: hand.category
      },
      animation: {
        keyframes: [{ time: currentTime, properties: {} }]
      }
    };

    addObject(handObj);
    
    // Success notification
    const notification = document.createElement('div');
    notification.className = 'fixed top-4 right-4 bg-green-600 text-white p-3 rounded-lg shadow-lg z-50 animate-pulse';
    notification.textContent = `✋ Added ${hand.name} to canvas!`;
    document.body.appendChild(notification);
    setTimeout(() => document.body.removeChild(notification), 2000);
  };

  // Filter hands based on search and filters
  const filteredHands = useMemo(() => {
    let filtered = handGestures;

    // Filter by category
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(hand => hand.category === selectedCategory);
    }

    // Filter by skin tone
    if (selectedSkinTone !== 'all') {
      filtered = filtered.filter(hand => hand.skinTone === selectedSkinTone);
    }

    // Filter by search term
    if (searchTerm.trim()) {
      const search = searchTerm.toLowerCase();
      filtered = filtered.filter(hand =>
        hand.name.toLowerCase().includes(search) ||
        hand.description.toLowerCase().includes(search) ||
        hand.tags.some(tag => tag.toLowerCase().includes(search))
      );
    }

    return filtered;
  }, [handGestures, selectedCategory, selectedSkinTone, searchTerm]);

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
          <span style={{ fontSize: '28px' }}>✋</span>
          <div>
            <h3 style={{ 
              fontSize: '20px', 
              fontWeight: 'bold', 
              margin: '0',
              color: 'white'
            }}>Hand Gesture Library</h3>
            <p style={{ 
              fontSize: '14px', 
              color: '#9CA3AF', 
              margin: '4px 0 0 0' 
            }}>
              Professional hand gestures with multiple skin tones
            </p>
          </div>
        </div>

        {/* Search Bar */}
        <div style={{ marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', border: '1px solid #4B5563', borderRadius: 8, overflow: 'hidden', backgroundColor: '#374151' }}>
            <span style={{ padding: '0 10px', color: '#9CA3AF' }}>🔎</span>
            <input
              type="text"
              placeholder="Search hand gestures..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                flex: 1,
                padding: '10px 12px',
                backgroundColor: 'transparent',
                color: 'white',
                border: 'none',
                fontSize: '14px',
                outline: 'none'
              }}
            />
            {searchTerm && (
              <button onClick={() => setSearchTerm('')} title="Clear search" aria-label="Clear search" style={{ padding: '8px 10px', color: '#9CA3AF', background: 'transparent', border: 'none', cursor: 'pointer' }}>✕</button>
            )}
          </div>
        </div>

        {/* Filter Pills */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {/* Category Filter */}
          <div>
            <div style={{ fontSize: '12px', color: '#9CA3AF', marginBottom: '6px', fontWeight: 'medium' }}>
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
                    backgroundColor: selectedCategory === category.id ? '#3B82F6' : '#374151',
                    color: 'white',
                    border: 'none',
                    borderRadius: '16px',
                    fontSize: '12px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}
                >
                  <span style={{ fontSize: '12px' }}>{category.icon}</span>
                  {category.name}
                </button>
              ))}
            </div>
          </div>

          {/* Skin Tone Filter */}
          <div>
            <div style={{ fontSize: '12px', color: '#9CA3AF', marginBottom: '6px', fontWeight: 'medium' }}>
              Skin Tone
            </div>
            <div style={{ 
              display: 'flex', 
              flexWrap: 'wrap', 
              gap: '6px'
            }}>
              {skinTones.map((tone) => (
                <button
                  key={tone.id}
                  onClick={() => setSelectedSkinTone(tone.id)}
                  style={{
                    padding: '6px 12px',
                    backgroundColor: selectedSkinTone === tone.id ? '#F59E0B' : '#374151',
                    color: 'white',
                    border: 'none',
                    borderRadius: '16px',
                    fontSize: '12px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}
                >
                  <span style={{ fontSize: '12px' }}>{tone.icon}</span>
                  {tone.name}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Hand Grid */}
      <div style={{ 
        flex: '1', 
        overflow: 'auto', 
        padding: '20px'
      }}>
        {filteredHands.length === 0 ? (
          <div style={{ 
            textAlign: 'center', 
            color: '#6B7280', 
            padding: '60px 20px'
          }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>🔍</div>
            <div style={{ fontSize: '18px', fontWeight: 'bold', color: 'white', marginBottom: '8px' }}>
              No hand gestures found
            </div>
            <div style={{ fontSize: '14px' }}>
              Try adjusting your search or filters
            </div>
          </div>
        ) : (
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', 
            gap: '12px'
          }}>
            {filteredHands.map((hand) => (
              <button
                key={hand.id}
                onClick={() => addHandToCanvas(hand)}
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
                  e.currentTarget.style.borderColor = '#6B7280';
                  e.currentTarget.style.transform = 'translateY(-2px)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = '#374151';
                  e.currentTarget.style.borderColor = '#4B5563';
                  e.currentTarget.style.transform = 'translateY(0)';
                }}
              >
                <div style={{ fontSize: '36px' }}>{hand.unicode}</div>
                <div style={{ 
                  fontSize: '11px', 
                  color: '#D1D5DB', 
                  textAlign: 'center',
                  fontWeight: '500',
                  lineHeight: '1.2'
                }}>
                  {hand.name}
                </div>
                <div style={{ 
                  fontSize: '9px', 
                  color: '#9CA3AF', 
                  textAlign: 'center',
                  lineHeight: '1.2'
                }}>
                  {hand.category}
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
        <span style={{ color: '#F59E0B', fontSize: '14px' }}>✋</span>
        <span>
          {filteredHands.length} of {handGestures.length} hand gestures
          {searchTerm && ` matching "${searchTerm}"`}
          {selectedCategory !== 'all' && ` in ${categories.find(c => c.id === selectedCategory)?.name}`}
          {selectedSkinTone !== 'all' && ` with ${skinTones.find(t => t.id === selectedSkinTone)?.name} skin tone`}
        </span>
      </div>
    </div>
  );
};

export default EnhancedHandLibrary;
