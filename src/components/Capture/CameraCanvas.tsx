import React from "react";

interface CameraCanvasProps {
  videoRef: React.RefObject<HTMLVideoElement | null> | ((node: HTMLVideoElement | null) => void);
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
}

export const CameraCanvas: React.FC<CameraCanvasProps> = ({ videoRef, canvasRef }) => {
  return (
    <div className="video-container">
      <video ref={videoRef} style={{ display: "none" }} playsInline muted />
      <canvas
        ref={canvasRef}
        width={640}
        height={480}
        className="capture-canvas"
      />
    </div>
  );
};
