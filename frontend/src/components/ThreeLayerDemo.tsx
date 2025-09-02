import React, { useEffect, useRef, useState } from 'react';
import { HAND_ASSETS, TOOL_ASSETS } from '../types/handAssets';
import { ThreeLayerHandRenderer, ThreeLayerHandConfig } from '../utils/threeLayerHandRenderer';

const ThreeLayerDemo: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [renderer, setRenderer] = useState<ThreeLayerHandRenderer | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [currentPosition, setCurrentPosition] = useState({ x: 400, y: 300 });
  const [currentAngle, setCurrentAngle] = useState(0);

  const renderDemo = React.useCallback((
    handRenderer: ThreeLayerHandRenderer,
    handAsset: any,
    toolAsset: any,
    ctx: CanvasRenderingContext2D
  ) => {
    // Clear canvas
    ctx.clearRect(0, 0, 800, 600);
    
    // Draw background
    ctx.fillStyle = '#1f2937';
    ctx.fillRect(0, 0, 800, 600);

    // Draw title
    ctx.fillStyle = '#ffffff';
    ctx.font = '24px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('Three-Layer Hand Rendering Demo', 400, 40);
    
    // Draw subtitle
    ctx.fillStyle = '#9ca3af';
    ctx.font = '16px Arial';
    ctx.fillText('Z-order: Hand Background → Tool → Hand Foreground', 400, 65);

    // Create configuration for future use
    const config: ThreeLayerHandConfig = {
      handAsset,
      toolAsset,
      pathPosition: currentPosition,
      pathAngle: currentAngle,
      scale: 0.3,
      opacity: 1.0
    };

    // This would normally create Konva nodes, but for demo we'll draw to canvas
    drawLayerLabels(ctx);
    
    // Use config for future implementation
    console.log('Demo config:', config);
  }, [currentPosition, currentAngle]);

  useEffect(() => {
    const initialize = async () => {
      if (!canvasRef.current) return;

      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // Set canvas size
      canvas.width = 800;
      canvas.height = 600;

      try {
        // Create renderer and load assets
        const handRenderer = new ThreeLayerHandRenderer();
        const handAsset = HAND_ASSETS[0]; // Right hand pen grip
        const toolAsset = TOOL_ASSETS[1]; // Blue ballpoint pen

        await handRenderer.loadAssets(handAsset, toolAsset);
        
        setRenderer(handRenderer);
        setIsLoaded(true);
        
        // Initial render
        renderDemo(handRenderer, handAsset, toolAsset, ctx);
      } catch (error) {
        console.error('Failed to initialize three-layer demo:', error);
      }
    };

    initialize();
  }, [renderDemo]);

  const drawLayerLabels = (ctx: CanvasRenderingContext2D) => {
    const layers = [
      { name: 'Hand Background', color: '#fbbf24', y: 150, description: '(Palm + Lower Fingers)' },
      { name: 'Tool Layer', color: '#3b82f6', y: 250, description: '(Pen/Brush/Marker)' },
      { name: 'Hand Foreground', color: '#10b981', y: 350, description: '(Top Fingers + Thumb)' }
    ];

    layers.forEach((layer, index) => {
      // Draw layer box
      ctx.fillStyle = layer.color;
      ctx.fillRect(50, layer.y, 200, 60);
      
      // Draw layer number
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 20px Arial';
      ctx.textAlign = 'center';
      ctx.fillText(`${index + 1}`, 150, layer.y + 25);
      
      // Draw layer name
      ctx.font = '16px Arial';
      ctx.fillText(layer.name, 150, layer.y + 45);
      
      // Draw description
      ctx.fillStyle = '#6b7280';
      ctx.font = '14px Arial';
      ctx.textAlign = 'left';
      ctx.fillText(layer.description, 270, layer.y + 30);
      
      // Draw Z-order arrow
      if (index < layers.length - 1) {
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(150, layer.y + 70);
        ctx.lineTo(150, layer.y + 90);
        ctx.stroke();
        
        // Arrow head
        ctx.beginPath();
        ctx.moveTo(145, layer.y + 85);
        ctx.lineTo(150, layer.y + 90);
        ctx.lineTo(155, layer.y + 85);
        ctx.stroke();
      }
    });

    // Draw composition result
    ctx.fillStyle = '#8b5cf6';
    ctx.fillRect(450, 200, 300, 150);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 18px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('Final Composition', 600, 230);
    ctx.font = '14px Arial';
    ctx.fillText('Hand holding tool with', 600, 255);
    ctx.fillText('proper depth layering', 600, 275);
    ctx.fillText('Ready for path animation', 600, 320);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current || !renderer || !isLoaded) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    // Calculate angle based on movement
    const centerX = 400;
    const centerY = 300;
    const angle = Math.atan2(y - centerY, x - centerX);
    
    setCurrentPosition({ x, y });
    setCurrentAngle(angle);
    
    // Re-render with new position (in real implementation this would update Konva nodes)
    const ctx = canvasRef.current.getContext('2d');
    if (ctx) {
      const handAsset = HAND_ASSETS[0];
      const toolAsset = TOOL_ASSETS[1];
      renderDemo(renderer, handAsset, toolAsset, ctx);
      
      // Draw current position indicator
      ctx.fillStyle = '#ef4444';
      ctx.beginPath();
      ctx.arc(x, y, 5, 0, 2 * Math.PI);
      ctx.fill();
    }
  };

  return (
    <div className="space-y-4 p-4 text-white">
      <div className="text-center">
        <h3 className="text-xl font-bold mb-2">🎭 Three-Layer Hand Rendering</h3>
        <p className="text-gray-400 text-sm">
          Professional hand-tool composition with proper Z-ordering
        </p>
      </div>

      <canvas
        ref={canvasRef}
        className="border border-gray-600 rounded-lg mx-auto block cursor-crosshair"
        onMouseMove={handleMouseMove}
        style={{ maxWidth: '100%', height: 'auto' }}
      />

      <div className="bg-gray-800 p-4 rounded-lg border border-gray-600">
        <h4 className="font-semibold mb-3">📋 Implementation Details</h4>
        <div className="space-y-2 text-sm">
          <div className="grid grid-cols-3 gap-4">
            <div>
              <div className="font-semibold text-yellow-400">Layer 1 (Bottom)</div>
              <div className="text-gray-300">hand_bg.png</div>
              <div className="text-xs text-gray-500">Palm + lower fingers</div>
            </div>
            <div>
              <div className="font-semibold text-blue-400">Layer 2 (Middle)</div>
              <div className="text-gray-300">tool.png</div>
              <div className="text-xs text-gray-500">Pen/brush/marker</div>
            </div>
            <div>
              <div className="font-semibold text-green-400">Layer 3 (Top)</div>
              <div className="text-gray-300">hand_fg.png</div>
              <div className="text-xs text-gray-500">Top fingers + thumb</div>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-blue-900/20 border border-blue-700 rounded-lg p-4">
        <div className="text-blue-400 font-semibold mb-2">💡 How It Works</div>
        <div className="text-sm space-y-1 text-gray-300">
          <div>1. <strong>Hand Background</strong> renders first (behind everything)</div>
          <div>2. <strong>Tool</strong> renders on top of hand background</div>
          <div>3. <strong>Hand Foreground</strong> renders last (in front of tool)</div>
          <div>4. Mathematical alignment ensures perfect grip positioning</div>
          <div>5. All layers move together as one cohesive unit</div>
        </div>
      </div>

      {!isLoaded && (
        <div className="text-center text-gray-400">
          Loading three-layer assets...
        </div>
      )}
      
      {isLoaded && (
        <div className="text-center text-green-400 text-sm">
          ✅ Three-layer system ready! Move mouse to see positioning
        </div>
      )}
    </div>
  );
};

export default ThreeLayerDemo;
