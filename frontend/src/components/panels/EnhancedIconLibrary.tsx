import React, { useState, useMemo } from 'react';
import { iconCollections, IconDefinition, searchIcons, getIconsByCategory } from '../../data/iconLibrary';

interface EnhancedIconLibraryProps {
  onIconSelect: (icon: IconDefinition) => void;
}

const EnhancedIconLibrary: React.FC<EnhancedIconLibraryProps> = ({ onIconSelect }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCollection, setSelectedCollection] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [hoveredIcon, setHoveredIcon] = useState<string | null>(null);

  // Filter icons based on search and collection
  const filteredIcons = useMemo(() => {
    if (searchQuery.trim()) {
      return searchIcons(searchQuery);
    }
    
    if (selectedCollection === 'all') {
      return iconCollections.flatMap(collection => collection.icons);
    }
    
    return getIconsByCategory(selectedCollection);
  }, [searchQuery, selectedCollection]);

  const handleIconClick = (icon: IconDefinition) => {
    onIconSelect(icon);
  };

  const clearSearch = () => {
    setSearchQuery('');
    setSelectedCollection('all');
  };

  return (
    <div style={{ backgroundColor: '#111827', color: 'white', height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Header with Search and Controls */}
      <div style={{ padding: '16px', borderBottom: '1px solid #374151', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', flex: 1, border: '1px solid #6B7280', borderRadius: 8, overflow: 'hidden', backgroundColor: '#374151' }}>
            <span style={{ padding: '0 10px', color: '#9CA3AF' }}>🔎</span>
            <input
              type="text"
              placeholder="Search icons..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                flex: 1,
                padding: '10px 8px',
                border: 'none',
                fontSize: '14px',
                backgroundColor: 'transparent',
                color: 'white',
                outline: 'none'
              }}
            />
            {searchQuery && (
              <button onClick={clearSearch} title="Clear search" aria-label="Clear search" style={{ padding: '8px', color: '#9CA3AF', background: 'transparent', border: 'none', cursor: 'pointer' }}>✕</button>
            )}
            <span style={{ width: 1, height: 24, backgroundColor: '#6B7280', margin: '0 6px' }} />
            <button
              onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
              title={viewMode === 'grid' ? 'List View' : 'Grid View'}
              aria-pressed={viewMode === 'list'}
              style={{ padding: '8px 10px', color: '#E5E7EB', background: 'transparent', border: 'none', cursor: 'pointer' }}
            >
              {viewMode === 'grid' ? '☰' : '▦'}
            </button>
          </div>
        </div>

        {/* Collection Tabs */}
        <div style={{ display: 'flex', gap: '4px', marginBottom: '12px' }}>
          <button
            onClick={() => setSelectedCollection('all')}
            style={{
              padding: '6px 12px',
              fontSize: '14px',
              fontWeight: '500',
              borderRadius: '6px',
              backgroundColor: selectedCollection === 'all' ? '#3B82F6' : 'transparent',
              color: selectedCollection === 'all' ? 'white' : '#9CA3AF',
              border: 'none',
              cursor: 'pointer'
            }}
          >
            All ({iconCollections.reduce((sum, col) => sum + col.icons.length, 0)})
          </button>
          {iconCollections.map(collection => (
            <button
              key={collection.id}
              onClick={() => setSelectedCollection(collection.id)}
              style={{
                padding: '6px 12px',
                fontSize: '14px',
                fontWeight: '500',
                borderRadius: '6px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                backgroundColor: selectedCollection === collection.id ? '#3B82F6' : 'transparent',
                color: selectedCollection === collection.id ? 'white' : '#9CA3AF',
                border: 'none',
                cursor: 'pointer'
              }}
            >
              <span style={{ fontSize: '16px' }}>{collection.icon}</span>
              {collection.name} ({collection.icons.length})
            </button>
          ))}
        </div>

        {/* Results Summary */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '14px', color: '#9CA3AF' }}>
          <span>
            {filteredIcons.length} icon{filteredIcons.length !== 1 ? 's' : ''} 
            {searchQuery && ` matching "${searchQuery}"`}
          </span>
          
          {searchQuery && filteredIcons.length === 0 && (
            <span style={{ color: '#EF4444' }}>No icons found</span>
          )}
        </div>
      </div>

      {/* Icon Grid/List */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px' }}>
        {viewMode === 'grid' ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '8px' }}>
            {filteredIcons.map(icon => (
              <div
                key={icon.id}
                style={{
                  position: 'relative',
                  padding: '12px',
                  border: '1px solid #374151',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  backgroundColor: hoveredIcon === icon.id ? '#1F2937' : '#111827',
                  transition: 'all 0.2s',
                  transform: hoveredIcon === icon.id ? 'scale(1.05)' : 'scale(1)'
                }}
                onClick={() => handleIconClick(icon)}
                onMouseEnter={() => setHoveredIcon(icon.id)}
                onMouseLeave={() => setHoveredIcon(null)}
                title={`${icon.name} - ${icon.keywords.join(', ')}`}
              >
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                  <span style={{ fontSize: '32px' }}>{icon.unicode}</span>
                  <span style={{ fontSize: '12px', color: '#9CA3AF', textAlign: 'center', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', width: '100%' }}>
                    {icon.name}
                  </span>
                </div>
                
                {/* Hover tooltip */}
                {hoveredIcon === icon.id && (
                  <div style={{
                    position: 'absolute',
                    bottom: '100%',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    marginBottom: '8px',
                    padding: '4px 8px',
                    backgroundColor: '#111827',
                    color: 'white',
                    fontSize: '12px',
                    borderRadius: '4px',
                    whiteSpace: 'nowrap',
                    zIndex: 10,
                    border: '1px solid #374151'
                  }}>
                    {icon.name}
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {filteredIcons.map(icon => (
              <div
                key={icon.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '8px',
                  border: '1px solid #374151',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  backgroundColor: '#111827',
                  transition: 'all 0.2s'
                }}
                onClick={() => handleIconClick(icon)}
              >
                <span style={{ fontSize: '24px' }}>{icon.unicode}</span>
                <div style={{ flex: '1' }}>
                  <div style={{ fontWeight: '500', fontSize: '14px', color: 'white' }}>{icon.name}</div>
                  <div style={{ fontSize: '12px', color: '#9CA3AF' }}>
                    Category: {icon.category} • Keywords: {icon.keywords.join(', ')}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Empty state */}
        {filteredIcons.length === 0 && !searchQuery && (
          <div style={{ textAlign: 'center', padding: '48px 0' }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>🔍</div>
            <p style={{ color: '#9CA3AF' }}>No icons in this collection yet.</p>
          </div>
        )}

        {/* No search results */}
        {filteredIcons.length === 0 && searchQuery && (
          <div style={{ textAlign: 'center', padding: '48px 0' }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>❌</div>
            <p style={{ color: '#9CA3AF', marginBottom: '8px' }}>No icons found for "{searchQuery}"</p>
            <button
              onClick={clearSearch}
              style={{
                color: '#3B82F6',
                fontSize: '14px',
                backgroundColor: 'transparent',
                border: 'none',
                cursor: 'pointer'
              }}
            >
              Clear search and show all icons
            </button>
          </div>
        )}
      </div>

      {/* Footer with Tips */}
      <div style={{ padding: '16px', borderTop: '1px solid #374151', backgroundColor: '#1F2937', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
          <div style={{ color: '#3B82F6', fontSize: '18px' }}>💡</div>
          <div style={{ fontSize: '14px', color: '#9CA3AF' }}>
            <p style={{ fontWeight: '500', marginBottom: '4px', color: 'white' }}>Pro Tips:</p>
            <ul style={{ listStyleType: 'disc', paddingLeft: '16px', margin: 0 }}>
              <li style={{ marginBottom: '4px' }}>Search by name, category, or keywords (e.g., "happy", "arrow", "business")</li>
              <li style={{ marginBottom: '4px' }}>Unicode icons scale perfectly and work in all browsers</li>
              <li style={{ marginBottom: '4px' }}>Use emoji icons for engaging, expressive content</li>
              <li>Technical symbols are perfect for diagrams and infographics</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EnhancedIconLibrary;
