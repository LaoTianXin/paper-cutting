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
  const gestureLastLostTime = React.useRef<number | null>(null);
  const lastBodyRectRef = React.useRef<BodyRect | null>(null);
  const lastPoseLandmarksRef = React.useRef<PoseResults["poseLandmarks"] | null>(null);
  const frameCountRef = React.useRef<number>(0);

  const poseRef = React.useRef<Pose | null>(null);
  const handsRef = React.useRef<Hands | null>(null);
  const cameraRef = React.useRef<Camera | null>(null);
  
  // 保存最新的结果用于绘制
  const latestPoseResultsRef = React.useRef<PoseResults | null>(null);
  const latestHandsResultsRef = React.useRef<Results | null>(null);
  const pendingDrawRef = React.useRef<boolean>(false);
  const frozenFrameRef = React.useRef<string | null>(null);

  React.useEffect(() => {
    stateRef.current = state;
    countdownRef.current = countdown;
    statusMessageRef.current = statusMessage;
  }, [state, countdown, statusMessage]);

  // 统一的绘制函数，在 requestAnimationFrame 中调用
  const draw = React.useCallback(() => {
    const canvas = canvasRef.current;
    const video = videoRef.current;
    if (!canvas || !video) {
      pendingDrawRef.current = false;
      return;
    }

    const ctx = canvas.getContext("2d");
    if (!ctx) {
      pendingDrawRef.current = false;
      return;
    }

    const currentState = stateRef.current;
    const poseResults = latestPoseResultsRef.current;
    const handsResults = latestHandsResultsRef.current;

    // 清空画布并绘制视频帧
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // 始终使用 video 元素作为绘制源，保持一致性，避免切换时闪烁
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    // 绘制 pose landmarks 和全身框（在非手势检测状态）
    if (poseResults && poseResults.poseLandmarks && (
      currentState === CaptureState.IDLE ||
      currentState === CaptureState.DETECTING_BODY ||
      currentState === CaptureState.BODY_DETECTED ||
      currentState === CaptureState.COUNTDOWN ||
      currentState === CaptureState.COMPLETED
    )) {
      const rect = calculateBodyRect(poseResults.poseLandmarks, canvas.width, canvas.height);
      if (rect) {
        if (
          currentState === CaptureState.IDLE ||
          currentState === CaptureState.DETECTING_BODY ||
          currentState === CaptureState.BODY_DETECTED
        ) {
          drawConnectors(ctx, poseResults.poseLandmarks, POSE_CONNECTIONS, { color: "#00FF00", lineWidth: 2 });
          drawLandmarks(ctx, poseResults.poseLandmarks, { color: "#FF0000", radius: 3 });
          ctx.strokeStyle = "#00FF00";
          ctx.lineWidth = 4;
          ctx.strokeRect(rect.x, rect.y, rect.width, rect.height);
          ctx.fillStyle = "#00FF00";
          ctx.font = "bold 12px Arial";
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
      }
    }

    // 绘制全身框（在手势检测状态，使用缓存的框）
    if ((currentState === CaptureState.DETECTING_GESTURE || currentState === CaptureState.GESTURE_DETECTED) && lastBodyRectRef.current) {
      ctx.strokeStyle = "rgba(0, 255, 0, 0.8)";
      ctx.lineWidth = 3;
      ctx.strokeRect(lastBodyRectRef.current.x, lastBodyRectRef.current.y, lastBodyRectRef.current.width, lastBodyRectRef.current.height);
    }

    // 绘制手部 landmarks 和 OK 手势（在手势检测状态）
    if (handsResults && handsResults.multiHandLandmarks && handsResults.multiHandLandmarks.length > 0 &&
        (currentState === CaptureState.DETECTING_GESTURE || currentState === CaptureState.GESTURE_DETECTED)) {
      for (const landmarks of handsResults.multiHandLandmarks) {
        drawConnectors(ctx, landmarks, HAND_CONNECTIONS, { color: "#00FF00", lineWidth: 3 });
        drawLandmarks(ctx, landmarks, { color: "#FF0000", lineWidth: 1, radius: 4 });

        const gestureResult = recognizeOKGesture(landmarks);
        if (gestureResult.isOK) {
          ctx.font = "bold 24px Arial";
          ctx.fillStyle = "#00FF00";
          ctx.strokeStyle = "#000000";
          ctx.lineWidth = 2;
          const text = "OK 👌";
          const textWidth = ctx.measureText(text).width;
          ctx.strokeText(text, (canvas.width - textWidth) / 2, 80);
          ctx.fillText(text, (canvas.width - textWidth) / 2, 80);
        }
      }
    }

    // 绘制倒计时
    if (currentState === CaptureState.COUNTDOWN) {
      ctx.fillStyle = "#FFD700";
      ctx.strokeStyle = "#000000";
      ctx.lineWidth = 3;
      ctx.font = "bold 60px Arial";
      const text = countdownRef.current.toString();
      const textWidth = ctx.measureText(text).width;
      ctx.strokeText(text, (canvas.width - textWidth) / 2, canvas.height / 2);
      ctx.fillText(text, (canvas.width - textWidth) / 2, canvas.height / 2);
    }

    // 绘制状态消息
    const currentStatusMessage = statusMessageRef.current;
    if (currentStatusMessage && currentState !== CaptureState.COUNTDOWN) {
      ctx.fillStyle = "#FFFFFF";
      ctx.strokeStyle = "#000000";
      ctx.lineWidth = 2;
      ctx.font = "bold 16px Arial";
      const textWidth = ctx.measureText(currentStatusMessage).width;
      ctx.strokeText(currentStatusMessage, (canvas.width - textWidth) / 2, canvas.height - 50);
      ctx.fillText(currentStatusMessage, (canvas.width - textWidth) / 2, canvas.height - 50);
    }

    pendingDrawRef.current = false;
  }, []);

  // 请求绘制
  const requestDraw = React.useCallback(() => {
    if (!pendingDrawRef.current) {
      pendingDrawRef.current = true;
      requestAnimationFrame(draw);
    }
  }, [draw]);

  const onPoseResults = React.useCallback((results: PoseResults) => {
    const currentTime = Date.now();
    const currentState = stateRef.current;
    const canvas = canvasRef.current;
    if (!canvas) return;

    // 保存最新的结果
    latestPoseResultsRef.current = results;

    // 处理全身检测逻辑
    if (results.poseLandmarks) {
      const rect = calculateBodyRect(results.poseLandmarks, canvas.width, canvas.height);
      if (rect) {
        lastBodyDetectedTime.current = currentTime;
        lastBodyRectRef.current = rect;
        lastPoseLandmarksRef.current = results.poseLandmarks;

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
      // 全身丢失处理
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

    // 请求绘制
    requestDraw();
  }, [requestDraw]);

  const onHandsResults = React.useCallback((results: Results) => {
    const currentTime = Date.now();
    const currentState = stateRef.current;
    const video = videoRef.current;
    if (!video) return;

    // 保存最新的结果
    latestHandsResultsRef.current = results;

    if (currentState === CaptureState.DETECTING_GESTURE || currentState === CaptureState.GESTURE_DETECTED) {
      // 每5帧检测一次pose，减少更新频率，避免闪动
      frameCountRef.current++;
      if (frameCountRef.current % 5 === 0 && poseRef.current && video) {
        try {
          poseRef.current.send({ image: video }).catch(() => {});
        } catch (err) {}
      }

      // 检查全身是否丢失
      if (lastBodyDetectedTime.current && currentTime - lastBodyDetectedTime.current >= 1000) {
        setState(CaptureState.IDLE);
        bodyDetectionStartTime.current = null;
        lastBodyDetectedTime.current = null;
        gestureDetectionStartTime.current = null;
        frameCountRef.current = 0;
        setStatusMessage("❌ 全身丢失，重新检测");
        setTimeout(() => setStatusMessage(""), 1500);
        requestDraw();
        return;
      }

      // 检测 OK 手势
      let isOKDetected = false;
      if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
        for (const landmarks of results.multiHandLandmarks) {
          const gestureResult = recognizeOKGesture(landmarks);
          if (gestureResult.isOK) {
            isOKDetected = true;
            break;
          }
        }
      }

      // 处理手势状态
      if (isOKDetected) {
        gestureLastLostTime.current = null;
        
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
        // 手势未检测到
        if (currentState === CaptureState.GESTURE_DETECTED) {
          // 只有在手势持续丢失300ms后才切换状态，避免闪动
          if (gestureLastLostTime.current === null) {
            gestureLastLostTime.current = currentTime;
          } else if (currentTime - gestureLastLostTime.current >= 300) {
            setState(CaptureState.DETECTING_GESTURE);
            gestureDetectionStartTime.current = null;
            gestureLastLostTime.current = null;
            setStatusMessage("请做出OK手势");
          }
        }
      }

      // 请求绘制
      requestDraw();
    }
  }, [requestDraw]);

  React.useEffect(() => {
    if (state === CaptureState.COUNTDOWN) {
      if (countdown > 0) {
        const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
        return () => clearTimeout(timer);
      } else {
        // 倒计时结束，捕获当前帧作为frozen frame
        // 从 video 元素捕获，而不是 canvas，这样不会包含线框和倒计时
        const video = videoRef.current;
        const canvas = canvasRef.current;
        if (video && canvas) {
          try {
            // 创建临时 canvas 用于捕获和裁剪
            const tempCanvas = document.createElement('canvas');
            const sourceWidth = video.videoWidth || 640;
            const sourceHeight = video.videoHeight || 480;
            
            // 计算 9:16 裁剪区域（与 CameraFeed 中的逻辑一致）
            const targetAspect = 9 / 16;
            const sourceAspect = sourceWidth / sourceHeight;
            
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
            
            // 设置临时 canvas 为裁剪后的尺寸
            tempCanvas.width = cropWidth;
            tempCanvas.height = cropHeight;
            
            const tempCtx = tempCanvas.getContext('2d');
            if (tempCtx) {
              // 从 video 绘制裁剪后的区域到临时 canvas
              tempCtx.drawImage(
                video,
                cropX, cropY, cropWidth, cropHeight,
                0, 0, cropWidth, cropHeight
              );
              
              // 转换为 data URL
              const frozenFrameUrl = tempCanvas.toDataURL('image/png');
              frozenFrameRef.current = frozenFrameUrl;
              console.log('✅ Frozen frame captured at countdown end (clean, 9:16 cropped)');
            }
          } catch (err) {
            console.error('❌ Failed to capture frozen frame:', err);
          }
        }
        // 立即进入拍照中状态显示快门效果
        setState(CaptureState.CAPTURING);
      }
    }
  }, [state, countdown]);

  // Handle capturing state - show shutter effect then take photo
  React.useEffect(() => {
    if (state === CaptureState.CAPTURING) {
      const captureTimer = setTimeout(() => {
        setState(CaptureState.CAPTURE);
      }, 300000); // 3秒拍照延迟，显示快门效果
      return () => clearTimeout(captureTimer);
    }
  }, [state]);

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
              // 在手势检测阶段同时运行 pose 和 hands
              if (
                currentState === CaptureState.DETECTING_GESTURE ||
                currentState === CaptureState.GESTURE_DETECTED
              ) {
                // 不等待 pose 完成，让它在后台运行
                if (pose && mounted) {
                  pose.send({ image: videoRef.current }).catch(() => {});
                }
                // hands 是主要处理，等待它完成
                if (hands && mounted) {
                  await hands.send({ image: videoRef.current });
                }
              } else {
                // 其他状态只运行 pose
                if (pose && mounted) {
                  await pose.send({ image: videoRef.current });
                }
              }
            } catch (err) {
              // 忽略错误，继续下一帧
            }
          },
          width: 640,
          height: 480,
        });

        console.log('正在启动摄像头...');
        await camera.start();
        console.log('✅ 摄像头启动成功！');
        
        cameraRef.current = camera;
        
        // 预热 hands 模型，避免首次使用时卡顿
        console.log('预热 hands 模型...');
        if (videoRef.current && hands) {
          try {
            await hands.send({ image: videoRef.current });
            console.log('✅ hands 模型预热完成');
          } catch (err) {
            console.log('预热失败，但不影响使用');
          }
        }
        
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
    gestureLastLostTime.current = null;
    lastBodyRectRef.current = null;
    lastPoseLandmarksRef.current = null;
    frameCountRef.current = 0;
    frozenFrameRef.current = null;
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
    frozenFrame: frozenFrameRef.current,
  };
}
