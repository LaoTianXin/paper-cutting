import React, { useEffect, useRef, useState } from 'react';

interface CameraFeedProps {
  sourceRef: React.RefObject<HTMLCanvasElement | null>;
  className?: string;
  style?: React.CSSProperties;
  width?: number; // Optional: use parent's width
  height?: number; // Optional: use parent's height
  frozenFrameUrl?: string; // Optional: if provided, display this frozen image instead of live feed
}

/**
 * CameraFeed component - displays live feed from MediaPipe canvas
 * Uses requestAnimationFrame to continuously copy from source canvas
 * Canvas size is responsive: 60% of page width with 9:16 aspect ratio (or uses provided dimensions)
 */
const CameraFeed: React.FC<CameraFeedProps> = ({ sourceRef, className = '', style = {}, width, height, frozenFrameUrl }) => {
  const displayCanvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [canvasDimensions, setCanvasDimensions] = useState({ width: 0, height: 0 });

  // Calculate canvas dimensions based on parent container or page width
  useEffect(() => {
    const updateCanvasSize = () => {
      // If width/height props provided, use those
      if (width && height) {
        setCanvasDimensions({ width, height });
        return true; // Successfully set
      }

      // Otherwise use container size if available
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        const canvasWidth = Math.floor(rect.width);
        const canvasHeight = Math.floor(rect.height);

        // Only update if we have valid dimensions
        if (canvasWidth > 0 && canvasHeight > 0) {
          setCanvasDimensions({ width: canvasWidth, height: canvasHeight });
          console.log('CameraFeed: canvas size from container', canvasWidth, 'x', canvasHeight);
          return true; // Successfully set
        }
      }

      // Fallback: calculate from window width
      const pageWidth = window.innerWidth;
      const canvasWidth = Math.floor(pageWidth * 0.6);
      const canvasHeight = Math.floor(canvasWidth / 10 * 16); // 10:16 aspect ratio

      setCanvasDimensions({ width: canvasWidth, height: canvasHeight });
      console.log('CameraFeed: canvas size from window (fallback)', canvasWidth, 'x', canvasHeight);
      return true;
    };

    // Initial calculation with retry for when container isn't laid out yet
    let retryCount = 0;
    const maxRetries = 10;

    const tryUpdateSize = () => {
      if (updateCanvasSize()) {
        return;
      }
      retryCount++;
      if (retryCount < maxRetries) {
        setTimeout(tryUpdateSize, 50);
      }
    };

    // Delay initial calculation slightly to ensure DOM is ready
    setTimeout(tryUpdateSize, 10);

    // Use ResizeObserver for more reliable size detection
    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width: w, height: h } = entry.contentRect;
        if (w > 0 && h > 0) {
          setCanvasDimensions({ width: Math.floor(w), height: Math.floor(h) });
          console.log('CameraFeed: canvas size from ResizeObserver', Math.floor(w), 'x', Math.floor(h));
        }
      }
    });

    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }

    // Also listen for window resize as fallback
    window.addEventListener('resize', updateCanvasSize);

    return () => {
      window.removeEventListener('resize', updateCanvasSize);
      resizeObserver.disconnect();
    };
  }, [width, height]);

  useEffect(() => {
    let animationId: number;
    let frameCount = 0;
    let sourceInitialized = false;

    // If frozen frame is provided, display it instead of live feed
    if (frozenFrameUrl && canvasDimensions.width > 0) {
      const displayCanvas = displayCanvasRef.current;
      if (displayCanvas) {
        const ctx = displayCanvas.getContext('2d');
        if (ctx) {
          const displayWidth = canvasDimensions.width;
          const displayHeight = canvasDimensions.height;

          displayCanvas.width = displayWidth;
          displayCanvas.height = displayHeight;

          const img = new Image();
          img.onload = () => {
            try {
              // Frozen frame is already cropped to 9:16, just draw it directly
              // Clear canvas first
              ctx.clearRect(0, 0, displayWidth, displayHeight);
              // Draw the frozen image to fill the canvas
              ctx.drawImage(img, 0, 0, displayWidth, displayHeight);
              console.log('CameraFeed: frozen frame displayed (9:16 cropped)');
            } catch (err) {
              console.error('CameraFeed: error drawing frozen frame', err);
            }
          };
          img.onerror = (err) => {
            console.error('CameraFeed: error loading frozen frame', err);
          };
          img.src = frozenFrameUrl;
        }
      }

      // No cleanup needed for frozen frame
      return () => {
        console.log('CameraFeed: frozen frame mode stopped');
      };
    }

    // Normal live feed mode
    const draw = () => {
      const displayCanvas = displayCanvasRef.current;
      const sourceCanvas = sourceRef.current;

      if (displayCanvas && sourceCanvas && canvasDimensions.width > 0) {
        const ctx = displayCanvas.getContext('2d');
        if (ctx) {
          const targetAspect = 10 / 16; // 10:16 aspect ratio
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
  }, [sourceRef, canvasDimensions, frozenFrameUrl]);

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
