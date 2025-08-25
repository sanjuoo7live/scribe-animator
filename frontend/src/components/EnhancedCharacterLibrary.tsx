import React, { useState, useMemo } from 'react';
import { useAppStore } from '../store/appStore';

interface Character {
  id: string;
  name: string;
  unicode: string;
  category: string;
  description: string;
  tags: string[];
}

const EnhancedCharacterLibrary: React.FC = () => {
  const { addObject, currentProject, currentTime } = useAppStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');

  // Comprehensive character library
  const characters: Character[] = useMemo(() => [
    // People & Poses
    { id: 'person-standing', name: 'Person Standing', unicode: '🧍', category: 'poses', description: 'Person in standing position', tags: ['person', 'standing', 'neutral', 'pose'] },
    { id: 'man-standing', name: 'Man Standing', unicode: '🧍‍♂️', category: 'poses', description: 'Man in standing position', tags: ['man', 'male', 'standing', 'pose'] },
    { id: 'woman-standing', name: 'Woman Standing', unicode: '🧍‍♀️', category: 'poses', description: 'Woman in standing position', tags: ['woman', 'female', 'standing', 'pose'] },
    
    { id: 'person-walking', name: 'Person Walking', unicode: '🚶', category: 'movement', description: 'Person walking', tags: ['person', 'walking', 'movement', 'motion'] },
    { id: 'man-walking', name: 'Man Walking', unicode: '🚶‍♂️', category: 'movement', description: 'Man walking', tags: ['man', 'male', 'walking', 'movement'] },
    { id: 'woman-walking', name: 'Woman Walking', unicode: '🚶‍♀️', category: 'movement', description: 'Woman walking', tags: ['woman', 'female', 'walking', 'movement'] },
    
    { id: 'person-running', name: 'Person Running', unicode: '🏃', category: 'movement', description: 'Person running', tags: ['person', 'running', 'movement', 'fast', 'exercise'] },
    { id: 'man-running', name: 'Man Running', unicode: '🏃‍♂️', category: 'movement', description: 'Man running', tags: ['man', 'male', 'running', 'movement', 'exercise'] },
    { id: 'woman-running', name: 'Woman Running', unicode: '🏃‍♀️', category: 'movement', description: 'Woman running', tags: ['woman', 'female', 'running', 'movement', 'exercise'] },

    { id: 'person-kneeling', name: 'Person Kneeling', unicode: '🧎', category: 'poses', description: 'Person in kneeling position', tags: ['person', 'kneeling', 'pose', 'sitting'] },
    { id: 'man-kneeling', name: 'Man Kneeling', unicode: '🧎‍♂️', category: 'poses', description: 'Man in kneeling position', tags: ['man', 'male', 'kneeling', 'pose'] },
    { id: 'woman-kneeling', name: 'Woman Kneeling', unicode: '🧎‍♀️', category: 'poses', description: 'Woman in kneeling position', tags: ['woman', 'female', 'kneeling', 'pose'] },

    // Professionals
    { id: 'office-worker', name: 'Office Worker', unicode: '🧑‍💼', category: 'professionals', description: 'Office worker/businessperson', tags: ['business', 'office', 'work', 'professional'] },
    { id: 'businessman', name: 'Businessman', unicode: '👨‍💼', category: 'professionals', description: 'Male businessperson', tags: ['business', 'man', 'office', 'suit', 'professional'] },
    { id: 'businesswoman', name: 'Businesswoman', unicode: '👩‍💼', category: 'professionals', description: 'Female businessperson', tags: ['business', 'woman', 'office', 'professional'] },
    
    { id: 'teacher', name: 'Teacher', unicode: '🧑‍🏫', category: 'professionals', description: 'Teacher/educator', tags: ['teacher', 'education', 'school', 'learning', 'instructor'] },
    { id: 'man-teacher', name: 'Male Teacher', unicode: '👨‍🏫', category: 'professionals', description: 'Male teacher', tags: ['teacher', 'man', 'education', 'school'] },
    { id: 'woman-teacher', name: 'Female Teacher', unicode: '👩‍🏫', category: 'professionals', description: 'Female teacher', tags: ['teacher', 'woman', 'education', 'school'] },
    
    { id: 'student', name: 'Student', unicode: '🧑‍🎓', category: 'professionals', description: 'Student/graduate', tags: ['student', 'education', 'graduate', 'learning', 'school'] },
    { id: 'man-student', name: 'Male Student', unicode: '👨‍🎓', category: 'professionals', description: 'Male student', tags: ['student', 'man', 'education', 'graduate'] },
    { id: 'woman-student', name: 'Female Student', unicode: '👩‍🎓', category: 'professionals', description: 'Female student', tags: ['student', 'woman', 'education', 'graduate'] },
    
    { id: 'doctor', name: 'Health Worker', unicode: '🧑‍⚕️', category: 'professionals', description: 'Healthcare professional', tags: ['doctor', 'health', 'medical', 'healthcare', 'nurse'] },
    { id: 'man-doctor', name: 'Male Doctor', unicode: '👨‍⚕️', category: 'professionals', description: 'Male healthcare worker', tags: ['doctor', 'man', 'health', 'medical'] },
    { id: 'woman-doctor', name: 'Female Doctor', unicode: '👩‍⚕️', category: 'professionals', description: 'Female healthcare worker', tags: ['doctor', 'woman', 'health', 'medical'] },
    
    { id: 'scientist', name: 'Scientist', unicode: '🧑‍🔬', category: 'professionals', description: 'Scientist/researcher', tags: ['scientist', 'research', 'lab', 'science', 'experiment'] },
    { id: 'man-scientist', name: 'Male Scientist', unicode: '👨‍🔬', category: 'professionals', description: 'Male scientist', tags: ['scientist', 'man', 'research', 'lab'] },
    { id: 'woman-scientist', name: 'Female Scientist', unicode: '👩‍🔬', category: 'professionals', description: 'Female scientist', tags: ['scientist', 'woman', 'research', 'lab'] },

    { id: 'technologist', name: 'Technologist', unicode: '🧑‍💻', category: 'professionals', description: 'Tech worker/programmer', tags: ['tech', 'programmer', 'computer', 'developer', 'IT'] },
    { id: 'man-technologist', name: 'Male Technologist', unicode: '👨‍💻', category: 'professionals', description: 'Male tech worker', tags: ['tech', 'man', 'programmer', 'computer'] },
    { id: 'woman-technologist', name: 'Female Technologist', unicode: '👩‍💻', category: 'professionals', description: 'Female tech worker', tags: ['tech', 'woman', 'programmer', 'computer'] },

    // Emotions & Expressions  
    { id: 'person-facepalming', name: 'Person Facepalming', unicode: '🤦', category: 'emotions', description: 'Person facepalming', tags: ['facepalm', 'frustrated', 'disappointed', 'emotion'] },
    { id: 'man-facepalming', name: 'Man Facepalming', unicode: '🤦‍♂️', category: 'emotions', description: 'Man facepalming', tags: ['facepalm', 'man', 'frustrated', 'disappointed'] },
    { id: 'woman-facepalming', name: 'Woman Facepalming', unicode: '🤦‍♀️', category: 'emotions', description: 'Woman facepalming', tags: ['facepalm', 'woman', 'frustrated', 'disappointed'] },
    
    { id: 'person-shrugging', name: 'Person Shrugging', unicode: '🤷', category: 'emotions', description: 'Person shrugging', tags: ['shrug', 'unsure', 'don\'t know', 'confused'] },
    { id: 'man-shrugging', name: 'Man Shrugging', unicode: '🤷‍♂️', category: 'emotions', description: 'Man shrugging', tags: ['shrug', 'man', 'unsure', 'confused'] },
    { id: 'woman-shrugging', name: 'Woman Shrugging', unicode: '🤷‍♀️', category: 'emotions', description: 'Woman shrugging', tags: ['shrug', 'woman', 'unsure', 'confused'] },
    
    { id: 'person-tipping-hand', name: 'Person Tipping Hand', unicode: '💁', category: 'emotions', description: 'Person with helpful gesture', tags: ['helpful', 'information', 'assistance', 'gesture'] },
    { id: 'man-tipping-hand', name: 'Man Tipping Hand', unicode: '💁‍♂️', category: 'emotions', description: 'Man with helpful gesture', tags: ['helpful', 'man', 'information', 'assistance'] },
    { id: 'woman-tipping-hand', name: 'Woman Tipping Hand', unicode: '💁‍♀️', category: 'emotions', description: 'Woman with helpful gesture', tags: ['helpful', 'woman', 'information', 'assistance'] },

    { id: 'person-gesturing-ok', name: 'Person Gesturing OK', unicode: '🙆', category: 'emotions', description: 'Person making OK gesture', tags: ['ok', 'good', 'approval', 'positive'] },
    { id: 'man-gesturing-ok', name: 'Man Gesturing OK', unicode: '🙆‍♂️', category: 'emotions', description: 'Man making OK gesture', tags: ['ok', 'man', 'good', 'approval'] },
    { id: 'woman-gesturing-ok', name: 'Woman Gesturing OK', unicode: '🙆‍♀️', category: 'emotions', description: 'Woman making OK gesture', tags: ['ok', 'woman', 'good', 'approval'] },

    { id: 'person-gesturing-no', name: 'Person Gesturing No', unicode: '🙅', category: 'emotions', description: 'Person making no gesture', tags: ['no', 'stop', 'refuse', 'negative'] },
    { id: 'man-gesturing-no', name: 'Man Gesturing No', unicode: '🙅‍♂️', category: 'emotions', description: 'Man making no gesture', tags: ['no', 'man', 'stop', 'refuse'] },
    { id: 'woman-gesturing-no', name: 'Woman Gesturing No', unicode: '🙅‍♀️', category: 'emotions', description: 'Woman making no gesture', tags: ['no', 'woman', 'stop', 'refuse'] },

    // Age Groups
    { id: 'child', name: 'Child', unicode: '🧒', category: 'age-groups', description: 'Young child', tags: ['child', 'kid', 'young', 'baby'] },
    { id: 'boy', name: 'Boy', unicode: '👦', category: 'age-groups', description: 'Young boy', tags: ['boy', 'male', 'child', 'kid'] },
    { id: 'girl', name: 'Girl', unicode: '👧', category: 'age-groups', description: 'Young girl', tags: ['girl', 'female', 'child', 'kid'] },
    
    { id: 'older-person', name: 'Older Person', unicode: '🧓', category: 'age-groups', description: 'Elderly person', tags: ['elderly', 'old', 'senior', 'mature'] },
    { id: 'old-man', name: 'Old Man', unicode: '👴', category: 'age-groups', description: 'Elderly man', tags: ['elderly', 'old', 'man', 'senior', 'grandfather'] },
    { id: 'old-woman', name: 'Old Woman', unicode: '👵', category: 'age-groups', description: 'Elderly woman', tags: ['elderly', 'old', 'woman', 'senior', 'grandmother'] },

    // Basic People
    { id: 'adult', name: 'Adult', unicode: '🧑', category: 'basic', description: 'Generic adult person', tags: ['person', 'adult', 'human', 'neutral'] },
    { id: 'man', name: 'Man', unicode: '👨', category: 'basic', description: 'Adult man', tags: ['man', 'male', 'adult', 'person'] },
    { id: 'woman', name: 'Woman', unicode: '👩', category: 'basic', description: 'Adult woman', tags: ['woman', 'female', 'adult', 'person'] },
    
    { id: 'person-beard', name: 'Person with Beard', unicode: '🧔', category: 'basic', description: 'Person with facial hair', tags: ['beard', 'facial hair', 'person', 'adult'] },
    { id: 'man-beard', name: 'Man with Beard', unicode: '🧔‍♂️', category: 'basic', description: 'Man with beard', tags: ['beard', 'man', 'facial hair', 'male'] },
    { id: 'woman-beard', name: 'Woman with Beard', unicode: '🧔‍♀️', category: 'basic', description: 'Woman with beard', tags: ['beard', 'woman', 'facial hair', 'female'] },
  ], []);

  // Category options
  const categories = [
    { id: 'all', name: 'All Categories', icon: '👥' },
    { id: 'basic', name: 'Basic People', icon: '🧑' },
    { id: 'poses', name: 'Poses & Positions', icon: '🧍' },
    { id: 'movement', name: 'Movement', icon: '🚶' },
    { id: 'professionals', name: 'Professionals', icon: '💼' },
    { id: 'emotions', name: 'Emotions & Gestures', icon: '🤷' },
    { id: 'age-groups', name: 'Age Groups', icon: '👨‍👩‍👧‍👦' }
  ];

  const addCharacterToCanvas = (character: Character) => {
    if (!currentProject) {
      alert('Please create a project first');
      return;
    }

    const characterObj = {
      id: `character-${Date.now()}`,
      type: 'text' as const, // Characters are rendered as text with unicode
      x: Math.random() * 200 + 100,
      y: Math.random() * 200 + 100,
      width: 80,
      height: 80,
      properties: {
        text: character.unicode,
        fontSize: 48,
        fill: '#000000',
        fontFamily: 'Arial, sans-serif',
        characterId: character.id,
        characterName: character.name,
        characterCategory: character.category
      },
      animation: {
        keyframes: [{ time: currentTime, properties: {} }]
      }
    };

    addObject(characterObj);
    
    // Success notification
    const notification = document.createElement('div');
    notification.className = 'fixed top-4 right-4 bg-green-600 text-white p-3 rounded-lg shadow-lg z-50 animate-pulse';
    notification.textContent = `👤 Added ${character.name} to canvas!`;
    document.body.appendChild(notification);
    setTimeout(() => document.body.removeChild(notification), 2000);
  };

  // Filter characters based on search and category
  const filteredCharacters = useMemo(() => {
    let filtered = characters;

    // Filter by category
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(character => character.category === selectedCategory);
    }

    // Filter by search term
    if (searchTerm.trim()) {
      const search = searchTerm.toLowerCase();
      filtered = filtered.filter(character =>
        character.name.toLowerCase().includes(search) ||
        character.description.toLowerCase().includes(search) ||
        character.tags.some(tag => tag.toLowerCase().includes(search))
      );
    }

    return filtered;
  }, [characters, selectedCategory, searchTerm]);

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
          <span style={{ fontSize: '28px' }}>👤</span>
          <div>
            <h3 style={{ 
              fontSize: '20px', 
              fontWeight: 'bold', 
              margin: '0',
              color: 'white'
            }}>Character Library</h3>
            <p style={{ 
              fontSize: '14px', 
              color: '#9CA3AF', 
              margin: '4px 0 0 0' 
            }}>
              Professional people, avatars, and character assets
            </p>
          </div>
        </div>

        {/* Search Bar */}
        <div style={{ marginBottom: '16px' }}>
          <input
            type="text"
            placeholder="Search characters..."
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
            gap: '8px'
          }}>
            {categories.map((category) => (
              <button
                key={category.id}
                onClick={() => setSelectedCategory(category.id)}
                style={{
                  padding: '8px 14px',
                  backgroundColor: selectedCategory === category.id ? '#7C3AED' : '#374151',
                  color: 'white',
                  border: 'none',
                  borderRadius: '18px',
                  fontSize: '13px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontWeight: selectedCategory === category.id ? '600' : '400'
                }}
              >
                <span style={{ fontSize: '14px' }}>{category.icon}</span>
                {category.name}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Character Grid */}
      <div style={{ 
        flex: '1', 
        overflow: 'auto', 
        padding: '20px'
      }}>
        {filteredCharacters.length === 0 ? (
          <div style={{ 
            textAlign: 'center', 
            color: '#6B7280', 
            padding: '60px 20px'
          }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>🔍</div>
            <div style={{ fontSize: '18px', fontWeight: 'bold', color: 'white', marginBottom: '8px' }}>
              No characters found
            </div>
            <div style={{ fontSize: '14px' }}>
              Try adjusting your search or category filter
            </div>
          </div>
        ) : (
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', 
            gap: '14px'
          }}>
            {filteredCharacters.map((character) => (
              <button
                key={character.id}
                onClick={() => addCharacterToCanvas(character)}
                style={{
                  padding: '18px 10px',
                  backgroundColor: '#374151',
                  border: '1px solid #4B5563',
                  borderRadius: '12px',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '10px'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#4B5563';
                  e.currentTarget.style.borderColor = '#7C3AED';
                  e.currentTarget.style.transform = 'translateY(-2px)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = '#374151';
                  e.currentTarget.style.borderColor = '#4B5563';
                  e.currentTarget.style.transform = 'translateY(0)';
                }}
              >
                <div style={{ fontSize: '38px' }}>{character.unicode}</div>
                <div style={{ 
                  fontSize: '11px', 
                  color: '#D1D5DB', 
                  textAlign: 'center',
                  fontWeight: '500',
                  lineHeight: '1.2'
                }}>
                  {character.name}
                </div>
                <div style={{ 
                  fontSize: '9px', 
                  color: '#9CA3AF', 
                  textAlign: 'center',
                  lineHeight: '1.2'
                }}>
                  {character.category}
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
        <span style={{ color: '#7C3AED', fontSize: '14px' }}>👤</span>
        <span>
          {filteredCharacters.length} of {characters.length} characters
          {searchTerm && ` matching "${searchTerm}"`}
          {selectedCategory !== 'all' && ` in ${categories.find(c => c.id === selectedCategory)?.name}`}
        </span>
      </div>
    </div>
  );
};

export default EnhancedCharacterLibrary;
