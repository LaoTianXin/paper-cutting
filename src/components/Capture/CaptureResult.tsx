import React from "react";
import { CaptureState } from "../../types/capture";

interface CaptureResultProps {
  state: CaptureState;
  capturedImageRef: React.RefObject<HTMLCanvasElement | null>;
  handleDownload: () => void;
  handleReset: () => void;
}

export const CaptureResult: React.FC<CaptureResultProps> = ({
  state,
  capturedImageRef,
  handleDownload,
  handleReset,
}) => {
  return (
    <div 
      className="captured-image-container"
      style={{ display: state === CaptureState.COMPLETED ? "block" : "none" }}
    >
      <h3>📷 捕获的照片</h3>
      <canvas ref={capturedImageRef} className="captured-image" />
      <div className="capture-actions">
        <button onClick={handleDownload} className="download-btn">
          ⬇️ 下载照片
        </button>
        <button onClick={handleReset} className="reset-btn">
          🔄 重新拍照
        </button>
      </div>
    </div>
  );
};
