import React from "react";
import { CaptureState } from "./types/capture";
import { useMediaPipe } from "./hooks/useMediaPipe";
import { CameraCanvas } from "./components/Capture/CameraCanvas";
import { CaptureStatusOverlay } from "./components/Capture/CaptureStatusOverlay";
import { CaptureResult } from "./components/Capture/CaptureResult";

export default function IntegratedPhotoCaptureV3(): React.JSX.Element {
  const capturedImageRef = React.useRef<HTMLCanvasElement>(null);

  const handleCapture = React.useCallback((resultCanvas: HTMLCanvasElement) => {
    if (capturedImageRef.current) {
      const targetCtx = capturedImageRef.current.getContext("2d");
      if (targetCtx) {
        capturedImageRef.current.width = resultCanvas.width;
        capturedImageRef.current.height = resultCanvas.height;
        targetCtx.drawImage(resultCanvas, 0, 0);
      }
    }
  }, []);

  const {
    videoRef,
    canvasRef,
    state,
    isLoading,
    error,
    statusMessage,
    handleReset: resetMediaPipe,
  } = useMediaPipe({ onCapture: handleCapture });

  const handleReset = () => {
    resetMediaPipe();
    if (capturedImageRef.current) {
      const ctx = capturedImageRef.current.getContext("2d");
      if (ctx) {
        ctx.clearRect(0, 0, capturedImageRef.current.width, capturedImageRef.current.height);
      }
    }
  };

  const handleDownload = () => {
    if (capturedImageRef.current && state === CaptureState.COMPLETED) {
      const link = document.createElement("a");
      link.download = `photo_${Date.now()}.png`;
      link.href = capturedImageRef.current.toDataURL();
      link.click();
    }
  };

  return (
    <div className="integrated-capture-container">
      <h2>📸 智能拍照系统 V2 (MediaPipe Pose)</h2>
      <p style={{ color: "#666", fontSize: "14px" }}>
        ✨ 使用 MediaPipe Pose 进行高精度全身检测
      </p>

      {isLoading && <div className="loading">⏳ 正在加载模型...</div>}

      {error && (
        <div className="error-message">
          <p>❌ {error}</p>
        </div>
      )}

      <div className="capture-content">
        <CameraCanvas videoRef={videoRef} canvasRef={canvasRef} />
        
        <CaptureResult 
          state={state} 
          capturedImageRef={capturedImageRef} 
          handleDownload={handleDownload} 
          handleReset={handleReset} 
        />
      </div>

      <CaptureStatusOverlay state={state} statusMessage={statusMessage} />

      {state !== CaptureState.IDLE && state !== CaptureState.COMPLETED && (
        <button onClick={handleReset} className="cancel-btn">
          ❌ 取消并重新开始
        </button>
      )}
    </div>
  );
}
