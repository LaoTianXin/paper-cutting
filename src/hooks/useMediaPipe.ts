import React from "react";
import { Hands, HAND_CONNECTIONS, type Results } from "@mediapipe/hands";
import { Pose, POSE_CONNECTIONS, type Results as PoseResults } from "@mediapipe/pose";
import { Camera } from "@mediapipe/camera_utils";
import { drawConnectors, drawLandmarks } from "@mediapipe/drawing_utils";
import { initializePose, calculateBodyRect, type BodyRect } from "../poseDetection";
import { CaptureState } from "../types/capture";
import { recognizeOKGesture } from "../utils/gestureRecognition";
import { useSettings } from "../contexts/SettingsContext";

// 目标显示比例 10:16（与 CameraFeed 保持一致）
const TARGET_ASPECT_RATIO = 10 / 16;

/**
 * 计算 10:16 裁剪区域的边界（归一化坐标 0-1）
 * 相机捕获的是 4:3 (640x480)，显示的是中间的 10:16 区域
 */
function getCropBounds(sourceWidth: number, sourceHeight: number) {
  const sourceAspect = sourceWidth / sourceHeight;
  
  let cropX = 0, cropY = 0, cropWidth = 1, cropHeight = 1;
  
  if (sourceAspect > TARGET_ASPECT_RATIO) {
    // Source is wider (4:3 > 10:16), crop the width
    const visibleWidthRatio = (sourceHeight * TARGET_ASPECT_RATIO) / sourceWidth;
    cropWidth = visibleWidthRatio;
    cropX = (1 - visibleWidthRatio) / 2;
  } else {
    // Source is taller, crop the height
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
 * 检查手势关键点是否大部分在裁剪区域内
 */
function isHandInCropArea(
  landmarks: { x: number; y: number }[],
  sourceWidth: number,
  sourceHeight: number
): boolean {
  const bounds = getCropBounds(sourceWidth, sourceHeight);
  // 检查手掌中心点（关键点0是手腕）
  const wrist = landmarks[0];
  const middleFinger = landmarks[9]; // 中指根部
  const centerX = (wrist.x + middleFinger.x) / 2;
  const centerY = (wrist.y + middleFinger.y) / 2;
  
  return isPointInCropArea(centerX, centerY, bounds);
}

/**
 * 检查人体是否在裁剪区域内（基于 pose landmarks）
 */
function isBodyInCropArea(
  landmarks: { x: number; y: number; visibility?: number }[],
  sourceWidth: number,
  sourceHeight: number
): boolean {
  const bounds = getCropBounds(sourceWidth, sourceHeight);
  
  // 检查关键身体部位是否在裁剪区域内
  // 使用躯干中心（左右肩膀和左右髋部的中心）
  const leftShoulder = landmarks[11];
  const rightShoulder = landmarks[12];
  const leftHip = landmarks[23];
  const rightHip = landmarks[24];
  
  // 检查可见性
  const visibleParts = [leftShoulder, rightShoulder, leftHip, rightHip].filter(
    lm => (lm?.visibility ?? 0) > 0.5
  );
  
  if (visibleParts.length < 2) return false;
  
  // 计算躯干中心
  const centerX = visibleParts.reduce((sum, lm) => sum + lm.x, 0) / visibleParts.length;
  const centerY = visibleParts.reduce((sum, lm) => sum + lm.y, 0) / visibleParts.length;
  
  return isPointInCropArea(centerX, centerY, bounds);
}

interface UseMediaPipeProps {
  onCapture?: (canvas: HTMLCanvasElement) => void;
}

export function useMediaPipe({ onCapture }: UseMediaPipeProps = {}) {
  // Get settings from context
  const { settings, updateFps } = useSettings();
  const settingsRef = React.useRef(settings);
  
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
  
  // 保存实际视频分辨率，避免硬编码 (高分辨率 1280x960)
  const videoDimensionsRef = React.useRef<{ width: number; height: number }>({ width: 1280, height: 960 });
  
  // 保存最新的结果用于绘制
  const latestPoseResultsRef = React.useRef<PoseResults | null>(null);
  const latestHandsResultsRef = React.useRef<Results | null>(null);
  const pendingDrawRef = React.useRef<boolean>(false);
  const frozenFrameRef = React.useRef<string | null>(null);
  
  // FPS tracking
  const fpsFrameCountRef = React.useRef(0);
  const fpsLastTimeRef = React.useRef(performance.now());
  
  // Update settingsRef when settings change
  React.useEffect(() => {
    settingsRef.current = settings;
  }, [settings]);

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
    const debugMode = settingsRef.current.debugMode;

    // Calcalate scale based on 1280 width baseline
    const scale = canvas.width / 1280;

    // FPS calculation
    fpsFrameCountRef.current++;
    const now = performance.now();
    if (now - fpsLastTimeRef.current >= 1000) {
      const fps = Math.round(fpsFrameCountRef.current * 1000 / (now - fpsLastTimeRef.current));
      updateFps(fps);
      fpsFrameCountRef.current = 0;
      fpsLastTimeRef.current = now;
    }

    // 清空画布
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // 计算 object-fit: cover 的裁剪参数
    // 确保视频填充整个画布且不变形
    const vWidth = video.videoWidth;
    const vHeight = video.videoHeight;
    
    // 如果视频尚未准备好，直接返回
    if (!vWidth || !vHeight) {
      pendingDrawRef.current = false;
      return;
    }
    
    const cWidth = canvas.width;
    const cHeight = canvas.height;
    
    // 计算缩放比例：取宽比和高比的最大值，确保填满画布
    const scaleRatio = Math.max(cWidth / vWidth, cHeight / vHeight);
    
    // 计算在原视频上需要截取的区域 (source rect)
    const sWidth = cWidth / scaleRatio;
    const sHeight = cHeight / scaleRatio;
    
    // 居中裁剪
    const sx = (vWidth - sWidth) / 2;
    const sy = (vHeight - sHeight) / 2;
    
    // 绘制裁剪后的视频帧
    ctx.drawImage(video, sx, sy, sWidth, sHeight, 0, 0, cWidth, cHeight);

    // 计算调试绘制的变换矩阵
    // MediaPipe 返回的 landmarks 是归一化的 (0-1)，相对于原始视频尺寸
    // 我们需要将其映射到裁剪后的画布坐标系
    // CanvasX = (VideoX - sx) * (cWidth / sWidth)
    // VideoX = LandmarkX * vWidth
    // 所以: CanvasX = LandmarkX * vWidth * (cWidth / sWidth) - sx * (cWidth / sWidth)
    // Scale = vWidth / sWidth
    // Translate = -sx * (cWidth / sWidth)
    
    // 注意: sWidth = cWidth / scaleRatio => cWidth / sWidth = scaleRatio
    // 所以 Scale = vWidth * scaleRatio / cWidth ??? 
    // 不，简单推导:
    // 我们将视频区域 [sx, sx+sWidth] 映射到了 [0, cWidth]
    // 缩放因子 k = cWidth / sWidth
    // 平移 = -sx * k
    
    const k = cWidth / sWidth;
    const transX = -sx * k;
    const transY = -sy * k;
    const scaleX = vWidth * k / cWidth; // drawLandmarks 内部乘以 canvas.width，所以我们要使得 unit 1 对应 vWidth * k
    const scaleY = vHeight * k / cHeight;
    
    // 等等，drawLandmarks 使用 x * canvas.width。
    // 我们希望 x * canvas.width 变换后等于 (x * vWidth - sx) * k
    // Transformed(x * cWidth) = x * cWidth * S + T
    // Target = x * vWidth * k - sx * k
    // 所以 S = (vWidth * k) / cWidth
    // T = -sx * k
    
    // 保存上下文状态
    ctx.save();
    ctx.translate(transX, transY);
    ctx.scale(scaleX, scaleY);

    // 绘制 pose landmarks 和全身框（仅在 debugMode 开启时）
    if (debugMode && poseResults && poseResults.poseLandmarks && (
      currentState === CaptureState.IDLE ||
      currentState === CaptureState.DETECTING_BODY ||
      currentState === CaptureState.BODY_DETECTED ||
      currentState === CaptureState.COUNTDOWN ||
      currentState === CaptureState.COMPLETED
    )) {
      // 只有当人体在 10:16 裁剪区域内时才绘制
      const { width: videoW, height: videoH } = videoDimensionsRef.current;
      const bodyInCropArea = isBodyInCropArea(poseResults.poseLandmarks, videoW, videoH);
      const rect = calculateBodyRect(poseResults.poseLandmarks, canvas.width, canvas.height); // 这里 calculateBodyRect 使用了 canvas.width，但因为我们缩放了 context，这里需要注意
      // calculateBodyRect 返回的是像素值 (基于 canvas.width)。
      // 我们的 context 已经缩放了。如果不调整，rect 也会被缩放。
      // 但是 rect 是基于 landmarks * canvas.width 计算的。
      // 我们的 context 缩放是为了让 "landmarks * canvas.width" 正确映射。
      // 所以 rect 应该也是正确的。
      
      if (rect && bodyInCropArea) {
        if (
          currentState === CaptureState.IDLE ||
          currentState === CaptureState.DETECTING_BODY ||
          currentState === CaptureState.BODY_DETECTED
        ) {
          // 由于 context 缩放了，lineWidth 也会被缩放。
          // scale 变量 (canvas.width / 1280) 已经处理了屏幕适配。
          // 这里的 scaleX/scaleY 处理了 crop 适配 (zoom)。
          // 看起来是合理的。
          drawConnectors(ctx, poseResults.poseLandmarks, POSE_CONNECTIONS, { color: "#00FF00", lineWidth: 4 * scale });
          drawLandmarks(ctx, poseResults.poseLandmarks, { color: "#FF0000", radius: 6 * scale });
          ctx.strokeStyle = "#00FF00";
          ctx.lineWidth = 8 * scale;
          ctx.strokeRect(rect.x, rect.y, rect.width, rect.height);
          ctx.fillStyle = "#00FF00";
          ctx.font = `bold ${Math.round(24 * scale)}px Arial`;
          // 恢复文字绘制时的 scale，避免文字变形（如果 scaleX != scaleY）
          // 这里 scaleX = scaleY (因为 sWidth/sHeight = cWidth/cHeight = aspect ratio preserved)
          ctx.fillText("全身已检测", rect.x, rect.y - 20 * scale);
        } else if (currentState === CaptureState.COUNTDOWN) {
          ctx.strokeStyle = "#00FF00";
          ctx.lineWidth = 6 * scale;
          ctx.strokeRect(rect.x, rect.y, rect.width, rect.height);
        } else if (currentState === CaptureState.COMPLETED) {
          ctx.strokeStyle = "rgba(0, 255, 0, 0.3)";
          ctx.lineWidth = 4 * scale;
          ctx.strokeRect(rect.x, rect.y, rect.width, rect.height);
        }
      }
    }

    // 绘制全身框（在手势检测状态，使用缓存的框，仅 debugMode）
    if (debugMode && (currentState === CaptureState.DETECTING_GESTURE || currentState === CaptureState.GESTURE_DETECTED) && lastBodyRectRef.current) {
      ctx.strokeStyle = "rgba(0, 255, 0, 0.8)";
      ctx.lineWidth = 6 * scale;
      ctx.strokeRect(lastBodyRectRef.current.x, lastBodyRectRef.current.y, lastBodyRectRef.current.width, lastBodyRectRef.current.height);
    }

    // 绘制手部 landmarks 和 OK 手势（在手势检测状态，仅 debugMode）
    if (debugMode && handsResults && handsResults.multiHandLandmarks && handsResults.multiHandLandmarks.length > 0 &&
        (currentState === CaptureState.DETECTING_GESTURE || currentState === CaptureState.GESTURE_DETECTED)) {
      for (const landmarks of handsResults.multiHandLandmarks) {
        // 只绘制在 10:16 裁剪区域内的手势
        const { width: videoW, height: videoH } = videoDimensionsRef.current;
        if (!isHandInCropArea(landmarks, videoW, videoH)) {
          continue;
        }
        drawConnectors(ctx, landmarks, HAND_CONNECTIONS, { color: "#00FF00", lineWidth: 6 * scale });
        drawLandmarks(ctx, landmarks, { color: "#FF0000", lineWidth: 2 * scale, radius: 8 * scale });

        const gestureResult = recognizeOKGesture(landmarks, {
            circleThreshold: settingsRef.current.gestureCircleThreshold,
            fingerExtendThreshold: settingsRef.current.gestureFingerExtendThreshold,
            confidenceThreshold: settingsRef.current.gestureConfidenceThreshold
        });
        if (gestureResult.isOK) {
          ctx.font = `bold ${Math.round(48 * scale)}px Arial`;
          ctx.fillStyle = "#00FF00";
          ctx.strokeStyle = "#000000";
          ctx.lineWidth = 4 * scale;
          const text = "OK 👌";
          // 注意：text 也是在 transform 下绘制的。如果 text 位置是基于 canvas center 计算的...
          // width/height 是 canvas dimensions。
          // canvas.width 在 transform 下不再对应 屏幕右边缘。
          // 但是我们需要文字居中...
          // ctx.fillText(text, (canvas.width - textWidth) / 2, 160 * scale);
          // (canvas.width - textWidth) / 2 是 canvas 坐标系下的中心。
          // 但是当前坐标系被平移了 (-sx * k)。
          // 屏幕中心在当前坐标系下是: (ScreenCenter - T) / S ? No.
          // Drawing at (canvas.width/2) inside transformed context means:
          // VisualPos = T + S * (canvas.width/2).
          // We want VisualPos = CanvasCenter = cWidth/2.
          // So we need to draw at X such that T + S*X = cWidth/2.
          // X = (cWidth/2 - T) / S.
          
          // 这是一个问题。原本的代码使用了绝对坐标 (canvas.width).
          // 如果我们 scale/translate 了整个 context，
          // 用 "canvas.width" 计算出的坐标将不再对应物理画布的边缘。
          
          // 解决方案：
          // 对于“固定在屏幕位置”的 UI（如倒计时、状态文字），我们应该在 restore() 之后绘制！
          // 对于“跟随物体”的 UI（如骨架、检测框），我们应该在 restore() 之前绘制。
        }
      }
    }
    
    // 恢复 context，以便后续绘制固定 UI
    ctx.restore();

    // 重新遍历绘制固定 UI (倒计时，状态文字，以及 OK 手势的文字)
    // OK手势文字如果是跟随手的，应该在上面画。
    // 但原代码是固定在屏幕上方 (160px)。
    // 所以 OK 手势文字也应该移到外面。

    // 补画: OK 手势文字 (如果有)
    if (debugMode && handsResults && handsResults.multiHandLandmarks && handsResults.multiHandLandmarks.length > 0 &&
        (currentState === CaptureState.DETECTING_GESTURE || currentState === CaptureState.GESTURE_DETECTED)) {
         let showOK = false;
         for (const landmarks of handsResults.multiHandLandmarks) {
            const { width: videoW, height: videoH } = videoDimensionsRef.current;
            if (isHandInCropArea(landmarks, videoW, videoH) && recognizeOKGesture(landmarks, {
                circleThreshold: settingsRef.current.gestureCircleThreshold,
                fingerExtendThreshold: settingsRef.current.gestureFingerExtendThreshold,
                confidenceThreshold: settingsRef.current.gestureConfidenceThreshold
            }).isOK) {
                showOK = true;
                break;
            }
         }
         if (showOK) {
             ctx.font = `bold ${Math.round(48 * scale)}px Arial`;
             ctx.fillStyle = "#00FF00";
             ctx.strokeStyle = "#000000";
             ctx.lineWidth = 4 * scale;
             const text = "OK 👌";
             const textWidth = ctx.measureText(text).width;
             ctx.strokeText(text, (canvas.width - textWidth) / 2, 160 * scale);
             ctx.fillText(text, (canvas.width - textWidth) / 2, 160 * scale);
         }
    }

    // 绘制倒计时
    if (currentState === CaptureState.COUNTDOWN) {
      ctx.fillStyle = "#FFD700";
      ctx.strokeStyle = "#000000";
      ctx.lineWidth = 6 * scale;
      ctx.font = `bold ${Math.round(120 * scale)}px Arial`;
      const text = countdownRef.current.toString();
      const textWidth = ctx.measureText(text).width;
      ctx.strokeText(text, (canvas.width - textWidth) / 2, canvas.height / 2);
      ctx.fillText(text, (canvas.width - textWidth) / 2, canvas.height / 2);
    }

    // 绘制状态消息（仅 debugMode 或倒计时状态）
    const currentStatusMessage = statusMessageRef.current;
    if (debugMode && currentStatusMessage && currentState !== CaptureState.COUNTDOWN) {
      ctx.fillStyle = "#FFFFFF";
      ctx.strokeStyle = "#000000";
      ctx.lineWidth = 4 * scale;
      ctx.font = `bold ${Math.round(32 * scale)}px Arial`;
      const textWidth = ctx.measureText(currentStatusMessage).width;
      ctx.strokeText(currentStatusMessage, (canvas.width - textWidth) / 2, canvas.height - 100 * scale);
      ctx.fillText(currentStatusMessage, (canvas.width - textWidth) / 2, canvas.height - 100 * scale);
    }

    pendingDrawRef.current = false;
  }, [updateFps]);

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
      // 检查人体是否在 10:16 裁剪区域内
      const { width: videoW, height: videoH } = videoDimensionsRef.current;
      const isInCropArea = isBodyInCropArea(results.poseLandmarks, videoW, videoH);
      const rect = calculateBodyRect(results.poseLandmarks, canvas.width, canvas.height);
      
      if (rect && isInCropArea) {
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
      } else if (!isInCropArea && currentState === CaptureState.DETECTING_BODY) {
        // 人体不在裁剪区域内，提示用户
        setStatusMessage("请站到画面中央");
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

      // 检测 OK 手势（只检测在 10:16 裁剪区域内的手势）
      let isOKDetected = false;
      if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
        for (const landmarks of results.multiHandLandmarks) {
          // 先检查手势是否在裁剪区域内
          const { width: videoW, height: videoH } = videoDimensionsRef.current;
          if (!isHandInCropArea(landmarks, videoW, videoH)) {
            continue;
          }
          const gestureResult = recognizeOKGesture(landmarks, {
            circleThreshold: settingsRef.current.gestureCircleThreshold,
            fingerExtendThreshold: settingsRef.current.gestureFingerExtendThreshold,
            confidenceThreshold: settingsRef.current.gestureConfidenceThreshold
          });
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
            
            // 计算 10:16 裁剪区域（与显示区域保持一致）
            const targetAspect = TARGET_ASPECT_RATIO; // 10 / 16
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
              console.log('✅ Frozen frame captured at countdown end (clean, 10:16 cropped)');
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

  // Handle capturing state - immediately take photo (no delay)
  React.useEffect(() => {
    if (state === CaptureState.CAPTURING) {
      // 直接进入 CAPTURE 状态，不再等待 3 秒
      setState(CaptureState.CAPTURE);
    }
  }, [state]);

  // Handle photo capture - output 10:16 aspect ratio image
  React.useEffect(() => {
    if (state === CaptureState.CAPTURE) {
      const video = videoRef.current;
      if (video) {
        const sourceWidth = video.videoWidth || 640;
        const sourceHeight = video.videoHeight || 480;
        
        // 计算 10:16 裁剪区域
        const targetAspect = TARGET_ASPECT_RATIO; // 10 / 16 = 0.625
        const sourceAspect = sourceWidth / sourceHeight;
        
        let cropWidth, cropHeight, cropX, cropY;
        if (sourceAspect > targetAspect) {
          // 视频更宽，需要裁剪宽度
          cropHeight = sourceHeight;
          cropWidth = sourceHeight * targetAspect;
          cropX = (sourceWidth - cropWidth) / 2;
          cropY = 0;
        } else {
          // 视频更高，需要裁剪高度
          cropWidth = sourceWidth;
          cropHeight = sourceWidth / targetAspect;
          cropX = 0;
          cropY = (sourceHeight - cropHeight) / 2;
        }
        
        // 创建 10:16 比例的画布
        const resultCanvas = document.createElement("canvas");
        resultCanvas.width = cropWidth;
        resultCanvas.height = cropHeight;
        
        const resultCtx = resultCanvas.getContext("2d");
        if (resultCtx) {
          // 从视频中裁剪 10:16 区域
          resultCtx.drawImage(
            video,
            cropX, cropY, cropWidth, cropHeight,
            0, 0, cropWidth, cropHeight
          );
          
          console.log(`截图完成: ${cropWidth}x${cropHeight} (比例 ${(cropWidth/cropHeight).toFixed(3)})`);
          onCapture?.(resultCanvas);
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

        // Initialize sequentially to avoid race conditions with shared global variables in loaders
        console.log('Initializing Pose...');
        const poseInstance = await initializePose();
        
        console.log('Initializing Hands...');
        const handsInstance = await (async () => {
          const h = new Hands({ 
            locateFile: (file) => {
              if (file.includes('pose')) {
                return `${import.meta.env.BASE_URL}mediapipe/pose/${file}`;
              }
              return `${import.meta.env.BASE_URL}mediapipe/hands/${file}`;
            }
          });
          h.setOptions({ 
            maxNumHands: settingsRef.current.handsMaxNum, 
            modelComplexity: settingsRef.current.handsModelComplexity, 
            minDetectionConfidence: settingsRef.current.handsMinDetectionConfidence, 
            minTrackingConfidence: settingsRef.current.handsMinTrackingConfidence 
          });
          return h;
        })();

        if (!mounted) return;
        pose = poseInstance;
        pose.onResults(onPoseResults);
        poseRef.current = pose;
        hands = handsInstance;
        hands.onResults(onHandsResults);
        handsRef.current = hands;

        console.log('创建 Camera 实例...');
        
        // 从设置中获取分辨率
        const targetWidth = settingsRef.current.videoWidth;
        const targetHeight = settingsRef.current.videoHeight;
        console.log(`📹 请求分辨率: ${targetWidth}x${targetHeight}`);
        
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
          width: targetWidth,
          height: targetHeight,
        });

        console.log('正在启动摄像头...');
        await camera.start();
        console.log('✅ 摄像头启动成功！');
        
        // 更新实际视频分辨率
        if (videoRef.current) {
          const requestedWidth = settingsRef.current.videoWidth;
          const requestedHeight = settingsRef.current.videoHeight;
          const actualWidth = videoRef.current.videoWidth || targetWidth;
          const actualHeight = videoRef.current.videoHeight || targetHeight;
          videoDimensionsRef.current = { width: actualWidth, height: actualHeight };
          
          if (actualWidth !== requestedWidth || actualHeight !== requestedHeight) {
            console.log(`📹 请求分辨率: ${requestedWidth}x${requestedHeight}，摄像头实际输出: ${actualWidth}x${actualHeight}`);
          } else {
            console.log(`✅ 视频分辨率: ${actualWidth}x${actualHeight}`);
          }
        }
        
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

  
  // 停止摄像头（进入 Page5 时调用，避免多摄像头冲突）
  const stopCamera = React.useCallback(() => {
    if (cameraRef.current) {
      console.log('正在停止主摄像头...');
      cameraRef.current.stop();
      cameraRef.current = null;
      console.log('✅ 主摄像头已停止');
    }
  }, []);

  // 重新启动摄像头（从 Page5 返回时调用）
  const restartCamera = React.useCallback(async () => {
    if (!videoRef.current) {
      console.log('无法重启摄像头: video 元素不存在');
      return;
    }
    
    if (cameraRef.current) {
      console.log('摄像头已在运行');
      return;
    }

    try {
      console.log('正在重新启动摄像头...');
      const video = videoRef.current;
      
      const camera = new Camera(video, {
        onFrame: async () => {
          if (!videoRef.current) return;
          const currentState = stateRef.current;
          
          try {
            if (
              currentState === CaptureState.DETECTING_GESTURE ||
              currentState === CaptureState.GESTURE_DETECTED
            ) {
              if (poseRef.current) {
                poseRef.current.send({ image: videoRef.current }).catch(() => {});
              }
              if (handsRef.current) {
                await handsRef.current.send({ image: videoRef.current });
              }
            } else {
              if (poseRef.current) {
                await poseRef.current.send({ image: videoRef.current });
              }
            }
          } catch (err) {
            // 忽略错误
          }
        },
        width: settingsRef.current.videoWidth,
        height: settingsRef.current.videoHeight,
      });

      await camera.start();
      cameraRef.current = camera;
      
      // 等待 video 元素正确加载分辨率（最多等待 2 秒）
      const waitForVideoDimensions = (): Promise<{ width: number; height: number }> => {
        return new Promise((resolve) => {
          let attempts = 0;
          const maxAttempts = 40; // 40 * 50ms = 2s
          
          const checkDimensions = () => {
            attempts++;
            if (video.videoWidth > 0 && video.videoHeight > 0) {
              console.log(`✅ 视频分辨率已就绪: ${video.videoWidth}x${video.videoHeight} (尝试 ${attempts} 次)`);
              resolve({ width: video.videoWidth, height: video.videoHeight });
            } else if (attempts >= maxAttempts) {
              console.warn(`⚠️ 等待视频分辨率超时，使用设置值 ${settingsRef.current.videoWidth}x${settingsRef.current.videoHeight}`);
              resolve({ width: settingsRef.current.videoWidth, height: settingsRef.current.videoHeight });
            } else {
              setTimeout(checkDimensions, 50);
            }
          };
          
          checkDimensions();
        });
      };
      
      const dimensions = await waitForVideoDimensions();
      videoDimensionsRef.current = dimensions;
      
      console.log('✅ 摄像头重新启动成功');
    } catch (err) {
      console.error('重启摄像头失败:', err);
    }
  }, []);

  const handleReset = React.useCallback(() => {
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
    
    // 延迟重启摄像头，等待 Page5 的摄像头完全释放（避免摄像头资源冲突）
    setTimeout(() => {
      restartCamera();
    }, 300);
  }, [restartCamera]);

  return {
    videoRef: videoCallbackRef,
    canvasRef,
    state,
    isLoading,
    error,
    statusMessage,
    countdown,
    handleReset,
    stopCamera,
    frozenFrame: frozenFrameRef.current,
  };
}
