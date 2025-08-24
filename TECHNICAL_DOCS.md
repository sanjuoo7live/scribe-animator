# 🛠️ Scribe Animator - Technical Documentation

## Architecture Overview

### Technology Stack
- **Frontend**: React 18 + TypeScript
- **Canvas Rendering**: Konva.js + Canvas API
- **State Management**: Zustand
- **Styling**: CSS Modules + Custom CSS
- **Audio**: Web Audio API
- **Backend**: Node.js + Express
- **File Storage**: Local filesystem

### Project Structure
```
scrribe-animator/
├── frontend/
│   ├── src/
│   │   ├── components/         # React components
│   │   ├── store/             # Zustand store
│   │   ├── types/             # TypeScript definitions
│   │   └── utils/             # Helper functions
│   ├── public/                # Static assets
│   └── package.json
├── backend/
│   ├── server.js              # Express server
│   ├── data/                  # File storage
│   └── package.json
└── docs/                      # Documentation
```

---

## Core Components

### Application State (Zustand Store)

```typescript
interface AppState {
  currentProject: Project | null;
  selectedObject: string | null;
  isPlaying: boolean;
  currentTime: number;
  
  // Actions
  setProject: (project: Project) => void;
  updateProject: (updates: Partial<Project>) => void;
  addObject: (object: SceneObject) => void;
  updateObject: (id: string, updates: Partial<SceneObject>) => void;
  removeObject: (id: string) => void;
  selectObject: (id: string | null) => void;
  setPlaying: (playing: boolean) => void;
  setCurrentTime: (time: number) => void;
}
```

### Scene Object Interface

```typescript
interface SceneObject {
  id: string;
  type: 'shape' | 'text' | 'image' | 'drawing' | 'drawPath';
  x: number;
  y: number;
  width?: number;
  height?: number;
  rotation?: number;
  properties: any;
  animationStart?: number;
  animationDuration?: number;
  animationType?: 'fadeIn' | 'slideIn' | 'scaleIn' | 'drawIn' | 'none';
  animationEasing?: 'linear' | 'easeIn' | 'easeOut' | 'easeInOut';
}
```

### Project Interface

```typescript
interface Project {
  id: string;
  name: string;
  width: number;
  height: number;
  fps: number;
  duration: number;
  objects: SceneObject[];
  backgroundMusic?: string;
  voiceover?: string;
  boardStyle?: string;
  backgroundColor?: string;
  cameraPosition?: { x: number; y: number; zoom: number };
}
```

---

## Component Architecture

### Canvas Editor (`CanvasEditor.tsx`)
- **Purpose**: Main drawing surface using Konva.js
- **Features**:
  - Object rendering and manipulation
  - Real-time updates
  - Event handling (click, drag, resize)
  - Layer management

```typescript
// Key methods
const CanvasEditor: React.FC = () => {
  const [stage, setStage] = useState<Konva.Stage | null>(null);
  
  const handleObjectSelect = (id: string) => {
    selectObject(id);
  };
  
  const handleObjectUpdate = (id: string, newProps: any) => {
    updateObject(id, newProps);
  };
};
```

### Advanced Timeline (`AdvancedTimeline.tsx`)
- **Purpose**: Professional timeline with waveform support
- **Features**:
  - Multi-track display
  - Audio waveform visualization
  - Keyframe management
  - Playback controls

```typescript
// Timeline rendering
const drawWaveform = (audioData: number[], canvas: HTMLCanvasElement) => {
  const ctx = canvas.getContext('2d');
  // Waveform rendering logic
};
```

### AI Assistant (`AIAssistant.tsx`)
- **Purpose**: AI-powered animation assistance
- **Features**:
  - Natural language processing
  - Animation generation
  - Layout suggestions
  - Performance optimization

```typescript
interface AIAnimation {
  id: string;
  name: string;
  keyframes: any[];
  duration: number;
  easing: string;
}
```

---

## Advanced Features Implementation

### Plugin System (`PluginSystem.tsx`)

```typescript
interface PluginEffect {
  id: string;
  name: string;
  type: string;
  parameters: { [key: string]: any };
  apply: (object: SceneObject, parameters: any) => SceneObject;
}

const effectRegistry = new Map<string, PluginEffect>();

export const registerEffect = (effect: PluginEffect) => {
  effectRegistry.set(effect.id, effect);
};

export const applyEffect = (objectId: string, effectId: string, parameters: any) => {
  const effect = effectRegistry.get(effectId);
  if (effect) {
    const object = getObject(objectId);
    const modified = effect.apply(object, parameters);
    updateObject(objectId, modified);
  }
};
```

### Audio Engine (`AdvancedAudioEditor.tsx`)

```typescript
class AudioEngine {
  private context: AudioContext;
  private tracks: Map<string, AudioTrack>;
  
  constructor() {
    this.context = new AudioContext();
    this.tracks = new Map();
  }
  
  addTrack(file: File): Promise<AudioTrack> {
    return new Promise(async (resolve) => {
      const buffer = await file.arrayBuffer();
      const audioBuffer = await this.context.decodeAudioData(buffer);
      
      const track: AudioTrack = {
        id: generateId(),
        buffer: audioBuffer,
        source: null,
        effects: []
      };
      
      this.tracks.set(track.id, track);
      resolve(track);
    });
  }
  
  applyEffect(trackId: string, effect: AudioEffect) {
    const track = this.tracks.get(trackId);
    if (track) {
      track.effects.push(effect);
    }
  }
}
```

### Performance Analytics (`PerformanceAnalytics.tsx`)

```typescript
class PerformanceMonitor {
  private metrics: Map<string, number[]> = new Map();
  
  startMonitoring() {
    const monitor = () => {
      const renderTime = performance.now();
      // Measure render performance
      const memoryUsage = (performance as any).memory?.usedJSHeapSize || 0;
      
      this.recordMetric('renderTime', renderTime);
      this.recordMetric('memoryUsage', memoryUsage);
      
      requestAnimationFrame(monitor);
    };
    
    monitor();
  }
  
  recordMetric(name: string, value: number) {
    if (!this.metrics.has(name)) {
      this.metrics.set(name, []);
    }
    
    const values = this.metrics.get(name)!;
    values.push(value);
    
    // Keep only last 100 measurements
    if (values.length > 100) {
      values.shift();
    }
  }
  
  getAverageMetric(name: string): number {
    const values = this.metrics.get(name) || [];
    return values.reduce((a, b) => a + b, 0) / values.length;
  }
}
```

---

## Backend API

### Server Structure (`server.js`)

```javascript
const express = require('express');
const multer = require('multer');
const path = require('path');

const app = express();
const PORT = 3001;

// File upload configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'data/assets/');
  },
  filename: (req, file, cb) => {
    cb(null, `asset-${Date.now()}-${Math.random().toString(36).substr(2, 9)}${path.extname(file.originalname)}`);
  }
});

const upload = multer({ storage });
```

### API Endpoints

```javascript
// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Asset management
app.post('/api/assets', upload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }
  
  res.json({
    id: req.file.filename,
    originalName: req.file.originalname,
    size: req.file.size,
    url: `/api/assets/${req.file.filename}`
  });
});

app.get('/api/assets', (req, res) => {
  // Return list of assets
});

app.delete('/api/assets/:id', (req, res) => {
  // Delete specific asset
});

// Project management
app.post('/api/projects', (req, res) => {
  // Save project
});

app.get('/api/projects/:id', (req, res) => {
  // Load project
});

// Video export
app.post('/api/export', (req, res) => {
  // Export video (placeholder for FFmpeg integration)
});
```

---

## Performance Optimization

### Rendering Optimization

```typescript
// Canvas optimization
const optimizeCanvas = (stage: Konva.Stage) => {
  // Enable GPU acceleration
  stage.cache();
  stage.getLayer().batchDraw();
  
  // Limit frame rate
  const targetFPS = 60;
  const frameInterval = 1000 / targetFPS;
  let lastFrameTime = 0;
  
  const render = (currentTime: number) => {
    if (currentTime - lastFrameTime >= frameInterval) {
      stage.draw();
      lastFrameTime = currentTime;
    }
    requestAnimationFrame(render);
  };
  
  requestAnimationFrame(render);
};
```

### Memory Management

```typescript
// Object pool for frequent allocations
class ObjectPool<T> {
  private pool: T[] = [];
  private createFn: () => T;
  
  constructor(createFn: () => T, initialSize: number = 10) {
    this.createFn = createFn;
    for (let i = 0; i < initialSize; i++) {
      this.pool.push(createFn());
    }
  }
  
  acquire(): T {
    return this.pool.pop() || this.createFn();
  }
  
  release(obj: T) {
    this.pool.push(obj);
  }
}

// Usage
const vectorPool = new ObjectPool(() => ({ x: 0, y: 0 }), 100);
```

### Audio Optimization

```typescript
// Audio buffer management
class AudioBufferManager {
  private buffers: Map<string, AudioBuffer> = new Map();
  private maxSize = 50; // Maximum cached buffers
  
  async getBuffer(url: string): Promise<AudioBuffer> {
    if (this.buffers.has(url)) {
      return this.buffers.get(url)!;
    }
    
    const response = await fetch(url);
    const arrayBuffer = await response.arrayBuffer();
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
    
    // Cache management
    if (this.buffers.size >= this.maxSize) {
      const firstKey = this.buffers.keys().next().value;
      this.buffers.delete(firstKey);
    }
    
    this.buffers.set(url, audioBuffer);
    return audioBuffer;
  }
}
```

---

## Testing Strategy

### Unit Tests

```typescript
// Component testing with React Testing Library
import { render, screen, fireEvent } from '@testing-library/react';
import { CanvasEditor } from '../components/CanvasEditor';

describe('CanvasEditor', () => {
  test('renders canvas element', () => {
    render(<CanvasEditor />);
    const canvas = screen.getByRole('img'); // Konva creates canvas with img role
    expect(canvas).toBeInTheDocument();
  });
  
  test('handles object selection', () => {
    const mockSelectObject = jest.fn();
    render(<CanvasEditor onSelectObject={mockSelectObject} />);
    
    const canvas = screen.getByRole('img');
    fireEvent.click(canvas);
    
    expect(mockSelectObject).toHaveBeenCalled();
  });
});
```

### Integration Tests

```typescript
// Store testing
import { renderHook, act } from '@testing-library/react';
import { useAppStore } from '../store/appStore';

describe('AppStore', () => {
  test('adds object to project', () => {
    const { result } = renderHook(() => useAppStore());
    
    act(() => {
      result.current.setProject({
        id: 'test',
        name: 'Test Project',
        objects: []
      });
    });
    
    act(() => {
      result.current.addObject({
        id: 'obj1',
        type: 'text',
        x: 100,
        y: 100,
        properties: { text: 'Hello' }
      });
    });
    
    expect(result.current.currentProject?.objects).toHaveLength(1);
  });
});
```

### Performance Tests

```typescript
// Performance monitoring
const measureRenderTime = (component: React.ComponentType) => {
  const start = performance.now();
  render(React.createElement(component));
  const end = performance.now();
  return end - start;
};

describe('Performance', () => {
  test('canvas renders within acceptable time', () => {
    const renderTime = measureRenderTime(CanvasEditor);
    expect(renderTime).toBeLessThan(100); // 100ms threshold
  });
});
```

---

## Deployment

### Build Process

```bash
# Frontend build
cd frontend
npm run build

# Backend setup
cd backend
npm install
npm start

# Production deployment
docker build -t scribe-animator .
docker run -p 3000:3000 -p 3001:3001 scribe-animator
```

### Environment Configuration

```javascript
// config.js
const config = {
  development: {
    frontend: 'http://localhost:3000',
    backend: 'http://localhost:3001',
    apiUrl: 'http://localhost:3001/api'
  },
  production: {
    frontend: 'https://app.scribeanimator.com',
    backend: 'https://api.scribeanimator.com',
    apiUrl: 'https://api.scribeanimator.com/api'
  }
};

export default config[process.env.NODE_ENV || 'development'];
```

---

## Extension Points

### Custom Plugins

```typescript
// Plugin interface
interface Plugin {
  id: string;
  name: string;
  version: string;
  initialize: (app: AppInstance) => void;
  cleanup: () => void;
}

// Plugin registration
export const registerPlugin = (plugin: Plugin) => {
  plugins.set(plugin.id, plugin);
  plugin.initialize(appInstance);
};

// Example plugin
const fadePlugin: Plugin = {
  id: 'fade-effect',
  name: 'Fade Effects',
  version: '1.0.0',
  initialize: (app) => {
    app.registerEffect({
      id: 'custom-fade',
      name: 'Custom Fade',
      apply: (object, params) => ({
        ...object,
        animationType: 'fadeIn',
        animationDuration: params.duration
      })
    });
  },
  cleanup: () => {
    // Cleanup resources
  }
};
```

### Custom Exporters

```typescript
interface Exporter {
  id: string;
  name: string;
  formats: string[];
  export: (project: Project, options: ExportOptions) => Promise<Blob>;
}

const customExporter: Exporter = {
  id: 'custom-gif',
  name: 'Enhanced GIF',
  formats: ['gif'],
  export: async (project, options) => {
    // Custom export logic
    return new Blob();
  }
};

exportRegistry.register(customExporter);
```

---

## Security Considerations

### File Upload Security

```javascript
// File validation
const validateFile = (file) => {
  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'audio/mpeg', 'audio/wav'];
  const maxSize = 10 * 1024 * 1024; // 10MB
  
  if (!allowedTypes.includes(file.mimetype)) {
    throw new Error('Invalid file type');
  }
  
  if (file.size > maxSize) {
    throw new Error('File too large');
  }
};

// Sanitize file names
const sanitizeFilename = (filename) => {
  return filename.replace(/[^a-zA-Z0-9.-]/g, '_');
};
```

### XSS Prevention

```typescript
// Sanitize user input
import DOMPurify from 'dompurify';

const sanitizeText = (text: string): string => {
  return DOMPurify.sanitize(text);
};

// Use in text objects
const createTextObject = (text: string) => ({
  id: generateId(),
  type: 'text',
  properties: {
    text: sanitizeText(text)
  }
});
```

---

## Future Enhancements

### Planned Features
1. **Cloud Storage Integration**
2. **Advanced Physics Engine**
3. **3D Object Support**
4. **Real-time Voice Recognition**
5. **Advanced AI Models**
6. **Mobile App Companion**

### Technical Debt
1. **Migration to Canvas 2D + WebGL**
2. **Improved TypeScript Coverage**
3. **Component Library Standardization**
4. **Performance Profiling Integration**

---

*Technical Documentation v2.0 - For Scribe Animator*  
*Last Updated: August 24, 2025*
