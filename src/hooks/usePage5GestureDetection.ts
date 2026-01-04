import { useEffect, useRef, useState, useCallback } from 'react';
import { Hands, type Results } from '@mediapipe/hands';
import { Camera } from '@mediapipe/camera_utils';
import { recognizeOKGesture } from '../utils/gestureRecognition';

// 目标显示比例 10:16（与 CameraFeed 保持一致）
const TARGET_ASPECT_RATIO = 10 / 16;

/**
 * 计算 10:16 裁剪区域的边界（归一化坐标 0-1）
 */
function getCropBounds(sourceWidth: number, sourceHeight: number) {
  const sourceAspect = sourceWidth / sourceHeight;
  
  let cropX = 0, cropY = 0, cropWidth = 1, cropHeight = 1;
  
  if (sourceAspect > TARGET_ASPECT_RATIO) {
    const visibleWidthRatio = (sourceHeight * TARGET_ASPECT_RATIO) / sourceWidth;
    cropWidth = visibleWidthRatio;
    cropX = (1 - visibleWidthRatio) / 2;
  } else {
    const visibleHeightRatio = (sourceWidth / TARGET_ASPECT_RATIO) / sourceHeight;
    cropHeight = visibleHeightRatio;
    cropY = (1 - visibleHeightRatio) / 2;
  }
  
  return { cropX, cropY, cropWidth, cropHeight };
}

/**
 * 检查归一化坐标点是否在裁剪区域内
 */
function isPointInCropArea(x: number, y: number, bounds: ReturnType<typeof getCropBounds>): boolean {
  return x >= bounds.cropX && 
         x <= bounds.cropX + bounds.cropWidth &&
         y >= bounds.cropY && 
         y <= bounds.cropY + bounds.cropHeight;
}

/**
 * 检查手势关键点是否在裁剪区域内
 */
function isHandInCropArea(
  landmarks: { x: number; y: number }[],
  sourceWidth: number,
  sourceHeight: number
): boolean {
  const bounds = getCropBounds(sourceWidth, sourceHeight);
  const wrist = landmarks[0];
  const middleFinger = landmarks[9];
  const centerX = (wrist.x + middleFinger.x) / 2;
  const centerY = (wrist.y + middleFinger.y) / 2;
  
  return isPointInCropArea(centerX, centerY, bounds);
}

interface UsePage5GestureDetectionProps {
  enabled: boolean;
  onOkGestureConfirmed: () => void;
  holdDuration?: number; // Duration to hold gesture in ms, default 3000
}

interface UsePage5GestureDetectionReturn {
  videoRef: (node: HTMLVideoElement | null) => void;
  progress: number; // 0-100 progress percentage
  isDetecting: boolean;
  isGestureDetected: boolean;
}

/**
 * Hook for detecting OK gesture specifically for Page5Display
 * Shows a progress bar when OK gesture is held
 */
export function usePage5GestureDetection({
  enabled,
  onOkGestureConfirmed,
  holdDuration = 3000,
}: UsePage5GestureDetectionProps): UsePage5GestureDetectionReturn {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const handsRef = useRef<Hands | null>(null);
  const cameraRef = useRef<Camera | null>(null);
  
  const [isDetecting, setIsDetecting] = useState(false);
  const [isGestureDetected, setIsGestureDetected] = useState(false);
  const [progress, setProgress] = useState(0);
  
  const gestureStartTimeRef = useRef<number | null>(null);
  const gestureLastLostTimeRef = useRef<number | null>(null); // 300ms grace period like useMediaPipe
  const confirmedRef = useRef(false);
  const progressIntervalRef = useRef<number | null>(null);

  // Reset state
  const resetState = useCallback(() => {
    gestureStartTimeRef.current = null;
    gestureLastLostTimeRef.current = null;
    confirmedRef.current = false;
    setProgress(0);
    setIsGestureDetected(false);
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
      progressIntervalRef.current = null;
    }
  }, []);

  // Handle hands detection results
  const onHandsResults = useCallback((results: Results) => {
    if (confirmedRef.current) return;

    let isOKDetected = false;
    if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
      for (const landmarks of results.multiHandLandmarks) {
        // 只检测在 10:16 裁剪区域内的手势
        if (!isHandInCropArea(landmarks, 640, 480)) {
          continue;
        }
        const gestureResult = recognizeOKGesture(landmarks);
        if (gestureResult.isOK) {
          isOKDetected = true;
          break;
        }
      }
    }

    const currentTime = Date.now();

    if (isOKDetected) {
      // Reset lost time when gesture detected
      gestureLastLostTimeRef.current = null;
      setIsGestureDetected(true);
      
      if (gestureStartTimeRef.current === null) {
        gestureStartTimeRef.current = currentTime;
        
        // Start progress update interval
        if (progressIntervalRef.current) {
          clearInterval(progressIntervalRef.current);
        }
        progressIntervalRef.current = window.setInterval(() => {
          if (gestureStartTimeRef.current === null) {
            setProgress(0);
            return;
          }
          
          const elapsed = Date.now() - gestureStartTimeRef.current;
          const newProgress = Math.min(100, (elapsed / holdDuration) * 100);
          setProgress(newProgress);
          
          if (elapsed >= holdDuration && !confirmedRef.current) {
            confirmedRef.current = true;
            setProgress(100);
            if (progressIntervalRef.current) {
              clearInterval(progressIntervalRef.current);
              progressIntervalRef.current = null;
            }
            onOkGestureConfirmed();
          }
        }, 50);
      }
    } else {
      // Gesture lost - use 300ms grace period like useMediaPipe to avoid flickering
      if (gestureStartTimeRef.current !== null) {
        if (gestureLastLostTimeRef.current === null) {
          // Start grace period
          gestureLastLostTimeRef.current = currentTime;
        } else if (currentTime - gestureLastLostTimeRef.current >= 100) {
          // Grace period expired - reset state
          gestureStartTimeRef.current = null;
          gestureLastLostTimeRef.current = null;
          setProgress(0);
          setIsGestureDetected(false);
          if (progressIntervalRef.current) {
            clearInterval(progressIntervalRef.current);
            progressIntervalRef.current = null;
          }
        }
        // During grace period, keep the timer running
      }
    }
  }, [holdDuration, onOkGestureConfirmed]);

  // Video element callback ref
  const videoCallbackRef = useCallback((node: HTMLVideoElement | null) => {
    videoRef.current = node;
  }, []);

  // Initialize/cleanup MediaPipe
  useEffect(() => {
    if (!enabled) {
      resetState();
      return;
    }

    let mounted = true;
    let camera: Camera | null = null;
    let hands: Hands | null = null;

    const initialize = async () => {
      // Wait for video element to be available
      const waitForVideo = () => new Promise<HTMLVideoElement>((resolve) => {
        const check = () => {
          if (videoRef.current) {
            resolve(videoRef.current);
          } else {
            setTimeout(check, 100);
          }
        };
        check();
      });

      try {
        const videoElement = await waitForVideo();
        if (!mounted) return;

        console.log('Page5: Initializing gesture detection...');

        // Initialize Hands
        hands = new Hands({
          locateFile: (file) => `/mediapipe/hands/${file}`,
        });
        hands.setOptions({
          maxNumHands: 2,
          modelComplexity: 1,
          minDetectionConfidence: 0.7,
          minTrackingConfidence: 0.5,
        });
        hands.onResults(onHandsResults);
        handsRef.current = hands;

        // Initialize Camera
        camera = new Camera(videoElement, {
          onFrame: async () => {
            if (!mounted || !videoElement || !hands) return;
            try {
              await hands.send({ image: videoElement });
            } catch (err) {
              // Ignore errors
            }
          },
          width: 640,
          height: 480,
        });

        await camera.start();
        cameraRef.current = camera;
        setIsDetecting(true);
        console.log('Page5: Gesture detection started');
      } catch (err) {
        console.error('Page5: Failed to initialize gesture detection:', err);
      }
    };

    initialize();

    return () => {
      mounted = false;
      resetState();
      
      if (camera) {
        camera.stop();
      }
      setTimeout(() => {
        if (hands) {
          hands.close();
        }
      }, 100);
      
      cameraRef.current = null;
      handsRef.current = null;
      setIsDetecting(false);
    };
  }, [enabled, onHandsResults, resetState]);

  return {
    videoRef: videoCallbackRef,
    progress,
    isDetecting,
    isGestureDetected,
  };
}
