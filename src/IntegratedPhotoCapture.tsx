import React from "react";
import cv from "@techstark/opencv-js";
import {
  Hands,
  HAND_CONNECTIONS,
  type Results,
  type NormalizedLandmark,
} from "@mediapipe/hands";
import { Camera } from "@mediapipe/camera_utils";
import { drawConnectors, drawLandmarks } from "@mediapipe/drawing_utils";
import { loadFullBodyModels, getFullBodyCascade } from "./fullBodyDetection";
import type { CascadeClassifier } from "@techstark/opencv-js";

// 状态枚举
const CaptureState = {
  IDLE: "idle",
  DETECTING_BODY: "detecting_body",
  BODY_DETECTED: "body_detected",
  DETECTING_GESTURE: "detecting_gesture",
  GESTURE_DETECTED: "gesture_detected",
  COUNTDOWN: "countdown",
  CAPTURE: "capture",
  COMPLETED: "completed",
} as const;

type CaptureState = (typeof CaptureState)[keyof typeof CaptureState];

interface BodyRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

// 计算两点之间的距离
function calculateDistance(
  point1: NormalizedLandmark,
  point2: NormalizedLandmark
): number {
  const dx = point1.x - point2.x;
  const dy = point1.y - point2.y;
  const dz = point1.z - point2.z;
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

// 识别OK手势
function recognizeOKGesture(landmarks: NormalizedLandmark[]): boolean {
  const thumbTip = landmarks[4];
  const indexTip = landmarks[8];
  const indexPip = landmarks[6];
  const middleTip = landmarks[12];
  const ringTip = landmarks[16];
  const pinkyTip = landmarks[20];
  const palmBase = landmarks[9];

  // 检查大拇指和食指是否形成圆圈
  const thumbIndexDist = calculateDistance(thumbTip, indexTip);
  const isCircleFormed = thumbIndexDist < 0.08;

  // 检查其他三根手指是否伸直
  const middleExtended = middleTip.y < palmBase.y - 0.1;
  const ringExtended = ringTip.y < palmBase.y - 0.08;
  const pinkyExtended = pinkyTip.y < palmBase.y - 0.06;

  // 确保食指是弯曲的
  const indexBent = indexPip.y < indexTip.y;

  return (
    isCircleFormed &&
    middleExtended &&
    ringExtended &&
    pinkyExtended &&
    indexBent
  );
}

export default function IntegratedPhotoCapture(): React.JSX.Element {
  const videoRef = React.useRef<HTMLVideoElement>(null);
  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  const capturedImageRef = React.useRef<HTMLCanvasElement>(null);

  const [state, setState] = React.useState<CaptureState>(CaptureState.IDLE);
  const [isLoading, setIsLoading] = React.useState<boolean>(true);
  const [error, setError] = React.useState<string | null>(null);
  const [statusMessage, setStatusMessage] = React.useState<string>("");
  const [countdown, setCountdown] = React.useState<number>(5);

  // 时间追踪
  const bodyDetectionStartTime = React.useRef<number | null>(null);
  const lastBodyDetectedTime = React.useRef<number | null>(null);
  const gestureDetectionStartTime = React.useRef<number | null>(null);

  // 全身检测相关
  const fullBodyCascadeRef = React.useRef<CascadeClassifier | null>(null);
  const lastBodyRectRef = React.useRef<BodyRect | null>(null);

  // MediaPipe Hands
  const handsRef = React.useRef<Hands | null>(null);
  const cameraRef = React.useRef<Camera | null>(null);

  // 性能优化：帧计数器
  const frameCountRef = React.useRef<number>(0);

  // 使用 ref 存储最新的状态，避免回调函数重新创建
  const stateRef = React.useRef(state);
  const countdownRef = React.useRef(countdown);
  const statusMessageRef = React.useRef(statusMessage);

  // 同步 ref 值
  React.useEffect(() => {
    stateRef.current = state;
    countdownRef.current = countdown;
    statusMessageRef.current = statusMessage;
  }, [state, countdown, statusMessage]);

  // 检测全身（支持多人，选择最大者）
  const detectFullBody = React.useCallback(
    (
      imageData: ImageData
    ): { count: number; rect: BodyRect | null; allRects: BodyRect[] } => {
      if (!fullBodyCascadeRef.current) {
        return { count: 0, rect: null, allRects: [] };
      }

      try {
        // 创建 Mat 从 ImageData
        const src = cv.matFromImageData(imageData);

        // 转换为灰度图
        const gray = new cv.Mat();
        cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY, 0);

        const bodies = new cv.RectVector();
        const msize = new cv.Size(0, 0);

        // 使用原始尺寸进行检测，提高准确度
        fullBodyCascadeRef.current.detectMultiScale(
          gray,
          bodies,
          1.1,
          5,
          0,
          new cv.Size(50, 100), // 原始尺寸的最小检测区域
          msize
        );

        const count = bodies.size();
        const allRects: BodyRect[] = [];
        let largestRect: BodyRect | null = null;
        let largestArea = 0;

        // 收集所有检测到的身体，找出面积最大的
        for (let i = 0; i < count; ++i) {
          const body = bodies.get(i);
          const rect = {
            x: body.x,
            y: body.y,
            width: body.width,
            height: body.height,
          };
          allRects.push(rect);

          const area = rect.width * rect.height;
          if (area > largestArea) {
            largestArea = area;
            largestRect = rect;
          }
        }

        gray.delete();
        src.delete();
        bodies.delete();

        return { count, rect: largestRect, allRects };
      } catch (err) {
        console.error("全身检测错误:", err);
        return { count: 0, rect: null, allRects: [] };
      }
    },
    []
  );

  // 绘制视频帧和提示信息（不依赖任何状态）
  const drawFrame = React.useCallback(
    (
      videoElement: HTMLVideoElement,
      canvas: HTMLCanvasElement,
      largestRect?: BodyRect | null,
      allRects?: BodyRect[],
      bodyCount?: number
    ) => {
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height);

      // 绘制所有检测到的身体框
      if (allRects && allRects.length > 0) {
        allRects.forEach((rect, index) => {
          const isLargest =
            largestRect &&
            rect.x === largestRect.x &&
            rect.y === largestRect.y &&
            rect.width === largestRect.width &&
            rect.height === largestRect.height;

          // 最大的用绿色粗框，其他用黄色细框
          ctx.strokeStyle = isLargest ? "#00FF00" : "#FFFF00";
          ctx.lineWidth = isLargest ? 4 : 2;
          ctx.strokeRect(rect.x, rect.y, rect.width, rect.height);

          // 添加标签
          ctx.fillStyle = isLargest ? "#00FF00" : "#FFFF00";
          ctx.font = "bold 18px Arial";
          const label = isLargest ? `主目标 (${index + 1})` : `${index + 1}`;
          ctx.fillText(label, rect.x, rect.y - 10);
        });
      }

      // 绘制人数提示
      if (bodyCount !== undefined && bodyCount > 0) {
        const text =
          bodyCount === 1
            ? "检测到 1 人"
            : `检测到 ${bodyCount} 人（已选择最大者）`;
        ctx.fillStyle = "#00FF00";
        ctx.font = "bold 24px Arial";
        ctx.fillText(text, 10, 40);
      }

      // 绘制状态消息（使用 ref）
      const currentStatusMessage = statusMessageRef.current;
      if (currentStatusMessage) {
        ctx.fillStyle = "#FFFFFF";
        ctx.strokeStyle = "#000000";
        ctx.lineWidth = 3;
        ctx.font = "bold 32px Arial";
        const textWidth = ctx.measureText(currentStatusMessage).width;
        const x = (canvas.width - textWidth) / 2;
        const y = canvas.height - 50;
        ctx.strokeText(currentStatusMessage, x, y);
        ctx.fillText(currentStatusMessage, x, y);
      }

      // 绘制倒计时（使用 ref）
      const currentState = stateRef.current;
      const currentCountdown = countdownRef.current;
      if (currentState === CaptureState.COUNTDOWN) {
        ctx.fillStyle = "#FFD700";
        ctx.strokeStyle = "#000000";
        ctx.lineWidth = 5;
        ctx.font = "bold 120px Arial";
        const text = currentCountdown.toString();
        const textWidth = ctx.measureText(text).width;
        const x = (canvas.width - textWidth) / 2;
        const y = canvas.height / 2;
        ctx.strokeText(text, x, y);
        ctx.fillText(text, x, y);
      }
    },
    [] // 不依赖任何状态
  );

  // MediaPipe 手势识别结果处理
  const onHandsResults = React.useCallback(
    (results: Results) => {
      const canvas = canvasRef.current;
      const video = videoRef.current;
      if (!canvas || !video) return;

      // 使用 willReadFrequently 优化性能
      const ctx = canvas.getContext("2d", { willReadFrequently: true });
      if (!ctx) return;

      // 先绘制图像
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(results.image, 0, 0, canvas.width, canvas.height);

      const currentTime = Date.now();
      const currentState = stateRef.current; // 使用 ref 获取最新状态

      // 全身检测逻辑
      if (
        currentState === CaptureState.IDLE ||
        currentState === CaptureState.DETECTING_BODY ||
        currentState === CaptureState.BODY_DETECTED
      ) {
        // 只在需要时获取 ImageData
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const { count, rect, allRects } = detectFullBody(imageData);

        if (count >= 1 && rect) {
          // 检测到至少一人，选择最大的
          lastBodyDetectedTime.current = currentTime;
          lastBodyRectRef.current = rect;

          if (currentState === CaptureState.IDLE) {
            // 开始检测全身
            setState(CaptureState.DETECTING_BODY);
            bodyDetectionStartTime.current = currentTime;
            setStatusMessage("正在检测全身...");
          } else if (currentState === CaptureState.DETECTING_BODY) {
            // 检查是否持续1秒
            if (
              bodyDetectionStartTime.current &&
              currentTime - bodyDetectionStartTime.current >= 1000
            ) {
              setState(CaptureState.BODY_DETECTED);
              setStatusMessage("✓ 已识别到全身");
              // 延迟进入手势识别模式
              setTimeout(() => {
                setState(CaptureState.DETECTING_GESTURE);
                setStatusMessage("请做出OK手势");
              }, 1500);
            } else {
              setStatusMessage("正在检测全身...");
            }
          } else if (currentState === CaptureState.BODY_DETECTED) {
            setStatusMessage("✓ 已识别到全身");
          }

          drawFrame(video, canvas, rect, allRects, count);
        } else {
          // 未检测到任何人
          if (
            currentState === CaptureState.DETECTING_BODY ||
            currentState === CaptureState.BODY_DETECTED
          ) {
            // 检查是否超过1秒未检测到
            if (
              lastBodyDetectedTime.current &&
              currentTime - lastBodyDetectedTime.current >= 1000
            ) {
              // 重新开始
              setState(CaptureState.IDLE);
              bodyDetectionStartTime.current = null;
              lastBodyDetectedTime.current = null;
              setStatusMessage("❌ 未识别到全身，重新开始");
              setTimeout(() => setStatusMessage(""), 2000);
            } else {
              setStatusMessage("正在检测全身...");
            }
          }

          drawFrame(video, canvas, null, allRects, count);
        }
      }

      // 手势检测逻辑
      if (
        currentState === CaptureState.DETECTING_GESTURE ||
        currentState === CaptureState.GESTURE_DETECTED
      ) {
        // 性能优化：降低全身检测频率，每帧检测一次
        frameCountRef.current++;
        if (frameCountRef.current % 1 === 0) {
          // 只在检测帧获取 ImageData
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const { count, rect } = detectFullBody(imageData);
          if (count >= 1 && rect) {
            // 检测到至少一人
            lastBodyDetectedTime.current = currentTime;
            lastBodyRectRef.current = rect;
          } else if (
            lastBodyDetectedTime.current &&
            currentTime - lastBodyDetectedTime.current >= 1000
          ) {
            // 全身丢失超过1秒，重新开始
            setState(CaptureState.IDLE);
            bodyDetectionStartTime.current = null;
            lastBodyDetectedTime.current = null;
            gestureDetectionStartTime.current = null;
            frameCountRef.current = 0;
            setStatusMessage("❌ 全身丢失，重新开始");
            setTimeout(() => setStatusMessage(""), 2000);
            return;
          }
        }

        // 绘制基础画面
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(results.image, 0, 0, canvas.width, canvas.height);

        let isOKDetected = false;

        // 绘制手部检测
        if (
          results.multiHandLandmarks &&
          results.multiHandLandmarks.length > 0
        ) {
          for (const landmarks of results.multiHandLandmarks) {
            drawConnectors(ctx, landmarks, HAND_CONNECTIONS, {
              color: "#00FF00",
              lineWidth: 3,
            });
            drawLandmarks(ctx, landmarks, {
              color: "#FF0000",
              lineWidth: 1,
              radius: 4,
            });

            if (recognizeOKGesture(landmarks)) {
              isOKDetected = true;

              // 绘制 OK 标识
              ctx.font = "bold 48px Arial";
              ctx.fillStyle = "#00FF00";
              ctx.strokeStyle = "#000000";
              ctx.lineWidth = 3;
              const text = "OK 👌";
              const textWidth = ctx.measureText(text).width;
              const x = (canvas.width - textWidth) / 2;
              const y = 80;
              ctx.strokeText(text, x, y);
              ctx.fillText(text, x, y);
            }
          }
        }

        // 手势状态管理
        if (isOKDetected) {
          if (currentState === CaptureState.DETECTING_GESTURE) {
            gestureDetectionStartTime.current = currentTime;
            setState(CaptureState.GESTURE_DETECTED);
          } else if (
            currentState === CaptureState.GESTURE_DETECTED &&
            gestureDetectionStartTime.current
          ) {
            const elapsed = currentTime - gestureDetectionStartTime.current;
            const remaining = Math.ceil((3000 - elapsed) / 1000);

            if (elapsed >= 3000) {
              // 进入倒计时阶段
              setState(CaptureState.COUNTDOWN);
              setCountdown(5);
              setStatusMessage("准备拍照！");
            } else {
              setStatusMessage(`保持OK手势 ${remaining}s`);
            }
          }
        } else {
          if (currentState === CaptureState.GESTURE_DETECTED) {
            // 手势中断，重新检测
            setState(CaptureState.DETECTING_GESTURE);
            gestureDetectionStartTime.current = null;
            setStatusMessage("请做出OK手势");
          } else {
            setStatusMessage("请做出OK手势");
          }
        }

        // 绘制全身框和状态消息
        if (lastBodyRectRef.current) {
          ctx.strokeStyle = "#00FF00";
          ctx.lineWidth = 2;
          ctx.strokeRect(
            lastBodyRectRef.current.x,
            lastBodyRectRef.current.y,
            lastBodyRectRef.current.width,
            lastBodyRectRef.current.height
          );
        }

        const currentStatusMessage = statusMessageRef.current;
        if (currentStatusMessage) {
          ctx.fillStyle = "#FFFFFF";
          ctx.strokeStyle = "#000000";
          ctx.lineWidth = 3;
          ctx.font = "bold 32px Arial";
          const textWidth = ctx.measureText(currentStatusMessage).width;
          const x = (canvas.width - textWidth) / 2;
          const y = canvas.height - 50;
          ctx.strokeText(currentStatusMessage, x, y);
          ctx.fillText(currentStatusMessage, x, y);
        }
      }

      // 倒计时逻辑（不再进行检测，直接绘制）
      if (currentState === CaptureState.COUNTDOWN) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(results.image, 0, 0, canvas.width, canvas.height);

        // 绘制全身框
        if (lastBodyRectRef.current) {
          ctx.strokeStyle = "#00FF00";
          ctx.lineWidth = 2;
          ctx.strokeRect(
            lastBodyRectRef.current.x,
            lastBodyRectRef.current.y,
            lastBodyRectRef.current.width,
            lastBodyRectRef.current.height
          );
        }

        // 绘制倒计时数字
        ctx.fillStyle = "#FFD700";
        ctx.strokeStyle = "#000000";
        ctx.lineWidth = 5;
        ctx.font = "bold 120px Arial";
        const text = countdownRef.current.toString();
        const textWidth = ctx.measureText(text).width;
        const x = (canvas.width - textWidth) / 2;
        const y = canvas.height / 2;
        ctx.strokeText(text, x, y);
        ctx.fillText(text, x, y);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [] // 完全不依赖任何东西，确保只创建一次，避免 MediaPipe Hands 重复初始化
  );

  // 倒计时效果
  React.useEffect(() => {
    if (state === CaptureState.COUNTDOWN) {
      if (countdown > 0) {
        const timer = setTimeout(() => {
          setCountdown(countdown - 1);
        }, 1000);
        return () => clearTimeout(timer);
      } else {
        // 倒计时结束，拍照
        setState(CaptureState.CAPTURE);
      }
    }
  }, [state, countdown]);

  // 拍照处理
  React.useEffect(() => {
    if (state === CaptureState.CAPTURE) {
      const video = videoRef.current;
      const capturedCanvas = capturedImageRef.current;

      if (video && capturedCanvas && lastBodyRectRef.current) {
        const capturedCtx = capturedCanvas.getContext("2d");

        if (capturedCtx) {
          // 创建临时画布用于从video获取完整画面（无任何UI元素）
          const tempCanvas = document.createElement("canvas");
          tempCanvas.width = video.videoWidth;
          tempCanvas.height = video.videoHeight;
          const tempCtx = tempCanvas.getContext("2d");

          if (tempCtx) {
            // 从video元素直接绘制原始画面（绝对干净，无UI）
            tempCtx.drawImage(video, 0, 0, tempCanvas.width, tempCanvas.height);

            // 计算全身区域（需要根据canvas分辨率转换到video分辨率）
            const canvas = canvasRef.current;
            if (canvas) {
              const scaleX = video.videoWidth / canvas.width;
              const scaleY = video.videoHeight / canvas.height;

              const rect = lastBodyRectRef.current;
              const padding = 20;

              // 转换坐标到video分辨率
              const x = Math.max(0, (rect.x - padding) * scaleX);
              const y = Math.max(0, (rect.y - padding) * scaleY);
              const width = Math.min(
                video.videoWidth - x,
                (rect.width + padding * 2) * scaleX
              );
              const height = Math.min(
                video.videoHeight - y,
                (rect.height + padding * 2) * scaleY
              );

              // 设置捕获画布大小
              capturedCanvas.width = width * 1.5;
              capturedCanvas.height = height * 1.5;

              // 截取并放大绘制
              capturedCtx.drawImage(
                tempCanvas,
                x,
                y,
                width,
                height,
                0,
                0,
                capturedCanvas.width,
                capturedCanvas.height
              );
            }
          }

          setState(CaptureState.COMPLETED);
          setStatusMessage("✓ 拍照完成！");
        }
      }
    }
  }, [state]);

  // 初始化
  React.useEffect(() => {
    let mounted = true;
    let camera: Camera | null = null;
    let hands: Hands | null = null;

    const initialize = async () => {
      try {
        // 加载全身检测模型（带缓存，只加载一次）
        await loadFullBodyModels();

        if (!mounted) return;

        // 获取已加载的分类器实例（不再重复创建）
        fullBodyCascadeRef.current = getFullBodyCascade();

        // 初始化 MediaPipe Hands
        if (!videoRef.current || !canvasRef.current || !mounted) return;

        hands = new Hands({
          locateFile: (file) => {
            return `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`;
          },
        });

        hands.setOptions({
          maxNumHands: 2,
          modelComplexity: 1,
          minDetectionConfidence: 0.7,
          minTrackingConfidence: 0.5,
        });

        hands.onResults(onHandsResults);
        handsRef.current = hands;

        if (!mounted) {
          hands.close();
          return;
        }

        camera = new Camera(videoRef.current, {
          onFrame: async () => {
            if (mounted && videoRef.current && handsRef.current) {
              try {
                await handsRef.current.send({ image: videoRef.current });
              } catch (err) {
                // 忽略组件卸载时的错误
                if (mounted) {
                  console.error("Frame processing error:", err);
                }
              }
            }
          },
          width: 640,
          height: 480,
        });

        await camera.start();
        cameraRef.current = camera;

        if (!mounted) {
          camera.stop();
          return;
        }

        setIsLoading(false);
        setState(CaptureState.IDLE);
        setStatusMessage("");
      } catch (err) {
        console.error("初始化失败:", err);
        if (mounted) {
          setError("无法启动摄像头或加载模型");
          setIsLoading(false);
        }
      }
    };

    initialize();

    return () => {
      mounted = false;

      // 清理 camera
      if (camera) {
        try {
          camera.stop();
        } catch (err) {
          console.error("Camera cleanup error:", err);
        }
      }

      // 清理 hands
      if (hands) {
        try {
          hands.close();
        } catch (err) {
          console.error("Hands cleanup error:", err);
        }
      }

      // 清理 refs
      cameraRef.current = null;
      handsRef.current = null;
    };
  }, [onHandsResults]);

  const handleReset = () => {
    setState(CaptureState.IDLE);
    setStatusMessage("");
    setCountdown(5);
    bodyDetectionStartTime.current = null;
    lastBodyDetectedTime.current = null;
    gestureDetectionStartTime.current = null;
    lastBodyRectRef.current = null;
    frameCountRef.current = 0; // 重置帧计数器

    // 清空捕获的图像
    if (capturedImageRef.current) {
      const ctx = capturedImageRef.current.getContext("2d");
      if (ctx) {
        ctx.clearRect(
          0,
          0,
          capturedImageRef.current.width,
          capturedImageRef.current.height
        );
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
      <h2>📸 智能拍照系统</h2>

      {isLoading && <div className="loading">⏳ 正在加载模型...</div>}

      {error && (
        <div className="error-message">
          <p>❌ {error}</p>
        </div>
      )}

      <div className="capture-content">
        <div className="video-container">
          <video ref={videoRef} style={{ display: "none" }} playsInline muted />
          <canvas
            ref={canvasRef}
            width={640}
            height={480}
            className="capture-canvas"
          />
        </div>

        <div
          className="captured-image-container"
          style={{
            display: state === CaptureState.COMPLETED ? "block" : "none",
          }}
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
      </div>

      <div className="status-panel">
        <h3>📊 状态信息</h3>
        <div className="status-item">
          <span className="status-label">当前阶段：</span>
          <span className={`status-value state-${state}`}>
            {state === CaptureState.IDLE && "等待开始"}
            {state === CaptureState.DETECTING_BODY && "检测全身中"}
            {state === CaptureState.BODY_DETECTED && "已识别全身"}
            {state === CaptureState.DETECTING_GESTURE && "等待手势"}
            {state === CaptureState.GESTURE_DETECTED && "检测到OK手势"}
            {state === CaptureState.COUNTDOWN && "倒计时中"}
            {state === CaptureState.CAPTURE && "正在拍照"}
            {state === CaptureState.COMPLETED && "拍照完成"}
          </span>
        </div>
      </div>

      <div className="instructions">
        <h3>📝 使用流程</h3>
        <div className="instruction-steps">
          <div
            className={`step ${
              state === CaptureState.DETECTING_BODY ||
              state === CaptureState.BODY_DETECTED
                ? "active"
                : ""
            } ${
              state !== CaptureState.IDLE &&
              state !== CaptureState.DETECTING_BODY &&
              state !== CaptureState.BODY_DETECTED
                ? "completed"
                : ""
            }`}
          >
            <span className="step-number">1</span>
            <div className="step-content">
              <h4>全身识别</h4>
              <p>站在摄像头前，保持完整身体在画面中，持续1秒</p>
              <p className="step-note">
                💡 支持多人检测，系统会自动选择最大的目标
              </p>
            </div>
          </div>

          <div
            className={`step ${
              state === CaptureState.DETECTING_GESTURE ||
              state === CaptureState.GESTURE_DETECTED
                ? "active"
                : ""
            } ${
              state !== CaptureState.IDLE &&
              state !== CaptureState.DETECTING_BODY &&
              state !== CaptureState.BODY_DETECTED &&
              state !== CaptureState.DETECTING_GESTURE &&
              state !== CaptureState.GESTURE_DETECTED
                ? "completed"
                : ""
            }`}
          >
            <span className="step-number">2</span>
            <div className="step-content">
              <h4>OK手势</h4>
              <p>做出OK手势（大拇指和食指形成圆圈，其他手指伸直）</p>
              <p className="step-note">⚠️ 需要保持3秒</p>
            </div>
          </div>

          <div
            className={`step ${
              state === CaptureState.COUNTDOWN ? "active" : ""
            } ${
              state === CaptureState.CAPTURE || state === CaptureState.COMPLETED
                ? "completed"
                : ""
            }`}
          >
            <span className="step-number">3</span>
            <div className="step-content">
              <h4>倒计时拍照</h4>
              <p>5秒倒计时后自动拍照</p>
              <p className="step-note">💡 保持姿势和位置</p>
            </div>
          </div>

          <div
            className={`step ${
              state === CaptureState.COMPLETED ? "active completed" : ""
            }`}
          >
            <span className="step-number">4</span>
            <div className="step-content">
              <h4>完成</h4>
              <p>查看和下载照片</p>
            </div>
          </div>
        </div>
      </div>

      {state !== CaptureState.IDLE && state !== CaptureState.COMPLETED && (
        <button onClick={handleReset} className="cancel-btn">
          ❌ 取消并重新开始
        </button>
      )}
    </div>
  );
}
