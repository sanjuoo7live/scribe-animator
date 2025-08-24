import { create } from 'zustand';

export interface SceneObject {
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

interface AppState {
  currentProject: Project | null;
  selectedObject: string | null;
  isPlaying: boolean;
  currentTime: number;
  compactUIOnPlay: boolean;
  
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
}

export const useAppStore = create<AppState>((set, get) => ({
  currentProject: null,
  selectedObject: null,
  isPlaying: false,
  currentTime: 0,
  compactUIOnPlay: false,

  setProject: (project) => set({ currentProject: project }),
  
  updateProject: (updates) => set((state) => ({
    currentProject: state.currentProject 
      ? { ...state.currentProject, ...updates }
      : null
  })),

  addObject: (object) => set((state) => ({
    currentProject: state.currentProject
      ? {
          ...state.currentProject,
          objects: [...state.currentProject.objects, object]
        }
      : null
  })),

  updateObject: (id, updates) => set((state) => ({
    currentProject: state.currentProject
      ? {
          ...state.currentProject,
          objects: state.currentProject.objects.map(obj =>
            obj.id === id ? { ...obj, ...updates } : obj
          )
        }
      : null
  })),

  removeObject: (id) => set((state) => ({
    currentProject: state.currentProject
      ? {
          ...state.currentProject,
          objects: state.currentProject.objects.filter(obj => obj.id !== id)
        }
      : null,
    selectedObject: state.selectedObject === id ? null : state.selectedObject
  })),

  selectObject: (id) => set({ selectedObject: id }),
  setPlaying: (playing) => set({ isPlaying: playing }),
  setCurrentTime: (time) => set({ currentTime: time }),
  setCompactUIOnPlay: (v) => set({ compactUIOnPlay: v }),
  
  moveObjectLayer: (id, direction) => set((state) => {
    if (!state.currentProject) return state;
    
    const objects = [...state.currentProject.objects];
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
      }
    };
  }),
}));

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
