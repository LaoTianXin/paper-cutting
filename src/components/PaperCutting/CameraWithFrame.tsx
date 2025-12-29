import React from 'react';
import CameraFeed from './CameraFeed';

interface CameraWithFrameProps {
  sourceRef: React.RefObject<HTMLCanvasElement | null>;
  frameImage: string;
}

/**
 * CameraWithFrame - Combines camera feed with paper-cutting frame overlay
 * Maintains 9:16 aspect ratio and proper layering
 */
const CameraWithFrame: React.FC<CameraWithFrameProps> = ({
  sourceRef,
  frameImage,
}) => {
  return (
    // 9:16 aspect ratio container - centered on screen
    <div 
      className="fixed inset-0 flex items-center justify-center pointer-events-none"
      style={{ zIndex: 15 }}
    >
      <div 
        className="relative"
        style={{
          width: '56.25vh', // 9/16 = 0.5625
          maxWidth: '90%',
          height: '100vh',
          maxHeight: '100%',
        }}
      >
        {/* Camera feed - bottom layer */}
        <div className="absolute inset-0">
          <CameraFeed 
            sourceRef={sourceRef}
            className=""
            style={{}}
          />
        </div>

        {/* Frame overlay - top layer */}
        <div className="absolute inset-0 pointer-events-none">
          <img
            src={frameImage}
            alt="Paper Cutting Frame"
            className="w-full h-full object-contain"
          />
        </div>
      </div>
    </div>
  );
};

export default CameraWithFrame;
