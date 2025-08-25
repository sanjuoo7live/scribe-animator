// Icon Library with thousands of symbols
export interface IconDefinition {
  id: string;
  name: string;
  category: string;
  subcategory?: string;
  unicode: string;
  keywords: string[];
  font?: 'emoji' | 'symbols' | 'dingbats';
}

export interface IconCollection {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  icons: IconDefinition[];
}

// Emoji Icons (Unicode range)
const emojiIcons: IconDefinition[] = [
  // Faces & People
  { id: 'smile', name: 'Smile', category: 'faces', unicode: '😊', keywords: ['smile', 'happy', 'face', 'emotion'] },
  { id: 'laugh', name: 'Laugh', category: 'faces', unicode: '😂', keywords: ['laugh', 'joy', 'tears', 'funny'] },
  { id: 'wink', name: 'Wink', category: 'faces', unicode: '😉', keywords: ['wink', 'flirt', 'playful'] },
  { id: 'cool', name: 'Cool', category: 'faces', unicode: '😎', keywords: ['cool', 'sunglasses', 'awesome'] },
  { id: 'thinking', name: 'Thinking', category: 'faces', unicode: '🤔', keywords: ['thinking', 'pondering', 'question'] },
  { id: 'surprised', name: 'Surprised', category: 'faces', unicode: '😲', keywords: ['surprised', 'shocked', 'wow'] },
  
  // Gestures & Body
  { id: 'thumbs-up', name: 'Thumbs Up', category: 'gestures', unicode: '👍', keywords: ['thumbs', 'up', 'good', 'like', 'approve'] },
  { id: 'thumbs-down', name: 'Thumbs Down', category: 'gestures', unicode: '👎', keywords: ['thumbs', 'down', 'bad', 'dislike'] },
  { id: 'clap', name: 'Clapping', category: 'gestures', unicode: '👏', keywords: ['clap', 'applause', 'praise'] },
  { id: 'wave', name: 'Wave', category: 'gestures', unicode: '👋', keywords: ['wave', 'hello', 'goodbye', 'greeting'] },
  { id: 'point-right', name: 'Point Right', category: 'gestures', unicode: '👉', keywords: ['point', 'right', 'indicate'] },
  { id: 'point-left', name: 'Point Left', category: 'gestures', unicode: '👈', keywords: ['point', 'left', 'indicate'] },
  { id: 'point-up', name: 'Point Up', category: 'gestures', unicode: '👆', keywords: ['point', 'up', 'indicate'] },
  { id: 'point-down', name: 'Point Down', category: 'gestures', unicode: '👇', keywords: ['point', 'down', 'indicate'] },
  
  // Objects & Things
  { id: 'lightbulb', name: 'Light Bulb', category: 'objects', unicode: '💡', keywords: ['idea', 'light', 'bulb', 'innovation', 'bright'] },
  { id: 'target', name: 'Target', category: 'objects', unicode: '🎯', keywords: ['target', 'goal', 'aim', 'bullseye'] },
  { id: 'key', name: 'Key', category: 'objects', unicode: '🔑', keywords: ['key', 'unlock', 'access', 'password'] },
  { id: 'lock', name: 'Lock', category: 'objects', unicode: '🔒', keywords: ['lock', 'secure', 'private', 'protected'] },
  { id: 'trophy', name: 'Trophy', category: 'objects', unicode: '🏆', keywords: ['trophy', 'award', 'winner', 'champion'] },
  { id: 'medal', name: 'Medal', category: 'objects', unicode: '🏅', keywords: ['medal', 'award', 'achievement'] },
  { id: 'gift', name: 'Gift', category: 'objects', unicode: '🎁', keywords: ['gift', 'present', 'surprise', 'box'] },
  { id: 'money', name: 'Money', category: 'objects', unicode: '💰', keywords: ['money', 'cash', 'wealth', 'bag'] },
  { id: 'gem', name: 'Gem', category: 'objects', unicode: '💎', keywords: ['gem', 'diamond', 'precious', 'valuable'] },
  { id: 'crown', name: 'Crown', category: 'objects', unicode: '👑', keywords: ['crown', 'king', 'queen', 'royal'] },

  // Technology
  { id: 'computer', name: 'Computer', category: 'technology', unicode: '💻', keywords: ['computer', 'laptop', 'technology'] },
  { id: 'phone', name: 'Phone', category: 'technology', unicode: '📱', keywords: ['phone', 'mobile', 'smartphone'] },
  { id: 'camera', name: 'Camera', category: 'technology', unicode: '📷', keywords: ['camera', 'photo', 'picture'] },
  { id: 'microphone', name: 'Microphone', category: 'technology', unicode: '🎤', keywords: ['microphone', 'audio', 'recording'] },
  { id: 'headphones', name: 'Headphones', category: 'technology', unicode: '🎧', keywords: ['headphones', 'audio', 'music'] },
  { id: 'speaker', name: 'Speaker', category: 'technology', unicode: '🔊', keywords: ['speaker', 'sound', 'audio', 'volume'] },
  { id: 'tv', name: 'TV', category: 'technology', unicode: '📺', keywords: ['tv', 'television', 'screen', 'monitor'] },
  { id: 'satellite', name: 'Satellite', category: 'technology', unicode: '📡', keywords: ['satellite', 'signal', 'communication'] },

  // Nature & Weather
  { id: 'sun', name: 'Sun', category: 'nature', unicode: '☀️', keywords: ['sun', 'sunny', 'bright', 'day', 'weather'] },
  { id: 'moon', name: 'Moon', category: 'nature', unicode: '🌙', keywords: ['moon', 'night', 'crescent', 'lunar'] },
  { id: 'star', name: 'Star', category: 'nature', unicode: '⭐', keywords: ['star', 'rating', 'favorite', 'stellar'] },
  { id: 'cloud', name: 'Cloud', category: 'nature', unicode: '☁️', keywords: ['cloud', 'weather', 'sky', 'overcast'] },
  { id: 'lightning', name: 'Lightning', category: 'nature', unicode: '⚡', keywords: ['lightning', 'bolt', 'storm', 'power', 'energy'] },
  { id: 'fire', name: 'Fire', category: 'nature', unicode: '🔥', keywords: ['fire', 'flame', 'hot', 'burning', 'trending'] },
  { id: 'snowflake', name: 'Snowflake', category: 'nature', unicode: '❄️', keywords: ['snowflake', 'snow', 'winter', 'cold'] },
  { id: 'rainbow', name: 'Rainbow', category: 'nature', unicode: '🌈', keywords: ['rainbow', 'colors', 'arc', 'weather'] },
  { id: 'tree', name: 'Tree', category: 'nature', unicode: '🌳', keywords: ['tree', 'nature', 'green', 'environment'] },
  { id: 'flower', name: 'Flower', category: 'nature', unicode: '🌸', keywords: ['flower', 'blossom', 'spring', 'beautiful'] },

  // Transportation
  { id: 'car', name: 'Car', category: 'transportation', unicode: '🚗', keywords: ['car', 'vehicle', 'automobile', 'drive'] },
  { id: 'plane', name: 'Airplane', category: 'transportation', unicode: '✈️', keywords: ['airplane', 'plane', 'flight', 'travel'] },
  { id: 'train', name: 'Train', category: 'transportation', unicode: '🚂', keywords: ['train', 'railway', 'locomotive'] },
  { id: 'bike', name: 'Bicycle', category: 'transportation', unicode: '🚲', keywords: ['bicycle', 'bike', 'cycle', 'pedal'] },
  { id: 'ship', name: 'Ship', category: 'transportation', unicode: '🚢', keywords: ['ship', 'boat', 'vessel', 'ocean'] },
  { id: 'rocket', name: 'Rocket', category: 'transportation', unicode: '🚀', keywords: ['rocket', 'space', 'launch', 'fast', 'growth'] },

  // Food & Drinks
  { id: 'coffee', name: 'Coffee', category: 'food', unicode: '☕', keywords: ['coffee', 'drink', 'caffeine', 'morning'] },
  { id: 'pizza', name: 'Pizza', category: 'food', unicode: '🍕', keywords: ['pizza', 'food', 'slice', 'italian'] },
  { id: 'burger', name: 'Hamburger', category: 'food', unicode: '🍔', keywords: ['hamburger', 'burger', 'food', 'fast'] },
  { id: 'apple', name: 'Apple', category: 'food', unicode: '🍎', keywords: ['apple', 'fruit', 'healthy', 'red'] },
  { id: 'banana', name: 'Banana', category: 'food', unicode: '🍌', keywords: ['banana', 'fruit', 'yellow', 'healthy'] },
  { id: 'cake', name: 'Cake', category: 'food', unicode: '🍰', keywords: ['cake', 'dessert', 'sweet', 'birthday'] },

  // Sports & Activities
  { id: 'football', name: 'Football', category: 'sports', unicode: '⚽', keywords: ['football', 'soccer', 'ball', 'sport'] },
  { id: 'basketball', name: 'Basketball', category: 'sports', unicode: '🏀', keywords: ['basketball', 'ball', 'sport', 'hoop'] },
  { id: 'tennis', name: 'Tennis', category: 'sports', unicode: '🎾', keywords: ['tennis', 'ball', 'sport', 'racket'] },
  { id: 'music', name: 'Musical Note', category: 'activities', unicode: '🎵', keywords: ['music', 'note', 'song', 'melody'] },
  { id: 'art', name: 'Artist Palette', category: 'activities', unicode: '🎨', keywords: ['art', 'palette', 'painting', 'creative'] },
  { id: 'game', name: 'Game Controller', category: 'activities', unicode: '🎮', keywords: ['game', 'controller', 'gaming', 'play'] },

  // Symbols & Signs
  { id: 'heart', name: 'Heart', category: 'symbols', unicode: '❤️', keywords: ['heart', 'love', 'like', 'favorite', 'red'] },
  { id: 'check', name: 'Check Mark', category: 'symbols', unicode: '✅', keywords: ['check', 'correct', 'done', 'yes', 'approve'] },
  { id: 'cross', name: 'Cross Mark', category: 'symbols', unicode: '❌', keywords: ['cross', 'wrong', 'no', 'error', 'delete'] },
  { id: 'warning', name: 'Warning', category: 'symbols', unicode: '⚠️', keywords: ['warning', 'caution', 'alert', 'danger'] },
  { id: 'question', name: 'Question', category: 'symbols', unicode: '❓', keywords: ['question', 'help', 'unknown', 'ask'] },
  { id: 'exclamation', name: 'Exclamation', category: 'symbols', unicode: '❗', keywords: ['exclamation', 'important', 'urgent', 'attention'] },
  { id: 'information', name: 'Information', category: 'symbols', unicode: 'ℹ️', keywords: ['information', 'info', 'details', 'help'] },
  { id: 'recycle', name: 'Recycle', category: 'symbols', unicode: '♻️', keywords: ['recycle', 'environment', 'green', 'sustainable'] },
  { id: 'infinity', name: 'Infinity', category: 'symbols', unicode: '∞', keywords: ['infinity', 'endless', 'unlimited', 'forever'] },
  { id: 'peace', name: 'Peace', category: 'symbols', unicode: '☮️', keywords: ['peace', 'harmony', 'love', 'symbol'] }
];

// Geometric Symbols (Unicode Mathematical and Technical symbols)
const geometricSymbols: IconDefinition[] = [
  { id: 'circle-dot', name: 'Circle with Dot', category: 'geometric', unicode: '⊙', keywords: ['circle', 'dot', 'center', 'target'] },
  { id: 'square-dot', name: 'Square with Dot', category: 'geometric', unicode: '⊞', keywords: ['square', 'dot', 'center'] },
  { id: 'triangle-up', name: 'Triangle Up', category: 'geometric', unicode: '▲', keywords: ['triangle', 'up', 'arrow', 'point'] },
  { id: 'triangle-down', name: 'Triangle Down', category: 'geometric', unicode: '▼', keywords: ['triangle', 'down', 'arrow', 'point'] },
  { id: 'triangle-left', name: 'Triangle Left', category: 'geometric', unicode: '◄', keywords: ['triangle', 'left', 'arrow', 'point'] },
  { id: 'triangle-right', name: 'Triangle Right', category: 'geometric', unicode: '►', keywords: ['triangle', 'right', 'arrow', 'point'] },
  { id: 'diamond-filled', name: 'Diamond Filled', category: 'geometric', unicode: '◆', keywords: ['diamond', 'filled', 'solid'] },
  { id: 'diamond-outline', name: 'Diamond Outline', category: 'geometric', unicode: '◇', keywords: ['diamond', 'outline', 'hollow'] },
  { id: 'square-filled', name: 'Square Filled', category: 'geometric', unicode: '■', keywords: ['square', 'filled', 'solid'] },
  { id: 'square-outline', name: 'Square Outline', category: 'geometric', unicode: '□', keywords: ['square', 'outline', 'hollow'] },
  { id: 'circle-filled', name: 'Circle Filled', category: 'geometric', unicode: '●', keywords: ['circle', 'filled', 'solid', 'dot'] },
  { id: 'circle-outline', name: 'Circle Outline', category: 'geometric', unicode: '○', keywords: ['circle', 'outline', 'hollow'] },
  { id: 'star-filled', name: 'Star Filled', category: 'geometric', unicode: '★', keywords: ['star', 'filled', 'solid'] },
  { id: 'star-outline', name: 'Star Outline', category: 'geometric', unicode: '☆', keywords: ['star', 'outline', 'hollow'] },
  { id: 'plus', name: 'Plus', category: 'geometric', unicode: '+', keywords: ['plus', 'add', 'positive', 'cross'] },
  { id: 'minus', name: 'Minus', category: 'geometric', unicode: '−', keywords: ['minus', 'subtract', 'negative', 'dash'] },
  { id: 'multiply', name: 'Multiply', category: 'geometric', unicode: '×', keywords: ['multiply', 'times', 'cross'] },
  { id: 'divide', name: 'Divide', category: 'geometric', unicode: '÷', keywords: ['divide', 'division'] }
];

// Technical and Business Symbols
const technicalSymbols: IconDefinition[] = [
  { id: 'gear', name: 'Gear', category: 'technical', unicode: '⚙', keywords: ['gear', 'settings', 'configuration', 'mechanical'] },
  { id: 'wrench', name: 'Wrench', category: 'technical', unicode: '🔧', keywords: ['wrench', 'tool', 'repair', 'maintenance'] },
  { id: 'hammer', name: 'Hammer', category: 'technical', unicode: '🔨', keywords: ['hammer', 'tool', 'build', 'construction'] },
  { id: 'scissors', name: 'Scissors', category: 'technical', unicode: '✂️', keywords: ['scissors', 'cut', 'tool'] },
  { id: 'magnifying', name: 'Magnifying Glass', category: 'technical', unicode: '🔍', keywords: ['magnifying', 'search', 'zoom', 'find'] },
  { id: 'clipboard', name: 'Clipboard', category: 'business', unicode: '📋', keywords: ['clipboard', 'list', 'checklist', 'tasks'] },
  { id: 'chart-up', name: 'Chart Up', category: 'business', unicode: '📈', keywords: ['chart', 'graph', 'increase', 'growth', 'trending'] },
  { id: 'chart-down', name: 'Chart Down', category: 'business', unicode: '📉', keywords: ['chart', 'graph', 'decrease', 'decline'] },
  { id: 'briefcase', name: 'Briefcase', category: 'business', unicode: '💼', keywords: ['briefcase', 'business', 'work', 'professional'] },
  { id: 'calendar', name: 'Calendar', category: 'business', unicode: '📅', keywords: ['calendar', 'date', 'schedule', 'time'] },
  { id: 'clock', name: 'Clock', category: 'business', unicode: '🕐', keywords: ['clock', 'time', 'schedule', 'hour'] },
  { id: 'email', name: 'Email', category: 'business', unicode: '📧', keywords: ['email', 'message', 'mail', 'communication'] },
  { id: 'folder', name: 'Folder', category: 'business', unicode: '📁', keywords: ['folder', 'directory', 'files', 'organization'] },
  { id: 'document', name: 'Document', category: 'business', unicode: '📄', keywords: ['document', 'file', 'paper', 'text'] },
  { id: 'bookmark', name: 'Bookmark', category: 'business', unicode: '🔖', keywords: ['bookmark', 'tag', 'save', 'mark'] }
];

// Create icon collections
export const iconCollections: IconCollection[] = [
  {
    id: 'emojis',
    name: 'Emojis & Characters',
    description: 'Expressive emoji icons for engaging content',
    icon: '😊',
    color: 'bg-yellow-500',
    icons: emojiIcons
  },
  {
    id: 'geometric',
    name: 'Geometric Symbols',
    description: 'Mathematical and geometric symbols',
    icon: '◆',
    color: 'bg-blue-500',
    icons: geometricSymbols
  },
  {
    id: 'technical',
    name: 'Technical & Business',
    description: 'Professional and technical symbols',
    icon: '⚙',
    color: 'bg-gray-500',
    icons: technicalSymbols
  }
];

// Utility functions
export const getAllIcons = (): IconDefinition[] => {
  return iconCollections.flatMap(collection => collection.icons);
};

export const getIconsByCategory = (categoryId: string): IconDefinition[] => {
  const collection = iconCollections.find(c => c.id === categoryId);
  return collection ? collection.icons : [];
};

export const searchIcons = (query: string): IconDefinition[] => {
  if (!query.trim()) return getAllIcons();
  
  const searchTerm = query.toLowerCase();
  return getAllIcons().filter(icon => 
    icon.name.toLowerCase().includes(searchTerm) ||
    icon.category.toLowerCase().includes(searchTerm) ||
    icon.keywords.some(keyword => keyword.toLowerCase().includes(searchTerm))
  );
};

export const getIconById = (id: string): IconDefinition | undefined => {
  return getAllIcons().find(icon => icon.id === id);
};
