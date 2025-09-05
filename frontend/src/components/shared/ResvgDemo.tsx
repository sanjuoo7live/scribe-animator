import React, { useEffect, useRef, useState } from 'react';
import { drawSvgOnCanvas } from '../../utils/resvgCanvas';

const sampleSvg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="300" height="200" viewBox="0 0 300 200">
  <rect x="0" y="0" width="300" height="200" fill="#fff"/>
  <circle cx="150" cy="100" r="70" fill="#4f46e5" stroke="#111827" stroke-width="4"/>
  <path d="M40,160 C120,40 180,40 260,160" fill="none" stroke="#111827" stroke-width="4"/>
  <text x="150" y="105" font-size="16" text-anchor="middle" fill="#fff">resvg-js demo</text>
 </svg>`;

export default function ResvgDemo() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const run = async () => {
      try {
        const canvas = canvasRef.current!;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        await drawSvgOnCanvas(ctx, sampleSvg, { fitTo: { mode: 'original' } });
      } catch (e: any) {
        setError(e?.message ?? String(e));
      }
    };
    run();
  }, []);

  return (
    <div style={{ display: 'grid', gap: 8 }}>
      <canvas ref={canvasRef} width={300} height={200} style={{ border: '1px solid #e5e7eb' }} />
      {error && <div style={{ color: 'crimson' }}>Error: {error}</div>}
    </div>
  );
}
