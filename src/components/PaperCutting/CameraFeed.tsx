import React, { useEffect, useRef, useState } from 'react';

interface CameraFeedProps {
  sourceRef: React.RefObject<HTMLCanvasElement | null>;
  className?: string;
  style?: React.CSSProperties;
  width?: number; // Optional: use parent's width
  height?: number; // Optional: use parent's height
}

/**
 * CameraFeed component - displays live feed from MediaPipe canvas
 * Uses requestAnimationFrame to continuously copy from source canvas
 * Canvas size is responsive: 60% of page width with 9:16 aspect ratio (or uses provided dimensions)
 */
const CameraFeed: React.FC<CameraFeedProps> = ({ sourceRef, className = '', style = {}, width, height }) => {
  const displayCanvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [canvasDimensions, setCanvasDimensions] = useState({ width: 0, height: 0 });

  // Calculate canvas dimensions based on parent container or page width
  useEffect(() => {
    const updateCanvasSize = () => {
      // If width/height props provided, use those
      if (width && height) {
        setCanvasDimensions({ width, height });
        return;
      }

      // Otherwise use container size if available
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        const canvasWidth = Math.floor(rect.width);
        const canvasHeight = Math.floor(rect.height);
        setCanvasDimensions({ width: canvasWidth, height: canvasHeight });
        console.log('CameraFeed: canvas size from container', canvasWidth, 'x', canvasHeight);
        return;
      }

      // Fallback: calculate from window width
      const pageWidth = window.innerWidth;
      const canvasWidth = Math.floor(pageWidth * 0.7);
      const canvasHeight = Math.floor(canvasWidth / 10 * 16); // 10:16 aspect ratio
      
      setCanvasDimensions({ width: canvasWidth, height: canvasHeight });
      console.log('CameraFeed: canvas size from window', canvasWidth, 'x', canvasHeight);
    };

    // Initial calculation
    updateCanvasSize();

    // Update on window resize
    window.addEventListener('resize', updateCanvasSize);
    return () => window.removeEventListener('resize', updateCanvasSize);
  }, [width, height]);

  useEffect(() => {
    let animationId: number;
    let frameCount = 0;
    let sourceInitialized = false;

    const draw = () => {
      const displayCanvas = displayCanvasRef.current;
      const sourceCanvas = sourceRef.current;
      
      if (displayCanvas && sourceCanvas && canvasDimensions.width > 0) {
        const ctx = displayCanvas.getContext('2d');
        if (ctx) {
          const targetAspect = 9 / 16; // 9:16 aspect ratio
          const sourceWidth = sourceCanvas.width;
          const sourceHeight = sourceCanvas.height;
          const sourceAspect = sourceWidth / sourceHeight;

          // Calculate crop dimensions for 9:16 aspect ratio
          let cropWidth, cropHeight, cropX, cropY;
          
          if (sourceAspect > targetAspect) {
            // Source is wider, crop the width
            cropHeight = sourceHeight;
            cropWidth = sourceHeight * targetAspect;
            cropX = (sourceWidth - cropWidth) / 2;
            cropY = 0;
          } else {
            // Source is taller, crop the height
            cropWidth = sourceWidth;
            cropHeight = sourceWidth / targetAspect;
            cropX = 0;
            cropY = (sourceHeight - cropHeight) / 2;
          }

          // Set display canvas to calculated responsive dimensions
          const displayWidth = canvasDimensions.width;
          const displayHeight = canvasDimensions.height;
          
          if (!sourceInitialized || displayCanvas.width !== displayWidth) {
            displayCanvas.width = displayWidth;
            displayCanvas.height = displayHeight;
            sourceInitialized = true;
            console.log('CameraFeed: responsive 9:16 canvas initialized', displayWidth, 'x', displayHeight);
          }

          try {
            // Draw cropped portion from source to display
            ctx.drawImage(
              sourceCanvas,
              cropX, cropY, cropWidth, cropHeight,  // source crop area
              0, 0, displayWidth, displayHeight      // destination area
            );
            frameCount++;
            if (frameCount % 120 === 0) {
              console.log('CameraFeed: heartbeat frame', frameCount);
            }
          } catch (err) {
            // Silently ignore draw errors (e.g. source dimensions 0)
          }
        }
      }
      animationId = requestAnimationFrame(draw);
    };

    console.log('CameraFeed: loop started');
    draw();

    return () => {
      if (animationId) cancelAnimationFrame(animationId);
      console.log('CameraFeed: loop stopped');
    };
  }, [sourceRef, canvasDimensions]);

  return (
    <div ref={containerRef} style={{ width: '100%', height: '100%', ...style }}>
      <canvas
        ref={displayCanvasRef}
        className={className}
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'contain', // Match frame's object-contain
          backgroundColor: '#000',
        }}
      />
    </div>
  );
};

export default CameraFeed;
