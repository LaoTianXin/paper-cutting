import React from "react";
import {
  Hands,
  HAND_CONNECTIONS,
  type Results,
  type NormalizedLandmark,
} from "@mediapipe/hands";
import {
  type Results as PoseResults,
  POSE_CONNECTIONS,
  type Pose,
} from "@mediapipe/pose";
import { Camera } from "@mediapipe/camera_utils";
import { drawConnectors, drawLandmarks } from "@mediapipe/drawing_utils";
import {
  initializePose,
  calculateBodyRect,
  type BodyRect,
} from "./poseDetection";

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

  const thumbIndexDist = calculateDistance(thumbTip, indexTip);
  const isCircleFormed = thumbIndexDist < 0.08;

  const middleExtended = middleTip.y < palmBase.y - 0.1;
  const ringExtended = ringTip.y < palmBase.y - 0.08;
  const pinkyExtended = pinkyTip.y < palmBase.y - 0.06;
  const indexBent = indexPip.y < indexTip.y;

  return (
    isCircleFormed &&
    middleExtended &&
    ringExtended &&
    pinkyExtended &&
    indexBent
  );
}

export default function IntegratedPhotoCaptureV2(): React.JSX.Element {
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

  // Pose 检测相关
  const poseRef = React.useRef<Pose | null>(null);
  const lastBodyRectRef = React.useRef<BodyRect | null>(null);
  const lastPoseLandmarksRef = React.useRef<
    PoseResults["poseLandmarks"] | null
  >(null);

  // MediaPipe Hands
  const handsRef = React.useRef<Hands | null>(null);
  const cameraRef = React.useRef<Camera | null>(null);

  // 性能优化：帧计数器
  const frameCountRef = React.useRef<number>(0);

  // 使用 ref 存储最新的状态
  const stateRef = React.useRef(state);
  const countdownRef = React.useRef(countdown);
  const statusMessageRef = React.useRef(statusMessage);

  // 同步 ref 值
  React.useEffect(() => {
    stateRef.current = state;
    countdownRef.current = countdown;
    statusMessageRef.current = statusMessage;
  }, [state, countdown, statusMessage]);

  // 处理 Pose 检测结果
  const onPoseResults = React.useCallback((results: PoseResults) => {
    const canvas = canvasRef.current;
    const video = videoRef.current;

    // 检查组件是否仍然挂载和有效（不检查 poseRef，因为它可能在严格模式下被重置）
    if (!canvas || !video) {
      return;
    }

    const currentTime = Date.now();
    const currentState = stateRef.current;

    const ctx = canvas.getContext("2d");
    if (!ctx) {
      return;
    }

    // 在全身检测阶段和手势识别阶段都处理 Pose 结果
    if (
      currentState === CaptureState.IDLE ||
      currentState === CaptureState.DETECTING_BODY ||
      currentState === CaptureState.BODY_DETECTED ||
      currentState === CaptureState.DETECTING_GESTURE ||
      currentState === CaptureState.GESTURE_DETECTED
    ) {
      // 始终先绘制视频帧（确保画面不黑屏）
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      if (results.poseLandmarks) {
        const rect = calculateBodyRect(
          results.poseLandmarks,
          canvas.width,
          canvas.height
        );

        if (rect) {
          // 更新全身检测数据（所有阶段都更新）
          lastBodyDetectedTime.current = currentTime;
          lastBodyRectRef.current = rect;
          lastPoseLandmarksRef.current = results.poseLandmarks;

          // 绘制骨骼（IDLE 和检测阶段都显示）
          if (
            currentState === CaptureState.IDLE ||
            currentState === CaptureState.DETECTING_BODY ||
            currentState === CaptureState.BODY_DETECTED
          ) {
            drawConnectors(ctx, results.poseLandmarks, POSE_CONNECTIONS, {
              color: "#00FF00",
              lineWidth: 2,
            });
            drawLandmarks(ctx, results.poseLandmarks, {
              color: "#FF0000",
              radius: 3,
            });

            // 绘制边界框
            ctx.strokeStyle = "#00FF00";
            ctx.lineWidth = 4;
            ctx.strokeRect(rect.x, rect.y, rect.width, rect.height);
            ctx.fillStyle = "#00FF00";
            ctx.font = "bold 24px Arial";
            ctx.fillText("全身已检测", rect.x, rect.y - 10);

            // 状态切换逻辑
            if (currentState === CaptureState.IDLE) {
              setState(CaptureState.DETECTING_BODY);
              bodyDetectionStartTime.current = currentTime;
              setStatusMessage("正在检测全身...");
            } else if (currentState === CaptureState.DETECTING_BODY) {
              if (
                bodyDetectionStartTime.current &&
                currentTime - bodyDetectionStartTime.current >= 1000
              ) {
                setState(CaptureState.DETECTING_GESTURE);
                setStatusMessage("✓ 已识别到全身，请做出OK手势");
              }
            }
          }
        }
      } else {
        // 未检测到全身，但仍显示视频（不黑屏）
        if (currentState === CaptureState.DETECTING_BODY) {
          if (
            lastBodyDetectedTime.current &&
            currentTime - lastBodyDetectedTime.current >= 1000
          ) {
            setState(CaptureState.IDLE);
            bodyDetectionStartTime.current = null;
            lastBodyDetectedTime.current = null;
            lastPoseLandmarksRef.current = null;
            setStatusMessage("❌ 未识别到全身，请重新站位");
            setTimeout(() => setStatusMessage(""), 1500);
          }
        }
      }

      // 绘制状态消息（Pose 检测阶段都显示）
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
  }, []);

  // MediaPipe Hands 手势识别结果处理
  const onHandsResults = React.useCallback((results: Results) => {
    const canvas = canvasRef.current;
    const video = videoRef.current;

    // 检查组件是否仍然挂载和有效（不检查 handsRef，因为它可能在严格模式下被重置）
    if (!canvas || !video) {
      return;
    }

    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return;

    const currentTime = Date.now();
    const currentState = stateRef.current;

    // 手势检测逻辑
    if (
      currentState === CaptureState.DETECTING_GESTURE ||
      currentState === CaptureState.GESTURE_DETECTED
    ) {
      // 继续监控全身位置（轻量级检测，每3帧一次）
      frameCountRef.current++;
      if (frameCountRef.current % 3 === 0 && poseRef.current && video) {
        // 检查 Pose 实例是否有效
        try {
          // 异步发送 Pose 检测，不阻塞手势识别
          poseRef.current.send({ image: video }).catch((err) => {
            // 忽略已删除实例的错误
            if (!err.message?.includes("deleted object")) {
              console.warn("Pose 检测错误:", err);
            }
          });
        } catch (err) {
          // 同步错误也要捕获
          console.warn("Pose send 同步错误:", err);
        }
      }

      // 检查全身是否丢失（1秒容忍时间）
      if (
        lastBodyDetectedTime.current &&
        currentTime - lastBodyDetectedTime.current >= 1000
      ) {
        // 全身丢失超过1秒，回到全身检测阶段
        console.log("⚠️ 全身丢失超过1秒，回到全身检测阶段");
        setState(CaptureState.IDLE);
        bodyDetectionStartTime.current = null;
        lastBodyDetectedTime.current = null;
        gestureDetectionStartTime.current = null;
        frameCountRef.current = 0;
        setStatusMessage("❌ 全身丢失，重新检测");
        setTimeout(() => setStatusMessage(""), 1500);
        return;
      }

      // 绘制基础画面
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(results.image, 0, 0, canvas.width, canvas.height);

      // 绘制全身框（显示当前监控的全身位置）
      if (lastBodyRectRef.current) {
        // 根据全身检测的新鲜度调整颜色
        const timeSinceDetection = lastBodyDetectedTime.current
          ? currentTime - lastBodyDetectedTime.current
          : 999999;

        if (timeSinceDetection < 500) {
          // 0.5秒内检测到，显示绿色
          ctx.strokeStyle = "rgba(0, 255, 0, 0.8)";
        } else if (timeSinceDetection < 1000) {
          // 0.5-1秒，显示黄色警告
          ctx.strokeStyle = "rgba(255, 255, 0, 0.8)";
        } else {
          // 即将丢失，显示红色
          ctx.strokeStyle = "rgba(255, 0, 0, 0.8)";
        }

        ctx.lineWidth = 3;
        ctx.strokeRect(
          lastBodyRectRef.current.x,
          lastBodyRectRef.current.y,
          lastBodyRectRef.current.width,
          lastBodyRectRef.current.height
        );

        // 显示全身检测状态
        ctx.fillStyle = ctx.strokeStyle;
        ctx.font = "bold 16px Arial";
        const statusText =
          timeSinceDetection < 500
            ? "全身✓"
            : timeSinceDetection < 1000
            ? "⚠️ 保持位置"
            : "❌ 即将丢失";
        ctx.fillText(
          statusText,
          lastBodyRectRef.current.x,
          lastBodyRectRef.current.y - 10
        );
      }

      let isOKDetected = false;

      // 绘制手部检测
      if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
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

      // 状态消息已经通过上面的半透明框显示了身体位置，不再重复绘制

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

    // 倒计时逻辑
    if (currentState === CaptureState.COUNTDOWN) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(results.image, 0, 0, canvas.width, canvas.height);

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
  }, []);

  // 倒计时效果
  React.useEffect(() => {
    if (state === CaptureState.COUNTDOWN) {
      if (countdown > 0) {
        const timer = setTimeout(() => {
          setCountdown(countdown - 1);
        }, 1000);
        return () => clearTimeout(timer);
      } else {
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
          const tempCanvas = document.createElement("canvas");
          tempCanvas.width = video.videoWidth;
          tempCanvas.height = video.videoHeight;
          const tempCtx = tempCanvas.getContext("2d");

          if (tempCtx) {
            tempCtx.drawImage(video, 0, 0, tempCanvas.width, tempCanvas.height);

            const canvas = canvasRef.current;
            if (canvas) {
              const scaleX = video.videoWidth / canvas.width;
              const scaleY = video.videoHeight / canvas.height;

              const rect = lastBodyRectRef.current;
              const padding = 20;

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

              capturedCanvas.width = width * 1.5;
              capturedCanvas.height = height * 1.5;

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
    let pose: Pose | null = null;

    const initialize = async () => {
      try {
        console.log("⏳ 同时初始化 MediaPipe Pose 和 Hands...");

        // 并行初始化 Pose 和 Hands，避免顺序加载导致延迟
        const [poseInstance, handsInstance] = await Promise.all([
          // 初始化 Pose
          (async () => {
            const p = await initializePose();
            console.log("✅ Pose 初始化完成");
            return p;
          })(),

          // 初始化 Hands
          (async () => {
            const h = new Hands({
              locateFile: (file) => {
                // 使用本地文件，避免 CDN 加载延迟
                return `/mediapipe/hands/${file}`;
              },
            });

            h.setOptions({
              maxNumHands: 2,
              modelComplexity: 1,
              minDetectionConfidence: 0.7,
              minTrackingConfidence: 0.5,
            });

            console.log("✅ Hands 初始化完成");
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

        if (!mounted || !videoRef.current || !canvasRef.current) {
          if (pose) pose.close();
          if (hands) hands.close();
          return;
        }

        // 关键修复：验证 refs 已正确设置
        console.log("🔍 验证 MediaPipe 实例:", {
          hasPoseRef: !!poseRef.current,
          hasHandsRef: !!handsRef.current,
          hasPose: !!pose,
          hasHands: !!hands,
        });

        if (!poseRef.current || !handsRef.current) {
          console.error("❌ MediaPipe 实例未正确设置，初始化失败");
          setError("初始化失败");
          setIsLoading(false);
          return;
        }

        console.log("🎥 启动摄像头...");
        console.log("📊 Video 元素状态:", {
          hasVideo: !!videoRef.current,
          videoWidth: videoRef.current?.videoWidth,
          videoHeight: videoRef.current?.videoHeight,
          readyState: videoRef.current?.readyState,
        });
        console.log("📊 Canvas 元素状态:", {
          hasCanvas: !!canvasRef.current,
          canvasWidth: canvasRef.current?.width,
          canvasHeight: canvasRef.current?.height,
        });

        // 启动摄像头（使用局部变量避免ref闭包问题）
        const poseForCamera = pose;
        const handsForCamera = hands;

        console.log("✅ 局部变量已设置:", {
          hasPoseForCamera: !!poseForCamera,
          hasHandsForCamera: !!handsForCamera,
        });

        camera = new Camera(videoRef.current, {
          onFrame: async () => {
            // 基础检查
            if (!mounted || !videoRef.current) return;

            const currentState = stateRef.current;

            try {
              // 根据状态选择处理器（IDLE也使用Pose，等待检测）
              if (
                currentState === CaptureState.IDLE ||
                currentState === CaptureState.DETECTING_BODY ||
                currentState === CaptureState.BODY_DETECTED
              ) {
                // 使用 Pose 检测全身（包括IDLE状态，显示摄像头画面）
                if (poseForCamera && mounted) {
                  await poseForCamera.send({ image: videoRef.current });
                }
              } else if (
                currentState === CaptureState.DETECTING_GESTURE ||
                currentState === CaptureState.GESTURE_DETECTED ||
                currentState === CaptureState.COUNTDOWN
              ) {
                // 同时使用 Pose 和 Hands（Pose 用于绘制画面 + 监控全身，Hands 用于手势识别）
                // 先发送到 Pose（确保画面持续更新）
                if (poseForCamera && mounted) {
                  await poseForCamera.send({ image: videoRef.current });
                }

                // 再发送到 Hands（手势识别）
                if (handsForCamera && mounted) {
                  await handsForCamera.send({ image: videoRef.current });
                }
              }
            } catch (err: unknown) {
              // 捕获已删除实例的错误，避免控制台报错
              const error = err as Error;
              if (!error.message?.includes("deleted object")) {
                console.warn("Frame processing error:", error);
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

        console.log("✅ 摄像头启动成功");
        console.log("🎉 所有组件初始化完成，准备就绪！");

        setIsLoading(false);
        setState(CaptureState.IDLE);
        setStatusMessage("站在摄像头前开始检测");
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
      console.log("🧹 开始清理组件...");
      mounted = false;

      // 先停止摄像头，避免继续发送帧
      if (camera) {
        try {
          camera.stop();
          console.log("✓ 摄像头已停止");
        } catch (err) {
          console.error("Camera cleanup error:", err);
        }
      }

      // 清空引用，防止后续调用
      cameraRef.current = null;

      // 稍微延迟关闭 MediaPipe 实例，确保没有正在进行的调用
      setTimeout(() => {
        if (hands) {
          try {
            hands.close();
            console.log("✓ Hands 已清理");
          } catch (err) {
            console.error("Hands cleanup error:", err);
          }
        }

        if (pose) {
          try {
            pose.close();
            console.log("✓ Pose 已清理");
          } catch (err) {
            console.error("Pose cleanup error:", err);
          }
        }

        handsRef.current = null;
        poseRef.current = null;
        console.log("✅ 组件清理完成");
      }, 100);
    };
  }, [onHandsResults, onPoseResults]);

  const handleReset = () => {
    console.log("🔄 重置状态");

    // 重置所有状态
    setState(CaptureState.IDLE);
    setStatusMessage("");
    setCountdown(5);
    bodyDetectionStartTime.current = null;
    lastBodyDetectedTime.current = null;
    gestureDetectionStartTime.current = null;
    lastBodyRectRef.current = null;
    lastPoseLandmarksRef.current = null;
    frameCountRef.current = 0;

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
            {state === CaptureState.DETECTING_BODY && "检测全身中（Pose）"}
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
              <h4>全身识别（MediaPipe Pose）</h4>
              <p>站在摄像头前，保持完整身体在画面中，持续1秒</p>
              <p className="step-note">✨ 使用AI骨骼检测，可看到33个关键点</p>
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
