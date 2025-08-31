import React from 'react';
import { useCanvasContext } from './canvas/CanvasContext';

export const AnimationTest: React.FC = () => {
  const { clock } = useCanvasContext();
  const currentTime = clock.getTime();

  // Test animation progress calculation
  const animStart = 0;
  const animDuration = 3;
  const elapsed = Math.min(Math.max(currentTime - animStart, 0), animDuration);
  const progress = animDuration > 0 ? elapsed / animDuration : 1;

  const easing: string = 'easeOut';
  const ease = (p: number) => {
    switch (easing) {
      case 'easeIn': return p * p;
      case 'easeOut': return 1 - Math.pow(1 - p, 2);
      case 'easeInOut': return p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2;
      default: return p;
    }
  };
  const ep = ease(progress);

  const totalPoints = 10;
  const animationType = 'drawIn';
  const globalReveal = animationType === 'drawIn' && totalPoints > 1
    ? Math.max(1, Math.floor(ep * totalPoints + 0.00001))
    : totalPoints;

  return (
    <div style={{
      position: 'fixed',
      top: '10px',
      right: '10px',
      background: 'rgba(0,0,0,0.8)',
      color: 'white',
      padding: '10px',
      borderRadius: '5px',
      fontSize: '12px',
      zIndex: 9999
    }}>
      <div>Current Time: {currentTime.toFixed(2)}s</div>
      <div>Progress: {(progress * 100).toFixed(1)}%</div>
      <div>Eased Progress: {(ep * 100).toFixed(1)}%</div>
      <div>Points Revealed: {globalReveal}/{totalPoints}</div>
      <div>Animation Active: {progress > 0 && progress < 1 ? 'YES' : 'NO'}</div>
    </div>
  );
};
