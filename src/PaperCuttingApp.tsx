import React, { useState, useEffect, useCallback } from "react";
import { PageStage } from "./types/paperCutting";
import type { DetectionState } from "./types/paperCutting";
import { CaptureState } from "./types/capture";
import { useMediaPipe } from "./hooks/useMediaPipe";
import { useScreenAdaptation } from "./hooks/useScreenAdaptation";

// Import page components
import Page1Scan from "./components/PaperCutting/Page1Scan";
import Page2Gesture from "./components/PaperCutting/Page2Gesture";
import Page3Countdown from "./components/PaperCutting/Page3Countdown";
import Page4Capture from "./components/PaperCutting/Page4Capture";
import Page5Display from "./components/PaperCutting/Page5Display";

/**
 * PaperCuttingApp - Main orchestrator for the Paper-Cutting UI
 * Manages page transitions based on pose detection states
 * Integrates with existing MediaPipe pose detection system
 * Uses 9:20 aspect ratio screen adaptation (1440x3200)
 */
const PaperCuttingApp: React.FC = () => {
  // Apply 9:20 aspect ratio screen adaptation
  useScreenAdaptation(1440, 3200);
  const [currentStage, setCurrentStage] = useState<PageStage>(PageStage.SCAN_START);
  const [capturedImage, setCapturedImage] = useState<string>("");
  const [detectionState, setDetectionState] = useState<DetectionState>({
    personDetected: false,
    gestureDetected: false,
    gestureConfidence: 0,
    countdownValue: 3,
  });

  const capturedImageRef = React.useRef<HTMLCanvasElement>(null);

  // Handle image capture
  const handleCapture = useCallback((resultCanvas: HTMLCanvasElement) => {
    if (capturedImageRef.current) {
      const targetCtx = capturedImageRef.current.getContext("2d");
      if (targetCtx) {
        capturedImageRef.current.width = resultCanvas.width;
        capturedImageRef.current.height = resultCanvas.height;
        targetCtx.drawImage(resultCanvas, 0, 0);
        
        // Convert to data URL for display
        const imageUrl = capturedImageRef.current.toDataURL("image/png");
        setCapturedImage(imageUrl);
      }
    }
  }, []);

  // Initialize MediaPipe - it creates its own videoRef and canvasRef internally
  const {
    videoRef,
    canvasRef,
    state: mediaPipeState,
    isLoading,
    error,
    countdown: mediaPipeCountdown,
    handleReset,
  } = useMediaPipe({ onCapture: handleCapture });

  // Map MediaPipe states to Page stages
  useEffect(() => {
    switch (mediaPipeState) {
      case CaptureState.IDLE:
      case CaptureState.DETECTING_BODY:
        setCurrentStage(PageStage.SCAN_START);
        setDetectionState(prev => ({ ...prev, personDetected: false }));
        break;

      case CaptureState.BODY_DETECTED:
      case CaptureState.DETECTING_GESTURE:
        setCurrentStage(PageStage.GESTURE_COMPARISON);
        setDetectionState(prev => ({ 
          ...prev, 
          personDetected: true,
          gestureDetected: false,
          gestureConfidence: 0,
        }));
        break;

      case CaptureState.GESTURE_DETECTED:
        setCurrentStage(PageStage.GESTURE_COMPARISON);
        setDetectionState(prev => ({ 
          ...prev, 
          personDetected: true,
          gestureDetected: true,
          gestureConfidence: 0.8, // Approximate confidence
        }));
        break;

      case CaptureState.COUNTDOWN:
        setCurrentStage(PageStage.COUNTDOWN);
        setDetectionState(prev => ({ 
          ...prev, 
          countdownValue: mediaPipeCountdown > 0 ? mediaPipeCountdown : 3,
        }));
        break;

      case CaptureState.CAPTURE:
        setCurrentStage(PageStage.PHOTO_CAPTURE);
        break;

      case CaptureState.COMPLETED:
        setCurrentStage(PageStage.IMAGE_DISPLAY);
        break;
    }
  }, [mediaPipeState, mediaPipeCountdown]);

  // Handle restart
  const handleRestart = useCallback(() => {
    handleReset();
    setCapturedImage("");
    setCurrentStage(PageStage.SCAN_START);
  }, [handleReset]);

  // Debug logging
  useEffect(() => {
    console.log('PaperCuttingApp - isLoading:', isLoading, 'error:', error, 'state:', mediaPipeState);
  }, [isLoading, error, mediaPipeState]);

  // Render current page based on stage
  const renderCurrentPage = () => {
    switch (currentStage) {
      case PageStage.SCAN_START:
        return <Page1Scan sourceRef={canvasRef} />;

      case PageStage.GESTURE_COMPARISON:
        return <Page2Gesture detectionState={detectionState} sourceRef={canvasRef} />;

      case PageStage.COUNTDOWN:
        return <Page3Countdown detectionState={detectionState} sourceRef={canvasRef} />;

      case PageStage.PHOTO_CAPTURE:
        return <Page4Capture sourceRef={canvasRef} />;

      case PageStage.IMAGE_DISPLAY:
        return (
          <Page5Display 
            capturedImage={capturedImage} 
            onPrevStage={handleRestart}
          />
        );

      default:
        return <Page1Scan sourceRef={canvasRef} />;
    }
  };

  return (
    <>
      {/* Hidden video and canvas for MediaPipe - MUST render immediately for refs to attach */}
      {/* Source video and canvas for MediaPipe - processing buffer, kept hidden but updated */}
      <div style={{ visibility: "hidden", position: "absolute", zIndex: -10, pointerEvents: "none", left: -1000, top: -1000 }}>
        <video
          ref={videoRef}
          style={{ width: 640, height: 480 }}
          autoPlay
          playsInline
        />
        <canvas
          ref={canvasRef}
          width={640}
          height={480}
          style={{ width: 640, height: 480 }}
        />
        <canvas ref={capturedImageRef} />
      </div>




      {/* Page content - rendered directly without wrapper */}
      {!isLoading && !error && renderCurrentPage()}

      {/* Loading screen - semi-transparent to see camera behind it */}
      {isLoading && (
        <div className="fixed inset-0 flex items-center justify-center bg-white bg-opacity-70 backdrop-blur-sm" style={{ zIndex: 10 }}>
          <div className="text-center bg-white rounded-2xl shadow-2xl" style={{ maxWidth: '800px', padding: '60px' }}>
            <div className="font-dabiaosong text-red-600 animate-pulse" style={{ fontSize: '72px', marginBottom: '30px' }}>
              正在加载...
            </div>
            <div className="text-gray-600" style={{ fontSize: '36px', marginBottom: '40px' }}>
              初始化摄像头和检测系统
            </div>
            <div className="bg-white bg-opacity-50 rounded-lg text-gray-600" style={{ padding: '30px', fontSize: '28px' }}>
              <p style={{ marginBottom: '15px' }}>⏳ 正在启动摄像头</p>
              <p style={{ marginBottom: '15px' }}>⏳ 加载 MediaPipe 模型</p>
              <p className="text-gray-500" style={{ fontSize: '20px', marginTop: '30px' }}>
                如果长时间停留在此页面，请检查：
                <br />1. 是否允许摄像头权限
                <br />2. 浏览器控制台是否有错误信息
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Error screen - highest priority */}
      {error && (
        <div className="fixed inset-0 flex items-center justify-center bg-gradient-to-br from-red-50 to-orange-50" style={{ zIndex: 10 }}>
          <div className="text-center bg-white rounded-lg shadow-xl" style={{ padding: '60px' }}>
            <div className="font-dabiaosong text-red-600" style={{ fontSize: '64px', marginBottom: '30px' }}>
              ❌ 错误
            </div>
            <div className="text-gray-700" style={{ fontSize: '32px', marginBottom: '40px' }}>
              {error}
            </div>
            <button
              onClick={handleRestart}
              className="bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition"
              style={{ padding: '20px 40px', fontSize: '28px' }}
            >
              重试
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export default PaperCuttingApp;
