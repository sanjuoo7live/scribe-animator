import { create } from 'zustand';

export interface SceneObject {
  id: string;
  type: 'shape' | 'text' | 'image' | 'drawing' | 'drawPath' | 'videoEmbed';
  x: number;
  y: number;
  width?: number;
  height?: number;
  rotation?: number;
  properties: any;
  animationStart?: number;
  animationDuration?: number;
  animationType?: 'fadeIn' | 'slideIn' | 'scaleIn' | 'drawIn' | 'pathFollow' | 'none';
  animationEasing?: 'linear' | 'easeIn' | 'easeOut' | 'easeInOut';
}

export interface Project {
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

interface HistoryState {
  past: Project[];
  present: Project | null;
  future: Project[];
}

interface AppState {
  currentProject: Project | null;
  selectedObject: string | null;
  isPlaying: boolean;
  currentTime: number;
  compactUIOnPlay: boolean;
  
  // History for undo/redo
  history: HistoryState;
  
  // Actions
  setProject: (project: Project) => void;
  updateProject: (updates: Partial<Project>) => void;
  addObject: (object: SceneObject) => void;
  updateObject: (id: string, updates: Partial<SceneObject>) => void;
  removeObject: (id: string) => void;
  selectObject: (id: string | null) => void;
  setPlaying: (playing: boolean) => void;
  setCurrentTime: (time: number) => void;
  setCompactUIOnPlay: (v: boolean) => void;
  moveObjectLayer: (id: string, direction: 'front' | 'back' | 'forward' | 'backward') => void;
  
  // Undo/Redo actions
  undo: () => void;
  redo: () => void;
  canUndo: () => boolean;
  canRedo: () => boolean;
}

export const useAppStore = create<AppState>((set, get) => {
  // Ensure a project has the expected shape regardless of backend variations
  const normalizeProject = (input: any): Project => {
    const settings = input?.settings || {};
    const width = Number(input?.width ?? settings.width ?? 1920);
    const height = Number(input?.height ?? settings.height ?? 1080);
    const fps = Number(input?.fps ?? settings.fps ?? 30);
    const duration = Number(input?.duration ?? settings.duration ?? 30);

    const rawObjects = Array.isArray(input?.objects) ? input.objects : [];
    const objects: SceneObject[] = rawObjects.map((obj: any, index: number) => ({
      id: obj?.id ?? `obj-${Date.now()}-${index}`,
      type: obj?.type ?? 'shape',
      x: Number(obj?.x ?? 0),
      y: Number(obj?.y ?? 0),
      width: obj?.width,
      height: obj?.height,
      rotation: obj?.rotation,
      properties: obj?.properties ?? {},
      animationStart: obj?.animationStart,
      animationDuration: obj?.animationDuration,
      animationType: obj?.animationType,
      animationEasing: obj?.animationEasing,
    }));

    return {
      id: String(input?.id ?? `project-${Date.now()}`),
      name: String(input?.name ?? 'Untitled Project'),
      width,
      height,
      fps,
      duration,
      objects,
      boardStyle: input?.boardStyle ?? settings.boardStyle ?? 'whiteboard',
      backgroundColor: input?.backgroundColor ?? settings.backgroundColor ?? '#ffffff',
      cameraPosition: input?.cameraPosition ?? { x: 0, y: 0, zoom: 1 },
      backgroundMusic: input?.backgroundMusic,
      voiceover: input?.voiceover,
    };
  };

  // Helper function to save current state to history
  const saveToHistory = () => {
    const state = get();
    if (!state.currentProject) return state.history;
    
    const newHistory = {
      past: [...state.history.past, state.history.present].filter(Boolean) as Project[],
      present: JSON.parse(JSON.stringify(state.currentProject)), // Deep clone
      future: [] // Clear future when new action is performed
    };
    
    // Limit history to last 50 states to prevent memory issues
    if (newHistory.past.length > 50) {
      newHistory.past = newHistory.past.slice(-50);
    }
    
    return newHistory;
  };

  return {
    currentProject: null,
    selectedObject: null,
    isPlaying: false,
    currentTime: 0,
    compactUIOnPlay: false,
    history: {
      past: [],
      present: null,
      future: []
    },

    setProject: (project) => set(() => {
      const normalized = normalizeProject(project);
      return {
        currentProject: normalized,
        history: {
          past: [],
          present: JSON.parse(JSON.stringify(normalized)),
          future: []
        }
      };
    }),
    
    updateProject: (updates) => set((state) => {
      const newHistory = saveToHistory();
      return {
        currentProject: state.currentProject 
          ? { ...state.currentProject, ...updates }
          : null,
        history: newHistory
      };
    }),

    addObject: (object) => set((state) => {
      const newHistory = saveToHistory();
      if (!state.currentProject) return { currentProject: null, history: newHistory };
      const prevObjects = Array.isArray(state.currentProject.objects) ? state.currentProject.objects : [];
      return {
        currentProject: {
          ...state.currentProject,
          objects: [...prevObjects, object]
        },
        history: newHistory
      };
    }),

    updateObject: (id, updates) => set((state) => {
      const newHistory = saveToHistory();
      if (!state.currentProject) return { currentProject: null, history: newHistory };
      const prevObjects = Array.isArray(state.currentProject.objects) ? state.currentProject.objects : [];
      return {
        currentProject: {
          ...state.currentProject,
          objects: prevObjects.map(obj => (obj.id === id ? { ...obj, ...updates } : obj))
        },
        history: newHistory
      };
    }),

    removeObject: (id) => set((state) => {
      const newHistory = saveToHistory();
      if (!state.currentProject) return { currentProject: null, selectedObject: state.selectedObject, history: newHistory } as any;
      const prevObjects = Array.isArray(state.currentProject.objects) ? state.currentProject.objects : [];
      return {
        currentProject: {
          ...state.currentProject,
          objects: prevObjects.filter(obj => obj.id !== id)
        },
        selectedObject: state.selectedObject === id ? null : state.selectedObject,
        history: newHistory
      };
    }),

    selectObject: (id) => set({ selectedObject: id }),
    setPlaying: (playing) => set({ isPlaying: playing }),
    setCurrentTime: (time) => set({ currentTime: time }),
    setCompactUIOnPlay: (v) => set({ compactUIOnPlay: v }),
    
    moveObjectLayer: (id, direction) => set((state) => {
      if (!state.currentProject) return state;
      
      const newHistory = saveToHistory();
      const objects = [...(Array.isArray(state.currentProject.objects) ? state.currentProject.objects : [])];
      const objectIndex = objects.findIndex(obj => obj.id === id);
      
      if (objectIndex === -1) return state;
      
      const object = objects[objectIndex];
      objects.splice(objectIndex, 1);
      
      let newIndex = objectIndex;
      switch (direction) {
        case 'front':
          newIndex = objects.length;
          break;
        case 'back':
          newIndex = 0;
          break;
        case 'forward':
          newIndex = Math.min(objectIndex + 1, objects.length);
          break;
        case 'backward':
          newIndex = Math.max(objectIndex - 1, 0);
          break;
      }
      
      objects.splice(newIndex, 0, object);
      
      return {
        currentProject: {
          ...state.currentProject,
          objects
        },
        history: newHistory
      };
    }),

    // Undo/Redo functionality
    undo: () => set((state) => {
      if (state.history.past.length === 0) return state;
      
      const previous = state.history.past[state.history.past.length - 1];
      const newPast = state.history.past.slice(0, state.history.past.length - 1);
      
      return {
        currentProject: previous,
        history: {
          past: newPast,
          present: previous,
          future: [state.history.present, ...state.history.future].filter(Boolean) as Project[]
        }
      };
    }),

    redo: () => set((state) => {
      if (state.history.future.length === 0) return state;
      
      const next = state.history.future[0];
      const newFuture = state.history.future.slice(1);
      
      return {
        currentProject: next,
        history: {
          past: [...state.history.past, state.history.present].filter(Boolean) as Project[],
          present: next,
          future: newFuture
        }
      };
    }),

    canUndo: () => {
      const state = get();
      return state.history.past.length > 0;
    },

    canRedo: () => {
      const state = get();
      return state.history.future.length > 0;
    },
  };
});

// Default project template
export const createDefaultProject = (): Project => ({
  id: Date.now().toString(),
  name: 'New Project',
  width: 1920,
  height: 1080,
  fps: 30,
  duration: 30,
  objects: [],
  boardStyle: 'whiteboard',
  backgroundColor: '#ffffff',
  cameraPosition: { x: 0, y: 0, zoom: 1 }
});
