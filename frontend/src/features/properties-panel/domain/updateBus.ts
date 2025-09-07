import { useAppStore } from '../../../store/appStore';

type UpdateFn = () => void;

let queue: UpdateFn[] = [];
let rafId: number | null = null;
let gestureActive = false;

const flush = () => {
  rafId = null;
  if (queue.length === 0) return;
  const fns = queue;
  queue = [];
  fns.forEach((fn) => fn());
};

const endGesture = () => {
  flush();
  useAppStore.getState().commitTransaction();
  gestureActive = false;
  window.removeEventListener('mouseup', endGesture);
  window.removeEventListener('touchend', endGesture);
  window.removeEventListener('blur', endGesture, true);
};

export const dispatchPanelUpdate = (fn: UpdateFn) => {
  queue.push(fn);
  if (!rafId) {
    rafId = requestAnimationFrame(flush);
  }
  if (!gestureActive) {
    gestureActive = true;
    useAppStore.getState().beginTransaction();
    window.addEventListener('mouseup', endGesture);
    window.addEventListener('touchend', endGesture);
    window.addEventListener('blur', endGesture, true);
  }
};

