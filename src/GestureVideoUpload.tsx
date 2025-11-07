import React from "react";
import {
  Hands,
  HAND_CONNECTIONS,
  type Results,
  type NormalizedLandmark,
} from "@mediapipe/hands";
import { drawConnectors, drawLandmarks } from "@mediapipe/drawing_utils";

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
function recognizeOKGesture(landmarks: NormalizedLandmark[]): {
  isOK: boolean;
  confidence: number;
} {
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

  let confidenceScore = 0;
  if (isCircleFormed) confidenceScore += 40;
  if (middleExtended) confidenceScore += 20;
  if (ringExtended) confidenceScore += 20;
  if (pinkyExtended) confidenceScore += 15;
  if (indexBent) confidenceScore += 5;

  const isOK = confidenceScore >= 80 && isCircleFormed;

  return {
    isOK,
    confidence: confidenceScore,
  };
}

export default function GestureVideoUpload(): React.JSX.Element {
  const [selectedVideo, setSelectedVideo] = React.useState<string | null>(null);
  const [isProcessing, setIsProcessing] = React.useState<boolean>(false);
  const [isPlaying, setIsPlaying] = React.useState<boolean>(false);
  const [fps, setFps] = React.useState<number>(0);
  const [gesture, setGesture] = React.useState<string>("无");
  const [confidence, setConfidence] = React.useState<number>(0);
  const [modelLoaded, setModelLoaded] = React.useState<boolean>(false);

  const videoRef = React.useRef<HTMLVideoElement>(null);
  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  const animationFrameRef = React.useRef<number | null>(null);
  const handsRef = React.useRef<Hands | null>(null);
  const lastFrameTimeRef = React.useRef<number>(0);
  const frameCountRef = React.useRef<number>(0);
  const fpsTimeRef = React.useRef<number>(0);

  // 初始化 MediaPipe Hands
  React.useEffect(() => {
    const initializeHands = async () => {
      try {
        const hands = new Hands({
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

        hands.onResults(onResults);
        handsRef.current = hands;
        setModelLoaded(true);
      } catch (error) {
        console.error("初始化手势识别模型失败:", error);
      }
    };

    initializeHands();

    return () => {
      if (handsRef.current) {
        handsRef.current.close();
      }
    };
  }, []);

  const handleVideoUpload = (
    event: React.ChangeEvent<HTMLInputElement>
  ): void => {
    const file = event.target.files?.[0];
    if (file && file.type.startsWith("video/")) {
      const videoUrl = URL.createObjectURL(file);
      setSelectedVideo(videoUrl);
      setIsPlaying(false);
      setIsProcessing(false);
      setGesture("无");
      setConfidence(0);
    } else {
      alert("请选择视频文件（MP4, MOV, AVI 等）");
    }
  };

  const onResults = React.useCallback((results: Results) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.save();
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(results.image, 0, 0, canvas.width, canvas.height);

    if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
      for (const landmarks of results.multiHandLandmarks) {
        // 绘制手部连接线
        drawConnectors(ctx, landmarks, HAND_CONNECTIONS, {
          color: "#00FF00",
          lineWidth: 3,
        });

        // 绘制手部关键点
        drawLandmarks(ctx, landmarks, {
          color: "#FF0000",
          lineWidth: 1,
          radius: 4,
        });

        // 识别OK手势
        const result = recognizeOKGesture(landmarks);

        if (result.isOK) {
          setGesture("OK 👌");
          setConfidence(result.confidence);

          // 在画布上显示提示
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

          // 高亮显示大拇指和食指
          const thumbTip = landmarks[4];
          const indexTip = landmarks[8];
          ctx.beginPath();
          ctx.arc(
            thumbTip.x * canvas.width,
            thumbTip.y * canvas.height,
            15,
            0,
            2 * Math.PI
          );
          ctx.strokeStyle = "#FFFF00";
          ctx.lineWidth = 3;
          ctx.stroke();

          ctx.beginPath();
          ctx.arc(
            indexTip.x * canvas.width,
            indexTip.y * canvas.height,
            15,
            0,
            2 * Math.PI
          );
          ctx.stroke();
        } else {
          setGesture("无");
          setConfidence(result.confidence);
        }
      }
    } else {
      setGesture("无");
      setConfidence(0);
    }

    ctx.restore();
  }, []);

  const processVideoFrame = React.useCallback(async () => {
    if (
      !videoRef.current ||
      !canvasRef.current ||
      !handsRef.current ||
      !modelLoaded ||
      videoRef.current.paused ||
      videoRef.current.ended
    ) {
      setIsPlaying(false);
      setIsProcessing(false);
      return;
    }

    const video = videoRef.current;
    const canvas = canvasRef.current;

    try {
      // 设置 canvas 尺寸
      if (
        canvas.width !== video.videoWidth ||
        canvas.height !== video.videoHeight
      ) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
      }

      // 发送当前帧到 MediaPipe
      await handsRef.current.send({ image: video });

      // 计算 FPS
      const now = performance.now();
      frameCountRef.current++;
      if (now - fpsTimeRef.current >= 1000) {
        setFps(
          Math.round(
            (frameCountRef.current * 1000) / (now - fpsTimeRef.current)
          )
        );
        frameCountRef.current = 0;
        fpsTimeRef.current = now;
      }

      // 控制帧率
      const targetInterval = 1000 / 30;
      const elapsed = now - lastFrameTimeRef.current;
      const delay = Math.max(0, targetInterval - elapsed);

      setTimeout(() => {
        lastFrameTimeRef.current = performance.now();
        animationFrameRef.current = requestAnimationFrame(processVideoFrame);
      }, delay);
    } catch (error) {
      console.error("处理视频帧错误:", error);
    }
  }, [modelLoaded]);

  const handlePlayPause = (): void => {
    if (!videoRef.current || !modelLoaded) return;

    if (isPlaying) {
      videoRef.current.pause();
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      setIsPlaying(false);
      setIsProcessing(false);
    } else {
      videoRef.current.play();
      setIsPlaying(true);
      setIsProcessing(true);
      frameCountRef.current = 0;
      fpsTimeRef.current = performance.now();
      lastFrameTimeRef.current = performance.now();
      processVideoFrame();
    }
  };

  const handleRestart = (): void => {
    if (!videoRef.current) return;
    videoRef.current.currentTime = 0;
    if (isPlaying) {
      videoRef.current.pause();
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      setIsPlaying(false);
      setIsProcessing(false);
    }
    setGesture("无");
    setConfidence(0);
  };

  React.useEffect(() => {
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (selectedVideo) {
        URL.revokeObjectURL(selectedVideo);
      }
    };
  }, [selectedVideo]);

  const handleVideoLoaded = (): void => {
    if (canvasRef.current && videoRef.current) {
      canvasRef.current.width = videoRef.current.videoWidth;
      canvasRef.current.height = videoRef.current.videoHeight;
    }
  };

  return (
    <div className="video-upload-container">
      <div className="upload-section">
        <label htmlFor="gesture-video-upload" className="upload-button">
          {selectedVideo ? "🎬 选择其他视频" : "🎬 上传视频测试手势"}
          <input
            id="gesture-video-upload"
            type="file"
            accept="video/*"
            capture="environment"
            onChange={handleVideoUpload}
            style={{ display: "none" }}
          />
        </label>

        {!modelLoaded && <p className="warning">⏳ 等待模型加载中...</p>}
      </div>

      {selectedVideo && (
        <div className="video-display">
          <div className="video-controls">
            <button
              onClick={handlePlayPause}
              disabled={!modelLoaded}
              className="control-button primary"
            >
              {isPlaying ? "⏸️ 暂停" : "▶️ 播放检测"}
            </button>
            <button onClick={handleRestart} className="control-button">
              🔄 重新开始
            </button>
            <div className="fps-display">
              {isProcessing && <span>🎯 FPS: {fps}</span>}
            </div>
          </div>

          <div className="video-content">
            <div className="video-container">
              <h3>原始视频</h3>
              <video
                ref={videoRef}
                src={selectedVideo}
                className="uploaded-video"
                onLoadedMetadata={handleVideoLoaded}
                loop
              />
            </div>

            <div className="canvas-container">
              <h3>{isProcessing ? "实时检测中... 🔍" : "检测结果 ✨"}</h3>
              <canvas ref={canvasRef} className="result-canvas" />
            </div>
          </div>

          <div className="gesture-info">
            <div className="gesture-display">
              <h3>当前手势</h3>
              <div
                className={`gesture-result ${gesture === "OK 👌" ? "ok" : ""}`}
              >
                {gesture}
              </div>
            </div>

            <div className="confidence-display">
              <h3>置信度</h3>
              <div className="confidence-bar">
                <div
                  className="confidence-fill"
                  style={{ width: `${confidence}%` }}
                />
              </div>
              <span className="confidence-text">{confidence}%</span>
            </div>
          </div>

          <div className="video-info">
            <p>💡 提示：点击"播放检测"开始处理视频</p>
            <p>⚡ 检测速度取决于视频分辨率和设备性能</p>
            {isProcessing && (
              <p className="processing-status">
                ✨ 正在以 {fps} FPS 的速度处理视频帧
              </p>
            )}
          </div>
        </div>
      )}

      {!selectedVideo && (
        <div className="instructions">
          <h3>📝 使用说明</h3>
          <ul>
            <li>点击上方按钮选择视频文件或录制视频</li>
            <li>支持 MP4、MOV、AVI、WebM 等常见格式</li>
            <li>点击"播放检测"开始逐帧手势识别</li>
            <li>视频中出现 OK 手势时会自动识别</li>
            <li>较大的视频文件可能处理较慢</li>
          </ul>
          <div className="tips">
            <h4>⚡ 性能提示</h4>
            <p>• 推荐使用较短的视频（30秒内）</p>
            <p>• 分辨率越高，处理速度越慢</p>
            <p>• 确保视频中手势清晰可见</p>
            <p>• 光线充足的视频识别效果更好</p>
          </div>
        </div>
      )}
    </div>
  );
}
