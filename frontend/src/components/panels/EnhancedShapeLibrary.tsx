import React, { useState, useMemo } from 'react';
import { useAppStore } from '../../store/appStore';
import { shapeCollections, searchShapes, ShapeDefinition } from '../../data/shapeLibrary';

interface EnhancedShapeLibraryProps {
  onAddShape?: (shape: ShapeDefinition) => void;
}

const EnhancedShapeLibrary: React.FC<EnhancedShapeLibraryProps> = ({ onAddShape }) => {
  const { addObject, currentProject, currentTime } = useAppStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCollection, setSelectedCollection] = useState<string>('basic');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  // Search and filter shapes
  const filteredShapes = useMemo(() => {
    if (searchTerm.trim()) {
      return searchShapes(searchTerm);
    }
    
    const collection = shapeCollections.find(c => c.id === selectedCollection);
    return collection ? collection.shapes : [];
  }, [searchTerm, selectedCollection]);

  // Add shape to canvas
  const addShapeToCanvas = (shape: ShapeDefinition) => {
    if (!currentProject) {
      alert('Please create a project first');
      return;
    }

    // Custom callback if provided
    if (onAddShape) {
      onAddShape(shape);
      return;
    }

    // Default behavior - add to canvas
    const newObject = {
      id: `${shape.id}-${Date.now()}`,
      type: 'shape' as const,
      x: 100 + Math.random() * 200, // Add some randomness
      y: 100 + Math.random() * 200,
      width: 100,
      height: 100,
      rotation: 0,
      properties: {
        shapeType: shape.id,
        fill: shape.color || 'transparent',
        stroke: '#000000',
        strokeWidth: shape.strokeWidth || 2,
        assetId: shape.id,
        assetName: shape.name,
        assetType: shape.type
      },
      animationStart: currentTime,
      animationDuration: 5,
      animationType: 'none' as const,
      animationEasing: 'easeOut' as const
    };

    addObject(newObject);
  };

  const ShapeCard: React.FC<{ shape: ShapeDefinition; isCompact?: boolean }> = ({ shape, isCompact = false }) => (
    <div
      key={shape.id}
      onClick={() => addShapeToCanvas(shape)}
      className={`
        ${isCompact ? 'p-2' : 'p-3'} 
        rounded-lg border
        cursor-pointer transition-all duration-200 
        hover:scale-105 hover:shadow-lg
        flex flex-col items-center text-center
      `}
      style={{
        backgroundColor: '#374151',
        borderColor: '#4B5563',
        color: 'white'
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.backgroundColor = '#4B5563';
        e.currentTarget.style.borderColor = '#6B7280';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.backgroundColor = '#374151';
        e.currentTarget.style.borderColor = '#4B5563';
      }}
      title={`${shape.name} - Click to add to canvas`}
    >
      <div className={`${isCompact ? 'text-2xl mb-1' : 'text-3xl mb-2'}`}>
        {shape.icon}
      </div>
      <div className={`
        ${isCompact ? 'text-xs' : 'text-sm'} 
        font-medium text-white truncate w-full
      `}>
        {shape.name}
      </div>
      {!isCompact && (
        <div className="text-xs text-gray-400 mt-1 capitalize">
          {shape.category}
        </div>
      )}
    </div>
  );

  const CollectionTabs: React.FC = () => (
    <div className="flex flex-wrap gap-1 mb-4">
      {shapeCollections.map((collection) => {
        const isSelected = selectedCollection === collection.id;
        return (
          <button
            key={collection.id}
            onClick={() => {
              setSelectedCollection(collection.id);
              setSearchTerm(''); // Clear search when switching collections
            }}
            className="px-3 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 flex-shrink-0"
            title={collection.description}
            style={{
              backgroundColor: isSelected ? '#2563EB' : '#374151', // blue-600 vs gray-700
              color: isSelected ? '#FFFFFF' : '#D1D5DB', // white vs gray-300
              border: '1px solid #4B5563', // gray-600
              boxShadow: isSelected ? '0 8px 16px rgba(0,0,0,0.35)' : 'none'
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.backgroundColor = isSelected ? '#1D4ED8' : '#4B5563'; // darker on hover
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.backgroundColor = isSelected ? '#2563EB' : '#374151';
            }}
          >
            <span>{collection.icon}</span>
            <span className="hidden sm:inline">{collection.name}</span>
            <span
              className="inline-flex justify-center rounded-full text-xs border"
              style={{
                minWidth: 24,
                padding: '2px 8px',
                backgroundColor: isSelected ? 'rgba(255,255,255,0.2)' : 'rgba(17,24,39,0.7)', // white/20 vs gray-900/70
                color: isSelected ? '#FFFFFF' : '#E5E7EB', // white vs gray-200
                borderColor: isSelected ? 'rgba(255,255,255,0.25)' : '#374151'
              }}
            >
              {collection.shapes.length}
            </span>
          </button>
        );
      })}
    </div>
  );

  const SearchBar: React.FC = () => (
    <div className="mb-4">
      <div
        className="flex items-center w-full bg-gray-700 border border-gray-600 rounded-lg overflow-hidden"
        role="search"
        aria-label="Search shapes"
      >
        <span className="px-3 text-gray-400 select-none">🔎</span>
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search shapes... (e.g., 'arrow', 'business', 'heart')"
          className="flex-1 p-3 bg-transparent text-white placeholder-gray-400 focus:outline-none"
        />
        {searchTerm && (
          <button
            onClick={() => setSearchTerm('')}
            className="px-2 py-2 text-gray-300 hover:text-white focus:outline-none"
            title="Clear search"
            aria-label="Clear search"
          >
            ✕
          </button>
        )}
        <span className="w-px h-6 bg-gray-600 mx-1" aria-hidden="true" />
        <button
          onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
          className="px-3 py-2 text-gray-200 hover:bg-gray-600 focus:outline-none"
          title={`Switch to ${viewMode === 'grid' ? 'list' : 'grid'} view`}
          aria-pressed={viewMode === 'list'}
        >
          {viewMode === 'grid' ? '☰' : '▦'}
        </button>
      </div>
      {searchTerm && (
        <div className="text-sm text-gray-400 mt-2">
          Found {filteredShapes.length} shapes for "{searchTerm}"
        </div>
      )}
    </div>
  );

  const ShapesGrid: React.FC = () => {
    if (filteredShapes.length === 0) {
      return (
        <div className="text-center py-8 text-gray-400">
          <div className="text-4xl mb-2">🔍</div>
          <div className="text-lg font-medium mb-1">No shapes found</div>
          <div className="text-sm">
            {searchTerm 
              ? `Try searching for something else or browse collections above`
              : 'Select a collection to view shapes'
            }
          </div>
        </div>
      );
    }

    const gridCols = viewMode === 'grid' ? 'grid-cols-3 sm:grid-cols-4' : 'grid-cols-2';
    
    return (
      <div className={`grid ${gridCols} gap-2 pb-4`}>
        {filteredShapes.map((shape) => (
          <ShapeCard 
            key={shape.id} 
            shape={shape} 
            isCompact={viewMode === 'list'} 
          />
        ))}
      </div>
    );
  };

  const QuickStats: React.FC = () => {
    const totalShapes = shapeCollections.reduce((sum, collection) => sum + collection.shapes.length, 0);
    const currentCollection = shapeCollections.find(c => c.id === selectedCollection);
    
    return (
      <div className="flex justify-between items-center text-xs text-gray-400 mb-4 px-1">
        <div>
          Total: {totalShapes} shapes across {shapeCollections.length} collections
        </div>
        {currentCollection && !searchTerm && (
          <div>
            {currentCollection.name}: {currentCollection.shapes.length} shapes
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="h-full flex flex-col" style={{ backgroundColor: '#111827', color: 'white' }}>
      <div className="p-4 flex-shrink-0" style={{ backgroundColor: '#111827' }}>
        <div className="mb-6">
          <h3 className="text-lg font-bold text-white mb-2 flex items-center gap-2">
            <span>⬛</span>
            Enhanced Shape Library
          </h3>
          <p className="text-sm text-gray-300 mb-4">
            Choose from hundreds of shapes, symbols, and icons. Use search or browse by category.
          </p>
        </div>

        <SearchBar />
        
        {!searchTerm && <CollectionTabs />}
        
        <QuickStats />
      </div>

      <div className="flex-1 overflow-y-auto px-4" style={{ backgroundColor: '#111827' }}>
        <ShapesGrid />
      </div>

      {/* Pro Tips (compact) */}
      <div className="px-4 pb-3 flex-shrink-0" style={{ backgroundColor: '#111827' }}>
        <div className="px-3 py-2 bg-gray-900 rounded-lg border border-gray-700">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] leading-snug text-gray-300">
            <span>💡</span>
            <span>Search keywords: "business", "arrow", "tech"</span>
            <span className="hidden sm:inline">• Click a shape to add</span>
            <span className="hidden md:inline">• Use collections</span>
            <span className="hidden md:inline">• Toggle grid/list</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EnhancedShapeLibrary;
