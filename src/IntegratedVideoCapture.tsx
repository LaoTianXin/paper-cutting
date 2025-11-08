import React from "react";
import cv from "@techstark/opencv-js";
import {
  Hands,
  HAND_CONNECTIONS,
  type Results,
  type NormalizedLandmark,
} from "@mediapipe/hands";
import { drawConnectors, drawLandmarks } from "@mediapipe/drawing_utils";
import { loadFullBodyModels, getFullBodyCascade } from "./fullBodyDetection";
import type { CascadeClassifier } from "@techstark/opencv-js";

// 状态枚举
const CaptureState = {
  IDLE: "idle",
  VIDEO_LOADED: "video_loaded",
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

export default function IntegratedVideoCapture(): React.JSX.Element {
  const videoRef = React.useRef<HTMLVideoElement>(null);
  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  const capturedImageRef = React.useRef<HTMLCanvasElement>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const [state, setState] = React.useState<CaptureState>(CaptureState.IDLE);
  const [isLoading, setIsLoading] = React.useState<boolean>(true);
  const [error, setError] = React.useState<string | null>(null);
  const [statusMessage, setStatusMessage] = React.useState<string>("");
  const [countdown, setCountdown] = React.useState<number>(5);
  const [videoFile, setVideoFile] = React.useState<File | null>(null);
  const [isVideoPlaying, setIsVideoPlaying] = React.useState<boolean>(false);

  // 时间追踪
  const bodyDetectionStartTime = React.useRef<number | null>(null);
  const lastBodyDetectedTime = React.useRef<number | null>(null);
  const gestureDetectionStartTime = React.useRef<number | null>(null);

  // 全身检测相关
  const fullBodyCascadeRef = React.useRef<CascadeClassifier | null>(null);
  const lastBodyRectRef = React.useRef<BodyRect | null>(null);

  // MediaPipe Hands
  const handsRef = React.useRef<Hands | null>(null);
  const animationFrameRef = React.useRef<number | null>(null);
  const processingRef = React.useRef<boolean>(false);

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

  // 检测全身
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

  // 处理视频帧
  const processFrame = React.useCallback(async () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const hands = handsRef.current;

    if (!video || !canvas || !hands) {
      console.log("processFrame: 缺少必要元素", {
        video: !!video,
        canvas: !!canvas,
        hands: !!hands,
      });
      return;
    }

    if (video.ended) {
      console.log("processFrame: 视频已结束");
      return;
    }

    // 如果正在处理中，跳过此帧
    if (processingRef.current) {
      return;
    }

    // 如果视频暂停，尝试恢复播放
    if (video.paused) {
      console.log("processFrame: 视频暂停，尝试播放");
      try {
        await video.play();
      } catch (err) {
        console.warn("processFrame: 无法自动播放视频", err);
      }
      return;
    }

    processingRef.current = true;

    try {
      const ctx = canvas.getContext("2d", { willReadFrequently: true });
      if (!ctx) {
        processingRef.current = false;
        return;
      }

      // 绘制视频帧到canvas
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      const currentTime = Date.now();
      const currentState = stateRef.current;

      // 全身检测逻辑
      if (
        currentState === CaptureState.VIDEO_LOADED ||
        currentState === CaptureState.DETECTING_BODY ||
        currentState === CaptureState.BODY_DETECTED
      ) {
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const { count, rect, allRects } = detectFullBody(imageData);

        console.log(`检测结果: 检测到 ${count} 人`, rect ? "有矩形" : "无矩形");

        if (count >= 1 && rect) {
          // 检测到至少一人，选择最大的
          lastBodyDetectedTime.current = currentTime;
          lastBodyRectRef.current = rect;

          if (currentState === CaptureState.VIDEO_LOADED) {
            console.log("状态变更: VIDEO_LOADED -> DETECTING_BODY");
            setState(CaptureState.DETECTING_BODY);
            bodyDetectionStartTime.current = currentTime;
            setStatusMessage("正在检测全身...");
          } else if (currentState === CaptureState.DETECTING_BODY) {
            if (
              bodyDetectionStartTime.current &&
              currentTime - bodyDetectionStartTime.current >= 1000
            ) {
              setState(CaptureState.BODY_DETECTED);
              setStatusMessage("✓ 已识别到全身");
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

          // 绘制所有检测到的身体框
          allRects.forEach((r, index) => {
            const isLargest =
              r.x === rect.x &&
              r.y === rect.y &&
              r.width === rect.width &&
              r.height === rect.height;

            ctx.strokeStyle = isLargest ? "#00FF00" : "#FFFF00";
            ctx.lineWidth = isLargest ? 4 : 2;
            ctx.strokeRect(r.x, r.y, r.width, r.height);

            ctx.fillStyle = isLargest ? "#00FF00" : "#FFFF00";
            ctx.font = "bold 18px Arial";
            const label = isLargest ? `主目标 (${index + 1})` : `${index + 1}`;
            ctx.fillText(label, r.x, r.y - 10);
          });

          // 显示检测人数
          const text =
            count === 1 ? "检测到 1 人" : `检测到 ${count} 人（已选择最大者）`;
          ctx.fillStyle = "#00FF00";
          ctx.font = "bold 24px Arial";
          ctx.fillText(text, 10, 40);
        } else {
          if (
            currentState === CaptureState.DETECTING_BODY ||
            currentState === CaptureState.BODY_DETECTED
          ) {
            if (
              lastBodyDetectedTime.current &&
              currentTime - lastBodyDetectedTime.current >= 1000
            ) {
              setState(CaptureState.VIDEO_LOADED);
              bodyDetectionStartTime.current = null;
              lastBodyDetectedTime.current = null;
              setStatusMessage("❌ 未识别到全身，重新开始");
              setTimeout(() => setStatusMessage(""), 2000);
            }
          }
        }
      }

      // 手势检测逻辑
      if (
        currentState === CaptureState.DETECTING_GESTURE ||
        currentState === CaptureState.GESTURE_DETECTED
      ) {
        // 每2帧检测一次全身
        frameCountRef.current++;
        if (frameCountRef.current % 2 === 0) {
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
            setState(CaptureState.VIDEO_LOADED);
            bodyDetectionStartTime.current = null;
            lastBodyDetectedTime.current = null;
            gestureDetectionStartTime.current = null;
            frameCountRef.current = 0;
            setStatusMessage("❌ 全身丢失，重新开始");
            setTimeout(() => setStatusMessage(""), 2000);
            processingRef.current = false;
            return;
          }
        }

        // 发送到 MediaPipe Hands 进行手势识别
        await hands.send({ image: video });
      }

      // 倒计时逻辑
      if (currentState === CaptureState.COUNTDOWN) {
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

      // 绘制状态消息
      const currentStatusMessage = statusMessageRef.current;
      if (currentStatusMessage && currentState !== CaptureState.COUNTDOWN) {
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
    } catch (err) {
      console.error("Frame processing error:", err);
    } finally {
      processingRef.current = false;
    }
  }, [detectFullBody]);

  // MediaPipe 手势识别结果处理
  const onHandsResults = React.useCallback((results: Results) => {
    const canvas = canvasRef.current;
    const video = videoRef.current;
    if (!canvas || !video) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const currentTime = Date.now();
    const currentState = stateRef.current;

    // 绘制基础画面
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(results.image, 0, 0, canvas.width, canvas.height);

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

          // 暂停视频
          video.pause();
          setState(CaptureState.COMPLETED);
          setStatusMessage("✓ 拍照完成！");
        }
      }
    }
  }, [state]);

  // 视频帧循环
  React.useEffect(() => {
    if (
      state !== CaptureState.IDLE &&
      state !== CaptureState.COMPLETED &&
      videoRef.current
    ) {
      console.log("启动视频帧循环，当前状态:", state);

      const loop = () => {
        processFrame();
        animationFrameRef.current = requestAnimationFrame(loop);
      };
      loop();

      return () => {
        console.log("停止视频帧循环");
        if (animationFrameRef.current) {
          cancelAnimationFrame(animationFrameRef.current);
        }
      };
    } else {
      console.log("帧循环未启动，当前状态:", state);
    }
  }, [state, processFrame]);

  // 检查元素是否已挂载
  React.useEffect(() => {
    console.log("=== 检查页面元素 ===");
    console.log("videoRef:", videoRef.current);
    console.log("canvasRef:", canvasRef.current);
    console.log("capturedImageRef:", capturedImageRef.current);
  }, []);

  // 初始化
  React.useEffect(() => {
    console.log("=== 开始初始化组件 ===");
    let mounted = true;
    let hands: Hands | null = null;

    const initialize = async () => {
      try {
        console.log("1. 开始加载全身检测模型...");
        await loadFullBodyModels();
        console.log("✓ 全身检测模型加载完成");

        if (!mounted) {
          console.log("组件已卸载，停止初始化");
          return;
        }

        console.log("2. 获取全身检测分类器...");
        fullBodyCascadeRef.current = getFullBodyCascade();
        console.log("✓ 分类器获取成功");

        console.log("3. 初始化 MediaPipe Hands...");
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
        console.log("✓ MediaPipe Hands 初始化完成");

        setIsLoading(false);
        console.log("=== 初始化完成，可以上传视频了 ===");

        // 再次检查元素
        console.log(
          "最终检查 - videoRef:",
          !!videoRef.current,
          "canvasRef:",
          !!canvasRef.current
        );
      } catch (err) {
        console.error("❌ 初始化失败:", err);
        if (mounted) {
          setError("无法加载模型");
          setIsLoading(false);
        }
      }
    };

    initialize();

    return () => {
      console.log("=== 清理组件 ===");
      mounted = false;
      if (hands) {
        try {
          hands.close();
        } catch (err) {
          console.error("Hands cleanup error:", err);
        }
      }
      handsRef.current = null;
    };
  }, [onHandsResults]);

  // 处理视频上传
  const handleVideoUpload = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    console.log("=== 开始处理视频上传 ===");
    const file = event.target.files?.[0];
    if (!file) {
      console.log("未选择文件");
      return;
    }

    console.log("文件信息:", {
      name: file.name,
      type: file.type,
      size: file.size,
    });

    if (!file.type.startsWith("video/")) {
      setError("请上传视频文件");
      return;
    }

    setVideoFile(file);
    setError(null);
    setStatusMessage("正在加载视频...");

    const video = videoRef.current;
    const canvas = canvasRef.current;

    console.log("检查元素:", {
      video: !!video,
      canvas: !!canvas,
      hands: !!handsRef.current,
    });

    if (!video || !canvas) {
      console.error("❌ 视频或画布元素未找到");
      setError("页面元素未准备好，请刷新页面");
      return;
    }

    console.log("✓ 视频和画布元素已准备好");

    const url = URL.createObjectURL(file);
    console.log("创建视频URL:", url);
    video.src = url;

    video.onloadedmetadata = async () => {
      try {
        console.log(
          "✓ 视频元数据加载完成:",
          video.videoWidth,
          "x",
          video.videoHeight
        );

        // 设置 canvas 尺寸
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        console.log("✓ Canvas 尺寸已设置");

        // 添加播放事件监听
        video.onplay = () => {
          console.log("🎬 视频开始播放");
          setIsVideoPlaying(true);
        };

        video.onpause = () => {
          console.log("⏸️ 视频暂停");
          setIsVideoPlaying(false);
        };

        // 尝试播放视频
        console.log("尝试播放视频...");
        await video.play();
        console.log("✓ 视频播放成功");

        console.log("📝 设置状态为 VIDEO_LOADED");
        setState(CaptureState.VIDEO_LOADED);
        setStatusMessage("视频已加载，等待检测...");

        // 确保视频正在播放
        setTimeout(() => {
          if (video.paused) {
            console.warn("⚠️ 视频未播放，尝试手动播放");
            video.play().catch((e) => console.error("手动播放失败:", e));
          } else {
            console.log("✓ 视频正在播放，准备开始检测");
          }
        }, 100);
      } catch (err) {
        console.error("❌ 视频播放失败:", err);
        setError("视频播放失败，请点击下方播放按钮");
        setIsVideoPlaying(false);
      }
    };

    video.onerror = (e) => {
      console.error("❌ 视频加载错误:", e);
      setError("视频加载失败，请检查文件格式");
    };
  };

  const handleReset = () => {
    setState(CaptureState.IDLE);
    setStatusMessage("");
    setCountdown(5);
    setVideoFile(null);
    setIsVideoPlaying(false);
    bodyDetectionStartTime.current = null;
    lastBodyDetectedTime.current = null;
    gestureDetectionStartTime.current = null;
    lastBodyRectRef.current = null;
    frameCountRef.current = 0;

    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.src = "";
      videoRef.current.load();
    }

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

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
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
      <h2>🎬 智能视频拍照系统</h2>

      {isLoading && <div className="loading">⏳ 正在加载模型...</div>}

      {error && (
        <div className="error-message">
          <p>❌ {error}</p>
        </div>
      )}

      {state === CaptureState.IDLE && !isLoading && (
        <div className="upload-section">
          <input
            ref={fileInputRef}
            type="file"
            accept="video/*"
            onChange={handleVideoUpload}
            style={{ display: "none" }}
          />
          <button
            className="upload-btn"
            onClick={() => {
              console.log("=== 点击上传按钮 ===");
              console.log("fileInputRef:", fileInputRef.current);
              console.log("isLoading:", isLoading);
              console.log("state:", state);
              fileInputRef.current?.click();
            }}
            disabled={isLoading}
          >
            📂 上传视频
          </button>
          <p className="upload-hint">支持 MP4, MOV, AVI 等视频格式</p>
          <p className="upload-note">💡 提示：视频上传后会自动开始播放和检测</p>
        </div>
      )}

      {state === CaptureState.IDLE && isLoading && (
        <div className="upload-section">
          <p>⏳ 正在初始化，请稍候...</p>
        </div>
      )}

      {/* 视频和画布元素始终存在，但在 IDLE 时隐藏 */}
      <div
        className="capture-content"
        style={{ display: state === CaptureState.IDLE ? "none" : "block" }}
      >
        <div className="video-container">
          <video
            ref={videoRef}
            style={{ display: "none" }}
            playsInline
            muted
            loop
          />
          <canvas
            ref={canvasRef}
            className="capture-canvas"
            onClick={() => {
              const video = videoRef.current;
              if (video && video.paused) {
                video.play().catch((err) => {
                  console.error("手动播放失败:", err);
                });
              }
            }}
            style={{ cursor: "pointer" }}
          />
        </div>

        {state !== CaptureState.COMPLETED && videoFile && (
          <div className="video-controls">
            <button
              onClick={() => {
                const video = videoRef.current;
                if (video) {
                  if (video.paused) {
                    video.play().catch((err) => {
                      console.error("播放失败:", err);
                      setError("视频播放失败");
                    });
                  } else {
                    video.pause();
                  }
                }
              }}
              className="control-btn"
            >
              {isVideoPlaying ? "⏸️ 暂停" : "▶️ 播放"}
            </button>
            <button
              onClick={() => {
                const video = videoRef.current;
                if (video) {
                  video.currentTime = 0;
                  video.play().catch((err) => {
                    console.error("重播失败:", err);
                  });
                }
              }}
              className="control-btn"
            >
              🔄 重播
            </button>
          </div>
        )}

        {state === CaptureState.COMPLETED && (
          <div className="captured-image-container">
            <h3>📷 捕获的照片</h3>
            <canvas ref={capturedImageRef} className="captured-image" />
            <div className="capture-actions">
              <button onClick={handleDownload} className="download-btn">
                ⬇️ 下载照片
              </button>
              <button onClick={handleReset} className="reset-btn">
                🔄 重新上传
              </button>
            </div>
          </div>
        )}
      </div>

      {state !== CaptureState.IDLE && (
        <div className="status-panel">
          <h3>📊 状态信息</h3>
          <div className="status-item">
            <span className="status-label">视频文件：</span>
            <span className="status-value">{videoFile?.name || "无"}</span>
          </div>
          <div className="status-item">
            <span className="status-label">播放状态：</span>
            <span className="status-value">
              {isVideoPlaying ? "▶️ 播放中" : "⏸️ 已暂停"}
            </span>
          </div>
          <div className="status-item">
            <span className="status-label">当前阶段：</span>
            <span className={`status-value state-${state}`}>
              {state === CaptureState.VIDEO_LOADED && "视频已加载"}
              {state === CaptureState.DETECTING_BODY && "检测全身中"}
              {state === CaptureState.BODY_DETECTED && "已识别全身"}
              {state === CaptureState.DETECTING_GESTURE && "等待手势"}
              {state === CaptureState.GESTURE_DETECTED && "检测到OK手势"}
              {state === CaptureState.COUNTDOWN && "倒计时中"}
              {state === CaptureState.CAPTURE && "正在拍照"}
              {state === CaptureState.COMPLETED && "拍照完成"}
            </span>
          </div>
          {statusMessage && (
            <div className="status-item">
              <span className="status-label">提示：</span>
              <span className="status-value">{statusMessage}</span>
            </div>
          )}
        </div>
      )}

      {state !== CaptureState.IDLE && state !== CaptureState.COMPLETED && (
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
                state !== CaptureState.VIDEO_LOADED &&
                state !== CaptureState.DETECTING_BODY &&
                state !== CaptureState.BODY_DETECTED
                  ? "completed"
                  : ""
              }`}
            >
              <span className="step-number">1</span>
              <div className="step-content">
                <h4>全身识别</h4>
                <p>视频播放时自动检测全身，持续1秒</p>
                <p className="step-note">
                  💡 支持多人检测，系统会自动选择最大的目标
                </p>
              </div>
            </div>

            <div
              className={[
                "step",
                state === "detecting_gesture" || state === "gesture_detected"
                  ? "active"
                  : "",
                state === "countdown" || state === "capture" ? "completed" : "",
              ]
                .filter(Boolean)
                .join(" ")}
            >
              <span className="step-number">2</span>
              <div className="step-content">
                <h4>OK手势</h4>
                <p>视频中出现OK手势并保持3秒</p>
              </div>
            </div>

            <div
              className={[
                "step",
                state === "countdown" ? "active" : "",
                state === "capture" ? "completed" : "",
              ]
                .filter(Boolean)
                .join(" ")}
            >
              <span className="step-number">3</span>
              <div className="step-content">
                <h4>倒计时拍照</h4>
                <p>5秒倒计时后自动拍照</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {state !== CaptureState.IDLE && state !== CaptureState.COMPLETED && (
        <button onClick={handleReset} className="cancel-btn">
          ❌ 取消并重新开始
        </button>
      )}
    </div>
  );
}
