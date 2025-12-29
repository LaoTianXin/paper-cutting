import React, { useEffect, useRef } from 'react';

interface CameraFeedProps {
  sourceRef: React.RefObject<HTMLCanvasElement | null>;
  className?: string;
  style?: React.CSSProperties;
}

/**
 * CameraFeed component - displays live feed from MediaPipe canvas
 * Uses requestAnimationFrame to continuously copy from source canvas
 */
const CameraFeed: React.FC<CameraFeedProps> = ({ sourceRef, className = '', style = {} }) => {
  const displayCanvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    let animationId: number;
    let frameCount = 0;
    let sourceInitialized = false;

    const draw = () => {
      const displayCanvas = displayCanvasRef.current;
      const sourceCanvas = sourceRef.current;
      
      if (displayCanvas && sourceCanvas) {
        const ctx = displayCanvas.getContext('2d');
        if (ctx) {
          // Initialize dimensions if not done yet
          if (!sourceInitialized || displayCanvas.width !== sourceCanvas.width) {
            displayCanvas.width = sourceCanvas.width;
            displayCanvas.height = sourceCanvas.height;
            sourceInitialized = true;
            console.log('CameraFeed: source initialized', displayCanvas.width, 'x', displayCanvas.height);
          }

          try {
            ctx.drawImage(sourceCanvas, 0, 0);
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
  }, [sourceRef]);

  return (
    <canvas
      ref={displayCanvasRef}
      className={className}
      style={{
        width: '100%',
        height: '100%',
        objectFit: 'contain',
        backgroundColor: '#000',
        ...style
      }}
    />
  );
};

export default CameraFeed;
