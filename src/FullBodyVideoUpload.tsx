import React from "react";
import cv from "@techstark/opencv-js";
import { loadFullBodyModels, detectFullBody } from "./fullBodyDetection";

export default function FullBodyVideoUpload(): React.JSX.Element {
  const [selectedVideo, setSelectedVideo] = React.useState<string | null>(null);
  const [isProcessing, setIsProcessing] = React.useState<boolean>(false);
  const [isPlaying, setIsPlaying] = React.useState<boolean>(false);
  const [fps, setFps] = React.useState<number>(0);
  const [modelLoaded, setModelLoaded] = React.useState<boolean>(false);
  const [detectedCount, setDetectedCount] = React.useState<number>(0);
  const [error, setError] = React.useState<string | null>(null);

  const videoRef = React.useRef<HTMLVideoElement>(null);
  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  const animationFrameRef = React.useRef<number | null>(null);
  const lastFrameTimeRef = React.useRef<number>(0);
  const frameCountRef = React.useRef<number>(0);
  const fpsTimeRef = React.useRef<number>(0);

  // 加载模型
  React.useEffect(() => {
    const loadModel = async () => {
      try {
        await loadFullBodyModels();
        setModelLoaded(true);
      } catch (err) {
        console.error("模型加载失败:", err);
        setError("模型加载失败，请刷新页面重试");
      }
    };

    loadModel();
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
      setDetectedCount(0);
    } else {
      alert("请选择视频文件（MP4, MOV, AVI 等）");
    }
  };

  const processVideoFrame = React.useCallback(async () => {
    if (
      !videoRef.current ||
      !canvasRef.current ||
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
      // 设置 canvas 尺寸匹配视频
      if (
        canvas.width !== video.videoWidth ||
        canvas.height !== video.videoHeight
      ) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
      }

      // 从视频读取当前帧
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      // 使用 OpenCV 检测全身
      const img = cv.imread(canvas);
      await detectFullBody(img);
      cv.imshow(canvas, img);

      // 计算检测到的人数（简单统计）
      // 注意：这是一个简化的计数，实际检测在 detectFullBody 中完成
      img.delete();

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

      // 控制帧率（避免过度消耗 CPU）
      const targetInterval = 1000 / 20; // 20 FPS (全身检测较慢)
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
      // 暂停
      videoRef.current.pause();
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      setIsPlaying(false);
      setIsProcessing(false);
    } else {
      // 播放
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
    setDetectedCount(0);
  };

  // 清理
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

  // 视频加载完成
  const handleVideoLoaded = (): void => {
    if (canvasRef.current && videoRef.current) {
      canvasRef.current.width = videoRef.current.videoWidth;
      canvasRef.current.height = videoRef.current.videoHeight;
    }
  };

  return (
    <div className="video-upload-container">
      <div className="upload-section">
        <label htmlFor="fullbody-video-upload" className="upload-button">
          {selectedVideo ? "🎬 选择其他视频" : "🎬 上传视频检测全身"}
          <input
            id="fullbody-video-upload"
            type="file"
            accept="video/*"
            capture="environment"
            onChange={handleVideoUpload}
            style={{ display: "none" }}
          />
        </label>

        {!modelLoaded && !error && (
          <p className="warning">⏳ 正在加载全身检测模型...</p>
        )}
        {error && <p className="error-message">❌ {error}</p>}
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

          <div className="fullbody-stats">
            <div className="stat-card">
              <div className="stat-icon">👥</div>
              <div className="stat-info">
                <h4>检测到的人数</h4>
                <p className="stat-value">{detectedCount}</p>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon">⚡</div>
              <div className="stat-info">
                <h4>处理速度</h4>
                <p className="stat-value">{fps} FPS</p>
              </div>
            </div>
          </div>

          <div className="video-info">
            <p>💡 提示：点击"播放检测"开始处理视频</p>
            <p>⚡ 全身检测速度较慢，推荐使用较短的视频</p>
            <p>🎯 绿色框标记检测到的人体</p>
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
            <li>点击"播放检测"开始逐帧全身检测</li>
            <li>检测结果会实时显示在右侧</li>
            <li>绿色框标记检测到的人体</li>
          </ul>
          <div className="tips">
            <h4>⚡ 性能提示</h4>
            <p>• 推荐使用较短的视频（30秒内）</p>
            <p>• 全身检测比人脸检测更耗资源</p>
            <p>• 分辨率建议 480p-720p</p>
            <p>• 人物完整在画面内效果最佳</p>
          </div>
          <div className="tips">
            <h4>🎬 最佳视频建议</h4>
            <p>• 人物清晰可见</p>
            <p>• 全身在画面内</p>
            <p>• 光线充足</p>
            <p>• 背景相对简单</p>
          </div>
        </div>
      )}
    </div>
  );
}
