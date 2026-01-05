import React, { useState, useEffect, useCallback } from "react";
import { PageStage } from "./types/paperCutting";
import type { DetectionState } from "./types/paperCutting";
import { CaptureState } from "./types/capture";
import { useMediaPipe } from "./hooks/useMediaPipe";
import { useScreenAdaptation } from "./hooks/useScreenAdaptation";
import { Page1Images, Page2Images, Page3Images, Page4Images } from "./constants/images";
import { generatePaperCutImage } from "./services/comfyuiService";

// Import page components
import Page1Scan from "./components/PaperCutting/Page1Scan";
import Page2Gesture from "./components/PaperCutting/Page2Gesture";
import Page3Countdown from "./components/PaperCutting/Page3Countdown";
import Page4Capture from "./components/PaperCutting/Page4Capture";
import Page5Display from "./components/PaperCutting/Page5Display";
import CameraWithFrame from "./components/PaperCutting/CameraWithFrame";

/**
 * PaperCuttingApp - Main orchestrator for the Paper-Cutting UI
 * Manages page transitions based on pose detection states
 * Integrates with existing MediaPipe pose detection system
 * Uses 9:16 aspect ratio screen adaptation (720x1280)
 */
const PaperCuttingApp: React.FC = () => {
  // Apply 9:16 aspect ratio screen adaptation (720px × 1280px)
  useScreenAdaptation(720, 1280);
  const [currentStage, setCurrentStage] = useState<PageStage>(PageStage.SCAN_START);
  const [capturedImage, setCapturedImage] = useState<string>("");
  const [frozenFrameUrl, setFrozenFrameUrl] = useState<string>("");
  const [detectionState, setDetectionState] = useState<DetectionState>({
    personDetected: false,
    gestureDetected: false,
    gestureConfidence: 0,
    countdownValue: 3,
  });

  // AI generation state
  const [aiGeneratedImage, setAiGeneratedImage] = useState<string>("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationError, setGenerationError] = useState<string>("");

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
    stopCamera,
    frozenFrame,
  } = useMediaPipe({ onCapture: handleCapture });

  // Sync frozen frame from hook to state
  useEffect(() => {
    if (frozenFrame) {
      setFrozenFrameUrl(frozenFrame);
      console.log('PaperCuttingApp: frozen frame updated');
    }
  }, [frozenFrame]);

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

      case CaptureState.CAPTURING:
        setCurrentStage(PageStage.PHOTO_CAPTURE);
        break;

      case CaptureState.CAPTURE:
        setCurrentStage(PageStage.PHOTO_CAPTURE);
        break;

      case CaptureState.COMPLETED:
        // 保持在 PHOTO_CAPTURE 页面，等待 AI 生成完成后再切换
        // AI 生成逻辑在下面的 useEffect 中处理
        break;
    }
  }, [mediaPipeState, mediaPipeCountdown, stopCamera]);

  // Trigger AI generation when capturedImage is set and stage is PHOTO_CAPTURE
  // Transition to IMAGE_DISPLAY only after AI generation completes
  useEffect(() => {
    const generateAiImage = async () => {
      // 只在 PHOTO_CAPTURE 阶段且有截图时触发
      if (!capturedImage || currentStage !== PageStage.PHOTO_CAPTURE) return;
      if (isGenerating || aiGeneratedImage) return; // Already generating or done

      setIsGenerating(true);
      setGenerationError("");
      console.log('[PaperCuttingApp] Starting AI paper-cut image generation...');

      try {
        const result = await generatePaperCutImage(capturedImage);

        if (result.success && result.image_url) {
          console.log('[PaperCuttingApp] AI image generated:', result.image_url);
          setAiGeneratedImage(result.image_url);
          // AI 生成成功后，切换到 IMAGE_DISPLAY 页面
          setCurrentStage(PageStage.IMAGE_DISPLAY);
          // 停止主摄像头，避免与 Page5 的摄像头冲突
          stopCamera();
        } else {
          console.error('[PaperCuttingApp] AI generation failed:', result.error);
          setGenerationError(result.error || '生成失败');
          // 即使失败也跳转到 Page5，显示原始截图和错误信息
          setCurrentStage(PageStage.IMAGE_DISPLAY);
          stopCamera();
        }
      } catch (error) {
        console.error('[PaperCuttingApp] AI generation error:', error);
        setGenerationError(error instanceof Error ? error.message : '未知错误');
        // 即使失败也跳转到 Page5，显示原始截图和错误信息
        setCurrentStage(PageStage.IMAGE_DISPLAY);
        stopCamera();
      } finally {
        setIsGenerating(false);
      }
    };

    generateAiImage();
  }, [capturedImage, currentStage, isGenerating, aiGeneratedImage, stopCamera]);

  // Handle restart
  const handleRestart = useCallback(() => {
    handleReset();
    setCapturedImage("");
    setFrozenFrameUrl("");
    setAiGeneratedImage("");
    setGenerationError("");
    setCurrentStage(PageStage.SCAN_START);
  }, [handleReset]);

  // Get current frame image based on stage
  const getCurrentFrameImage = () => {
    switch (currentStage) {
      case PageStage.SCAN_START:
        return Page1Images.paperCuttingFrame;
      case PageStage.GESTURE_COMPARISON:
        return Page2Images.paperCuttingFrame;
      case PageStage.COUNTDOWN:
        return Page3Images.paperCuttingFrame;
      case PageStage.PHOTO_CAPTURE:
        return Page4Images.paperCuttingFrame;
      default:
        return Page1Images.paperCuttingFrame;
    }
  };

  // Debug logging
  useEffect(() => {
    console.log('PaperCuttingApp - isLoading:', isLoading, 'error:', error, 'state:', mediaPipeState);
  }, [isLoading, error, mediaPipeState]);

  // Render current page based on stage
  const renderCurrentPage = () => {
    switch (currentStage) {
      case PageStage.SCAN_START:
        return <Page1Scan />;

      case PageStage.GESTURE_COMPARISON:
        return <Page2Gesture detectionState={detectionState} />;

      case PageStage.COUNTDOWN:
        return <Page3Countdown detectionState={detectionState} />;

      case PageStage.PHOTO_CAPTURE:
        return <Page4Capture />;

      case PageStage.IMAGE_DISPLAY:
        return (
          <Page5Display
            capturedImage={capturedImage}
            aiGeneratedImage={aiGeneratedImage}
            generationError={generationError}
            onPrevStage={handleRestart}
          />
        );

      default:
        return <Page1Scan />;
    }
  };

  return (
    <>
      {/* Hidden video and canvas for MediaPipe - MUST render immediately for refs to attach */}
      {/* Source video and canvas for MediaPipe - processing buffer, kept hidden but updated */}
      {/* High resolution: 1280x960 (4:3) for better image quality */}
      <div style={{ visibility: "hidden", position: "absolute", zIndex: -10, pointerEvents: "none", left: -1000, top: -1000 }}>
        <video
          ref={videoRef}
          style={{ width: 1280, height: 960 }}
          autoPlay
          playsInline
        />
        <canvas
          ref={canvasRef}
          width={1280}
          height={960}
          style={{ width: 1280, height: 960 }}
        />
        <canvas ref={capturedImageRef} />
      </div>

      {/* Shared UI layer for Page 1-3: Background, Logo, Bottom Frame */}
      {!isLoading && !error && (
        currentStage === PageStage.SCAN_START ||
        currentStage === PageStage.GESTURE_COMPARISON ||
        currentStage === PageStage.COUNTDOWN
      ) && (
          <>
            {/* Background layer - full screen */}
            <div className="fixed inset-0" style={{ zIndex: 0 }}>
              <img
                src={Page1Images.background}
                alt="Background"
                className="w-full h-full object-cover"
              />
            </div>

            {/* Logo at the top */}
            <div className="fixed top-[4.8rem] left-1/2 transform -translate-x-1/2 pointer-events-auto" style={{ zIndex: 25 }}>
              <img
                src={Page1Images.logo}
                alt="Logo"
                className="animate-fade-in"
                style={{ height: '60px', width: 'auto', maxWidth: 'none' }}
              />
            </div>

            {/* Bottom frame */}
            <div className="fixed bottom-0 left-0 right-0" style={{ zIndex: 25 }}>
              <img
                src={Page1Images.bottomFrame}
                alt="Bottom Frame"
                className="w-full h-auto"
              />
            </div>
          </>
        )}

      {/* Persistent camera component - shown for all stages except IMAGE_DISPLAY */}
      {!isLoading && !error && currentStage !== PageStage.IMAGE_DISPLAY && (
        <CameraWithFrame
          sourceRef={canvasRef}
          frameImage={getCurrentFrameImage()}
          frozenFrameUrl={currentStage === PageStage.PHOTO_CAPTURE ? frozenFrameUrl : undefined}
        />
      )}

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
