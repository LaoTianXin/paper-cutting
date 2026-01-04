import React from 'react';
import CameraFeed from './CameraFeed';

interface CameraWithFrameProps {
  sourceRef: React.RefObject<HTMLCanvasElement | null>;
  frameImage: string;
  frozenFrameUrl?: string;
}

/**
 * CameraWithFrame - Combines camera feed with paper-cutting frame overlay
 * Frame image has transparent center where camera shows through
 */
const CameraWithFrame: React.FC<CameraWithFrameProps> = ({
  sourceRef,
  frameImage,
  frozenFrameUrl,
}) => {
  return (
    <>
      {/* Container for Camera and Frame - Centered */}
      <div
        className="fixed"
        style={{
          top: '39%',
          left: '50%',
          width: '400px', // 70% of 720px (design width)
          transform: 'translate(-50%, -50%)',
          zIndex: 10,
        }}
      >
        <div
          className="relative"
          style={{
            width: '100%',
            aspectRatio: '10 / 16',
          }}
        >
          {/* Camera layer fills container */}
          <CameraFeed
            sourceRef={sourceRef}
            frozenFrameUrl={frozenFrameUrl}
            style={{
              position: 'absolute',
              inset: 0,
            }}
          />

          {/* Frame overlay with transparent center - camera shows through */}
          <img
            src={frameImage}
            alt="Paper Cutting Frame"
            style={{
              position: 'absolute',
              inset: 0,
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              pointerEvents: 'none',
            }}
          />
        </div>
      </div>
    </>
  );
};

export default CameraWithFrame;
