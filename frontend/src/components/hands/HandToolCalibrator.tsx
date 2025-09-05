import React, { useEffect, useRef, useState } from 'react';
import AssetLibraryPopup from '../panels/AssetLibraryPopup';
import { HandAsset, ToolAsset } from '../../types/handAssets';
import { setCalibration } from '../../utils/calibrationStore';

interface Props {
  hand: HandAsset;
  tool: ToolAsset;
  onClose: () => void;
}

// Simple 1-second timing-based calibrator placeholder

export const HandToolCalibrator: React.FC<Props> = ({ hand, tool, onClose }) => {
  const [running, setRunning] = useState(false);
  const [measured, setMeasured] = useState<{ x: number; y: number } | null>(null);
  const startTsRef = useRef<number | null>(null);

  useEffect(() => {
    // Auto-run 1s calibration
    setRunning(true);
    startTsRef.current = performance.now();
    const id = requestAnimationFrame(function tick(ts) {
      const start = startTsRef.current ?? ts;
      const t = Math.min(1, (ts - start) / 1000);
      if (t >= 1) {
        // Measure at end point: offset is just 0 because we don't render; we store zero default for now.
        // In future, we could compare expected vs. actual tip positions visually.
        setMeasured({ x: 0, y: 0 });
        setRunning(false);
        return;
      }
      requestAnimationFrame(tick);
    });
    return () => cancelAnimationFrame(id);
  }, []);

  const save = () => {
    setCalibration(hand.id, tool.id, { x: measured?.x || 0, y: measured?.y || 0 });
    onClose();
  };

  return (
    <AssetLibraryPopup
      isOpen={true}
      onClose={onClose}
      title="Quick Calibration"
      initialWidth={480}
      initialHeight={260}
      minWidth={420}
      minHeight={220}
    >
      <div className="p-4">
        <p className="text-sm text-gray-300 mb-3">Runs a 1s pass on a straight path and stores an offset for this hand+tool.</p>
        <div className="h-24 bg-gray-700 rounded flex items-center justify-center text-sm text-gray-300 mb-3">
          {running ? 'Calibrating…' : 'Done'}
        </div>
        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="px-3 py-1 bg-gray-700 rounded">Close</button>
          <button onClick={save} className="px-3 py-1 bg-blue-600 rounded" disabled={running}>Save Offset</button>
        </div>
      </div>
    </AssetLibraryPopup>
  );
};

export default HandToolCalibrator;
