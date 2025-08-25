// Comprehensive Shape & Asset Library
export interface ShapeDefinition {
  id: string;
  name: string;
  category: string;
  subcategory?: string;
  icon: string;
  type: 'basic' | 'geometric' | 'symbol' | 'arrow' | 'icon' | 'emoji';
  svgPath?: string;
  unicode?: string;
  keywords: string[];
  color?: string;
  strokeWidth?: number;
  fillable?: boolean;
}

export interface AssetCollection {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  shapes: ShapeDefinition[];
}

// Basic Geometric Shapes
const basicShapes: ShapeDefinition[] = [
  {
    id: 'rectangle',
    name: 'Rectangle',
    category: 'basic',
    icon: '⬜',
    type: 'basic',
    keywords: ['rectangle', 'square', 'box', 'frame'],
    fillable: true
  },
  {
    id: 'circle',
    name: 'Circle',
    category: 'basic',
    icon: '⭕',
    type: 'basic',
    keywords: ['circle', 'round', 'dot', 'ball'],
    fillable: true
  },
  {
    id: 'triangle',
    name: 'Triangle',
    category: 'basic',
    icon: '🔺',
    type: 'basic',
    keywords: ['triangle', 'arrow', 'point'],
    fillable: true
  },
  {
    id: 'square',
    name: 'Square',
    category: 'basic',
    icon: '⬛',
    type: 'basic',
    keywords: ['square', 'box', 'block'],
    fillable: true
  },
  {
    id: 'diamond',
    name: 'Diamond',
    category: 'basic',
    icon: '💎',
    type: 'geometric',
    keywords: ['diamond', 'rhombus', 'gem'],
    fillable: true
  },
  {
    id: 'hexagon',
    name: 'Hexagon',
    category: 'basic',
    icon: '⬡',
    type: 'geometric',
    keywords: ['hexagon', 'six', 'sided'],
    fillable: true
  },
  {
    id: 'pentagon',
    name: 'Pentagon',
    category: 'basic',
    icon: '⬟',
    type: 'geometric',
    keywords: ['pentagon', 'five', 'sided'],
    fillable: true
  },
  {
    id: 'octagon',
    name: 'Octagon',
    category: 'basic',
    icon: '⬢',
    type: 'geometric',
    keywords: ['octagon', 'eight', 'sided', 'stop'],
    fillable: true
  },
  {
    id: 'oval',
    name: 'Oval',
    category: 'basic',
    icon: '⭕',
    type: 'basic',
    keywords: ['oval', 'ellipse', 'egg'],
    fillable: true
  },
  {
    id: 'star',
    name: 'Star',
    category: 'basic',
    icon: '⭐',
    type: 'symbol',
    keywords: ['star', 'rating', 'favorite'],
    fillable: true
  }
];

// Advanced Geometric Shapes
const advancedShapes: ShapeDefinition[] = [
  {
    id: 'trapezoid',
    name: 'Trapezoid',
    category: 'advanced',
    icon: '▨',
    type: 'geometric',
    keywords: ['trapezoid', 'trapezium'],
    fillable: true
  },
  {
    id: 'parallelogram',
    name: 'Parallelogram',
    category: 'advanced',
    icon: '▱',
    type: 'geometric',
    keywords: ['parallelogram', 'slanted'],
    fillable: true
  },
  {
    id: 'rhombus',
    name: 'Rhombus',
    category: 'advanced',
    icon: '◊',
    type: 'geometric',
    keywords: ['rhombus', 'diamond', 'tilt'],
    fillable: true
  },
  {
    id: 'kite',
    name: 'Kite',
    category: 'advanced',
    icon: '🪁',
    type: 'geometric',
    keywords: ['kite', 'quadrilateral'],
    fillable: true
  },
  {
    id: 'crescent',
    name: 'Crescent',
    category: 'advanced',
    icon: '🌙',
    type: 'symbol',
    keywords: ['crescent', 'moon', 'arc'],
    fillable: true
  },
  {
    id: 'cross',
    name: 'Cross',
    category: 'advanced',
    icon: '➕',
    type: 'symbol',
    keywords: ['cross', 'plus', 'add', 'medical'],
    fillable: true
  }
];

// Arrow Shapes
const arrowShapes: ShapeDefinition[] = [
  {
    id: 'arrow-right',
    name: 'Arrow Right',
    category: 'arrows',
    icon: '➡️',
    type: 'arrow',
    keywords: ['arrow', 'right', 'next', 'forward'],
    fillable: true
  },
  {
    id: 'arrow-left',
    name: 'Arrow Left',
    category: 'arrows',
    icon: '⬅️',
    type: 'arrow',
    keywords: ['arrow', 'left', 'back', 'previous'],
    fillable: true
  },
  {
    id: 'arrow-up',
    name: 'Arrow Up',
    category: 'arrows',
    icon: '⬆️',
    type: 'arrow',
    keywords: ['arrow', 'up', 'top', 'increase'],
    fillable: true
  },
  {
    id: 'arrow-down',
    name: 'Arrow Down',
    category: 'arrows',
    icon: '⬇️',
    type: 'arrow',
    keywords: ['arrow', 'down', 'bottom', 'decrease'],
    fillable: true
  },
  {
    id: 'arrow-curved-right',
    name: 'Curved Arrow Right',
    category: 'arrows',
    icon: '↪️',
    type: 'arrow',
    keywords: ['arrow', 'curved', 'right', 'turn'],
    fillable: true
  },
  {
    id: 'arrow-curved-left',
    name: 'Curved Arrow Left',
    category: 'arrows',
    icon: '↩️',
    type: 'arrow',
    keywords: ['arrow', 'curved', 'left', 'return'],
    fillable: true
  },
  {
    id: 'arrow-double',
    name: 'Double Arrow',
    category: 'arrows',
    icon: '↔️',
    type: 'arrow',
    keywords: ['arrow', 'double', 'bidirectional', 'both'],
    fillable: true
  },
  {
    id: 'arrow-circular',
    name: 'Circular Arrow',
    category: 'arrows',
    icon: '🔄',
    type: 'arrow',
    keywords: ['arrow', 'circular', 'refresh', 'reload', 'cycle'],
    fillable: true
  }
];

// Business & Flowchart Shapes
const businessShapes: ShapeDefinition[] = [
  {
    id: 'flowchart-process',
    name: 'Process',
    category: 'flowchart',
    icon: '▭',
    type: 'geometric',
    keywords: ['process', 'flowchart', 'step'],
    fillable: true
  },
  {
    id: 'flowchart-decision',
    name: 'Decision',
    category: 'flowchart',
    icon: '◇',
    type: 'geometric',
    keywords: ['decision', 'flowchart', 'choice'],
    fillable: true
  },
  {
    id: 'flowchart-start',
    name: 'Start/End',
    category: 'flowchart',
    icon: '◯',
    type: 'geometric',
    keywords: ['start', 'end', 'flowchart', 'terminal'],
    fillable: true
  },
  {
    id: 'flowchart-database',
    name: 'Database',
    category: 'flowchart',
    icon: '🗃️',
    type: 'symbol',
    keywords: ['database', 'storage', 'data'],
    fillable: true
  },
  {
    id: 'flowchart-document',
    name: 'Document',
    category: 'flowchart',
    icon: '📄',
    type: 'symbol',
    keywords: ['document', 'file', 'paper'],
    fillable: true
  }
];

// Symbols & Icons
const symbolShapes: ShapeDefinition[] = [
  {
    id: 'heart',
    name: 'Heart',
    category: 'symbols',
    icon: '❤️',
    type: 'symbol',
    keywords: ['heart', 'love', 'like', 'favorite'],
    color: '#ff0000',
    fillable: true
  },
  {
    id: 'lightning',
    name: 'Lightning',
    category: 'symbols',
    icon: '⚡',
    type: 'symbol',
    keywords: ['lightning', 'bolt', 'energy', 'power', 'fast'],
    fillable: true
  },
  {
    id: 'cloud',
    name: 'Cloud',
    category: 'symbols',
    icon: '☁️',
    type: 'symbol',
    keywords: ['cloud', 'weather', 'sky', 'storage'],
    fillable: true
  },
  {
    id: 'sun',
    name: 'Sun',
    category: 'symbols',
    icon: '☀️',
    type: 'symbol',
    keywords: ['sun', 'sunny', 'weather', 'bright'],
    color: '#ffeb3b',
    fillable: true
  },
  {
    id: 'moon',
    name: 'Moon',
    category: 'symbols',
    icon: '🌙',
    type: 'symbol',
    keywords: ['moon', 'night', 'crescent'],
    fillable: true
  },
  {
    id: 'snowflake',
    name: 'Snowflake',
    category: 'symbols',
    icon: '❄️',
    type: 'symbol',
    keywords: ['snowflake', 'snow', 'winter', 'cold'],
    fillable: true
  },
  {
    id: 'fire',
    name: 'Fire',
    category: 'symbols',
    icon: '🔥',
    type: 'symbol',
    keywords: ['fire', 'flame', 'hot', 'trending'],
    color: '#ff5722',
    fillable: true
  }
];

// Technology Icons
const techShapes: ShapeDefinition[] = [
  {
    id: 'monitor',
    name: 'Monitor',
    category: 'technology',
    icon: '🖥️',
    type: 'icon',
    keywords: ['monitor', 'computer', 'screen', 'display'],
    fillable: true
  },
  {
    id: 'mobile',
    name: 'Mobile Phone',
    category: 'technology',
    icon: '📱',
    type: 'icon',
    keywords: ['mobile', 'phone', 'smartphone', 'device'],
    fillable: true
  },
  {
    id: 'laptop',
    name: 'Laptop',
    category: 'technology',
    icon: '💻',
    type: 'icon',
    keywords: ['laptop', 'computer', 'portable'],
    fillable: true
  },
  {
    id: 'tablet',
    name: 'Tablet',
    category: 'technology',
    icon: '📱',
    type: 'icon',
    keywords: ['tablet', 'ipad', 'device'],
    fillable: true
  },
  {
    id: 'wifi',
    name: 'WiFi',
    category: 'technology',
    icon: '📶',
    type: 'icon',
    keywords: ['wifi', 'wireless', 'internet', 'signal'],
    fillable: true
  },
  {
    id: 'gear',
    name: 'Gear',
    category: 'technology',
    icon: '⚙️',
    type: 'icon',
    keywords: ['gear', 'settings', 'configuration', 'cog'],
    fillable: true
  }
];

// Create the complete shape collections
export const shapeCollections: AssetCollection[] = [
  {
    id: 'basic',
    name: 'Basic Shapes',
    description: 'Essential geometric shapes for any design',
    icon: '⬛',
    color: 'bg-blue-500',
    shapes: basicShapes
  },
  {
    id: 'advanced',
    name: 'Advanced Geometry',
    description: 'Complex geometric shapes and forms',
    icon: '◊',
    color: 'bg-purple-500',
    shapes: advancedShapes
  },
  {
    id: 'arrows',
    name: 'Arrows & Directions',
    description: 'Directional arrows and flow indicators',
    icon: '➡️',
    color: 'bg-green-500',
    shapes: arrowShapes
  },
  {
    id: 'business',
    name: 'Business & Flowchart',
    description: 'Professional diagrams and flowcharts',
    icon: '▭',
    color: 'bg-indigo-500',
    shapes: businessShapes
  },
  {
    id: 'symbols',
    name: 'Symbols & Icons',
    description: 'Universal symbols and decorative elements',
    icon: '❤️',
    color: 'bg-red-500',
    shapes: symbolShapes
  },
  {
    id: 'technology',
    name: 'Technology',
    description: 'Tech devices and digital elements',
    icon: '💻',
    color: 'bg-cyan-500',
    shapes: techShapes
  }
];

// Utility functions
export const getAllShapes = (): ShapeDefinition[] => {
  return shapeCollections.flatMap(collection => collection.shapes);
};

export const getShapesByCategory = (categoryId: string): ShapeDefinition[] => {
  const collection = shapeCollections.find(c => c.id === categoryId);
  return collection ? collection.shapes : [];
};

export const searchShapes = (query: string): ShapeDefinition[] => {
  if (!query.trim()) return getAllShapes();
  
  const searchTerm = query.toLowerCase();
  return getAllShapes().filter(shape => 
    shape.name.toLowerCase().includes(searchTerm) ||
    shape.category.toLowerCase().includes(searchTerm) ||
    shape.keywords.some(keyword => keyword.toLowerCase().includes(searchTerm))
  );
};

export const getShapeById = (id: string): ShapeDefinition | undefined => {
  return getAllShapes().find(shape => shape.id === id);
};
