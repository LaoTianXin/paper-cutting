import React from "react";
import { Hands, HAND_CONNECTIONS, type Results } from "@mediapipe/hands";
import { Pose, POSE_CONNECTIONS, type Results as PoseResults } from "@mediapipe/pose";
import { Camera } from "@mediapipe/camera_utils";
import { drawConnectors, drawLandmarks } from "@mediapipe/drawing_utils";
import { initializePose, calculateBodyRect, type BodyRect } from "../poseDetection";
import { CaptureState } from "../types/capture";
import { recognizeOKGesture } from "../utils/gestureRecognition";

interface UseMediaPipeProps {
  onCapture?: (canvas: HTMLCanvasElement) => void;
}

export function useMediaPipe({ onCapture }: UseMediaPipeProps = {}) {
  const videoRef = React.useRef<HTMLVideoElement>(null);
  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  
  const [state, setState] = React.useState<CaptureState>(CaptureState.IDLE);
  const [isLoading, setIsLoading] = React.useState<boolean>(true);
  const [error, setError] = React.useState<string | null>(null);
  const [statusMessage, setStatusMessage] = React.useState<string>("");
  const [countdown, setCountdown] = React.useState<number>(5);

  const stateRef = React.useRef(state);
  const countdownRef = React.useRef(countdown);
  const statusMessageRef = React.useRef(statusMessage);

  const bodyDetectionStartTime = React.useRef<number | null>(null);
  const lastBodyDetectedTime = React.useRef<number | null>(null);
  const gestureDetectionStartTime = React.useRef<number | null>(null);
  const lastBodyRectRef = React.useRef<BodyRect | null>(null);
  const lastPoseLandmarksRef = React.useRef<PoseResults["poseLandmarks"] | null>(null);
  const frameCountRef = React.useRef<number>(0);

  const poseRef = React.useRef<Pose | null>(null);
  const handsRef = React.useRef<Hands | null>(null);
  const cameraRef = React.useRef<Camera | null>(null);

  React.useEffect(() => {
    stateRef.current = state;
    countdownRef.current = countdown;
    statusMessageRef.current = statusMessage;
  }, [state, countdown, statusMessage]);

  const onPoseResults = React.useCallback((results: PoseResults) => {
    const canvas = canvasRef.current;
    const video = videoRef.current;
    if (!canvas || !video) return;

    const currentTime = Date.now();
    const currentState = stateRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    if (
      currentState === CaptureState.IDLE ||
      currentState === CaptureState.DETECTING_BODY ||
      currentState === CaptureState.BODY_DETECTED ||
      currentState === CaptureState.DETECTING_GESTURE ||
      currentState === CaptureState.GESTURE_DETECTED ||
      currentState === CaptureState.COUNTDOWN ||
      currentState === CaptureState.COMPLETED
    ) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      if (results.poseLandmarks) {
        const rect = calculateBodyRect(results.poseLandmarks, canvas.width, canvas.height);
        if (rect) {
          lastBodyDetectedTime.current = currentTime;
          lastBodyRectRef.current = rect;
          lastPoseLandmarksRef.current = results.poseLandmarks;

          if (
            currentState === CaptureState.IDLE ||
            currentState === CaptureState.DETECTING_BODY ||
            currentState === CaptureState.BODY_DETECTED
          ) {
            drawConnectors(ctx, results.poseLandmarks, POSE_CONNECTIONS, { color: "#00FF00", lineWidth: 2 });
            drawLandmarks(ctx, results.poseLandmarks, { color: "#FF0000", radius: 3 });
            ctx.strokeStyle = "#00FF00";
            ctx.lineWidth = 4;
            ctx.strokeRect(rect.x, rect.y, rect.width, rect.height);
            ctx.fillStyle = "#00FF00";
            ctx.font = "bold 24px Arial";
            ctx.fillText("全身已检测", rect.x, rect.y - 10);
          } else if (currentState === CaptureState.COUNTDOWN) {
            ctx.strokeStyle = "#00FF00";
            ctx.lineWidth = 3;
            ctx.strokeRect(rect.x, rect.y, rect.width, rect.height);
          } else if (currentState === CaptureState.COMPLETED) {
            ctx.strokeStyle = "rgba(0, 255, 0, 0.3)";
            ctx.lineWidth = 2;
            ctx.strokeRect(rect.x, rect.y, rect.width, rect.height);
          }

          if (currentState !== CaptureState.COMPLETED) {
            if (currentState === CaptureState.IDLE) {
              setState(CaptureState.DETECTING_BODY);
              bodyDetectionStartTime.current = currentTime;
              setStatusMessage("正在检测全身...");
            } else if (currentState === CaptureState.DETECTING_BODY) {
              if (bodyDetectionStartTime.current && currentTime - bodyDetectionStartTime.current >= 1000) {
                setState(CaptureState.DETECTING_GESTURE);
                setStatusMessage("✓ 已识别到全身，请做出OK手势");
              }
            }
          }
        }
      } else {
        if (currentState === CaptureState.DETECTING_BODY) {
          if (lastBodyDetectedTime.current && currentTime - lastBodyDetectedTime.current >= 1000) {
            setState(CaptureState.IDLE);
            bodyDetectionStartTime.current = null;
            lastBodyDetectedTime.current = null;
            lastPoseLandmarksRef.current = null;
            setStatusMessage("❌ 未识别到全身，请重新站位");
            setTimeout(() => setStatusMessage(""), 1500);
          }
        }
      }

      if (currentState === CaptureState.COUNTDOWN) {
        ctx.fillStyle = "#FFD700";
        ctx.strokeStyle = "#000000";
        ctx.lineWidth = 5;
        ctx.font = "bold 120px Arial";
        const text = countdownRef.current.toString();
        const textWidth = ctx.measureText(text).width;
        ctx.strokeText(text, (canvas.width - textWidth) / 2, canvas.height / 2);
        ctx.fillText(text, (canvas.width - textWidth) / 2, canvas.height / 2);
      }

      const currentStatusMessage = statusMessageRef.current;
      if (currentStatusMessage && currentState !== CaptureState.COUNTDOWN) {
        ctx.fillStyle = "#FFFFFF";
        ctx.strokeStyle = "#000000";
        ctx.lineWidth = 3;
        ctx.font = "bold 32px Arial";
        const textWidth = ctx.measureText(currentStatusMessage).width;
        ctx.strokeText(currentStatusMessage, (canvas.width - textWidth) / 2, canvas.height - 50);
        ctx.fillText(currentStatusMessage, (canvas.width - textWidth) / 2, canvas.height - 50);
      }
    }
  }, []);

  const onHandsResults = React.useCallback((results: Results) => {
    const canvas = canvasRef.current;
    const video = videoRef.current;
    if (!canvas || !video) return;

    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return;

    const currentTime = Date.now();
    const currentState = stateRef.current;

    if (currentState === CaptureState.DETECTING_GESTURE || currentState === CaptureState.GESTURE_DETECTED) {
      frameCountRef.current++;
      if (frameCountRef.current % 3 === 0 && poseRef.current && video) {
        try {
          poseRef.current.send({ image: video }).catch(() => {});
        } catch (err) {}
      }

      if (lastBodyDetectedTime.current && currentTime - lastBodyDetectedTime.current >= 1000) {
        setState(CaptureState.IDLE);
        bodyDetectionStartTime.current = null;
        lastBodyDetectedTime.current = null;
        gestureDetectionStartTime.current = null;
        frameCountRef.current = 0;
        setStatusMessage("❌ 全身丢失，重新检测");
        setTimeout(() => setStatusMessage(""), 1500);
        return;
      }

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(results.image, 0, 0, canvas.width, canvas.height);

      if (lastBodyRectRef.current) {
        const timeSinceDetection = lastBodyDetectedTime.current ? currentTime - lastBodyDetectedTime.current : 999999;
        if (timeSinceDetection < 500) ctx.strokeStyle = "rgba(0, 255, 0, 0.8)";
        else if (timeSinceDetection < 1000) ctx.strokeStyle = "rgba(255, 255, 0, 0.8)";
        else ctx.strokeStyle = "rgba(255, 0, 0, 0.8)";

        ctx.lineWidth = 3;
        ctx.strokeRect(lastBodyRectRef.current.x, lastBodyRectRef.current.y, lastBodyRectRef.current.width, lastBodyRectRef.current.height);
      }

      let isOKDetected = false;
      let maxConfidence = 0;

      if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
        for (const landmarks of results.multiHandLandmarks) {
          drawConnectors(ctx, landmarks, HAND_CONNECTIONS, { color: "#00FF00", lineWidth: 3 });
          drawLandmarks(ctx, landmarks, { color: "#FF0000", lineWidth: 1, radius: 4 });

          const gestureResult = recognizeOKGesture(landmarks);
          if (gestureResult.isOK) {
            isOKDetected = true;
            maxConfidence = Math.max(maxConfidence, gestureResult.confidence);

            ctx.font = "bold 48px Arial";
            ctx.fillStyle = "#00FF00";
            ctx.strokeStyle = "#000000";
            ctx.lineWidth = 3;
            const text = "OK 👌";
            const textWidth = ctx.measureText(text).width;
            ctx.strokeText(text, (canvas.width - textWidth) / 2, 80);
            ctx.fillText(text, (canvas.width - textWidth) / 2, 80);
          }
        }
      }

      if (isOKDetected) {
        if (currentState === CaptureState.DETECTING_GESTURE) {
          gestureDetectionStartTime.current = currentTime;
          setState(CaptureState.GESTURE_DETECTED);
        } else if (currentState === CaptureState.GESTURE_DETECTED && gestureDetectionStartTime.current) {
          const elapsed = currentTime - gestureDetectionStartTime.current;
          const remaining = Math.ceil((3000 - elapsed) / 1000);

          if (elapsed >= 3000) {
            setState(CaptureState.COUNTDOWN);
            setCountdown(5);
            setStatusMessage("准备拍照！");
          } else {
            setStatusMessage(`保持OK手势 ${remaining}s`);
          }
        }
      } else {
        if (currentState === CaptureState.GESTURE_DETECTED) {
          setState(CaptureState.DETECTING_GESTURE);
          gestureDetectionStartTime.current = null;
          setStatusMessage("请做出OK手势");
        }
      }

      const currentStatusMessage = statusMessageRef.current;
      if (currentStatusMessage) {
        ctx.fillStyle = "#FFFFFF";
        ctx.strokeStyle = "#000000";
        ctx.lineWidth = 3;
        ctx.font = "bold 32px Arial";
        const textWidth = ctx.measureText(currentStatusMessage).width;
        ctx.strokeText(currentStatusMessage, (canvas.width - textWidth) / 2, canvas.height - 50);
        ctx.fillText(currentStatusMessage, (canvas.width - textWidth) / 2, canvas.height - 50);
      }
    }
  }, []);

  React.useEffect(() => {
    if (state === CaptureState.COUNTDOWN) {
      if (countdown > 0) {
        const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
        return () => clearTimeout(timer);
      } else {
        setState(CaptureState.CAPTURE);
      }
    }
  }, [state, countdown]);

  // Handle photo capture
  React.useEffect(() => {
    if (state === CaptureState.CAPTURE) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (video && canvas && lastBodyRectRef.current) {
        const tempCanvas = document.createElement("canvas");
        tempCanvas.width = video.videoWidth || 640;
        tempCanvas.height = video.videoHeight || 480;
        const tempCtx = tempCanvas.getContext("2d");
        if (tempCtx) {
          tempCtx.drawImage(video, 0, 0, tempCanvas.width, tempCanvas.height);
          const scaleX = tempCanvas.width / canvas.width;
          const scaleY = tempCanvas.height / canvas.height;
          const rect = lastBodyRectRef.current;
          const padding = 20;
          const x = Math.max(0, (rect.x - padding) * scaleX);
          const y = Math.max(0, (rect.y - padding) * scaleY);
          const width = Math.min(tempCanvas.width - x, (rect.width + padding * 2) * scaleX);
          const height = Math.min(tempCanvas.height - y, (rect.height + padding * 2) * scaleY);

          const resultCanvas = document.createElement("canvas");
          resultCanvas.width = width * 1.5;
          resultCanvas.height = height * 1.5;
          const resultCtx = resultCanvas.getContext("2d");
          if (resultCtx) {
            resultCtx.drawImage(tempCanvas, x, y, width, height, 0, 0, resultCanvas.width, resultCanvas.height);
            onCapture?.(resultCanvas);
          }
        }
        setState(CaptureState.COMPLETED);
        setStatusMessage("✓ 拍照完成！");
      }
    }
  }, [state, onCapture]);

  // Track when video element is ready
  const [videoReady, setVideoReady] = React.useState(false);
  
  // Callback ref for video element
  const videoCallbackRef = React.useCallback((node: HTMLVideoElement | null) => {
    videoRef.current = node;
    if (node) {
      console.log('✅ Video 元素已附加到 DOM');
      setVideoReady(true);
    }
  }, []);

  // Initialization effect - runs when video is ready
  React.useEffect(() => {
    if (!videoReady) {
      console.log('等待 video 元素...');
      return;
    }

    let mounted = true;
    let camera: Camera | null = null;
    let hands: Hands | null = null;
    let pose: Pose | null = null;

    const initialize = async () => {
      try {
        console.log('=======开始初始化=======');
        console.log('videoRef.current:', videoRef.current);
        console.log('canvasRef.current:', canvasRef.current);
        
        if (!videoRef.current || !canvasRef.current) {
          throw new Error('Video 或 Canvas 元素未找到');
        }

        const [poseInstance, handsInstance] = await Promise.all([
          initializePose(),
          (async () => {
            const h = new Hands({ locateFile: (file) => `/mediapipe/hands/${file}` });
            h.setOptions({ maxNumHands: 2, modelComplexity: 1, minDetectionConfidence: 0.7, minTrackingConfidence: 0.5 });
            return h;
          })(),
        ]);

        if (!mounted) return;
        pose = poseInstance;
        pose.onResults(onPoseResults);
        poseRef.current = pose;
        hands = handsInstance;
        hands.onResults(onHandsResults);
        handsRef.current = hands;

        console.log('创建 Camera 实例...');
        camera = new Camera(videoRef.current, {
          onFrame: async () => {
            if (!mounted || !videoRef.current) return;
            const currentState = stateRef.current;
            try {
              if (
                currentState === CaptureState.IDLE ||
                currentState === CaptureState.DETECTING_BODY ||
                currentState === CaptureState.BODY_DETECTED ||
                currentState === CaptureState.COMPLETED
              ) {
                if (pose && mounted) await pose.send({ image: videoRef.current });
              } else {
                if (pose && mounted) await pose.send({ image: videoRef.current });
                if (hands && mounted) await hands.send({ image: videoRef.current });
              }
            } catch (err) {}
          },
          width: 640,
          height: 480,
        });

        console.log('正在启动摄像头...');
        await camera.start();
        console.log('✅ 摄像头启动成功！');
        
        cameraRef.current = camera;
        setIsLoading(false);
        setState(CaptureState.IDLE);
        setStatusMessage("站在摄像头前开始检测");
        console.log('✅ 初始化完成');
      } catch (err) {
        console.error('❌ 初始化失败:', err);
        if (mounted) {
          setError(`无法启动摄像头或加载模型: ${err instanceof Error ? err.message : String(err)}`);
          setIsLoading(false);
        }
      }
    };

    initialize();

    return () => {
      mounted = false;
      if (camera) camera.stop();
      setTimeout(() => {
        if (hands) hands.close();
        if (pose) pose.close();
      }, 100);
    };
  }, [videoReady, onHandsResults, onPoseResults]);

  const handleReset = () => {
    setState(CaptureState.IDLE);
    setStatusMessage("");
    setCountdown(5);
    bodyDetectionStartTime.current = null;
    lastBodyDetectedTime.current = null;
    gestureDetectionStartTime.current = null;
    lastBodyRectRef.current = null;
    lastPoseLandmarksRef.current = null;
    frameCountRef.current = 0;
  };

  return {
    videoRef: videoCallbackRef,
    canvasRef,
    state,
    isLoading,
    error,
    statusMessage,
    countdown,
    handleReset,
  };
}
