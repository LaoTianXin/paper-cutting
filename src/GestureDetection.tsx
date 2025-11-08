import React from "react";

import { drawConnectors, drawLandmarks } from "@mediapipe/drawing_utils";

import {
  Hands,
  HAND_CONNECTIONS,
  type Results,
  type NormalizedLandmark,
} from "@mediapipe/hands";
import { Camera } from "@mediapipe/camera_utils";
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

// 识别OK手势（优化版：使用动态阈值，提高识别准确性）
function recognizeOKGesture(landmarks: NormalizedLandmark[]): {
  isOK: boolean;
  confidence: number;
} {
  // 手部关键点索引：
  // 0: 手腕
  // 4: 大拇指尖
  // 8: 食指尖
  // 12: 中指尖
  // 16: 无名指尖
  // 20: 小指尖

  const wrist = landmarks[0]; // 手腕
  const thumbTip = landmarks[4]; // 大拇指尖
  const indexTip = landmarks[8]; // 食指尖
  const indexPip = landmarks[6]; // 食指第二关节
  const indexMcp = landmarks[5]; // 食指掌指关节
  const middleTip = landmarks[12]; // 中指尖
  const middleMcp = landmarks[9]; // 中指掌指关节（手掌中心）
  const ringTip = landmarks[16]; // 无名指尖
  const pinkyTip = landmarks[20]; // 小指尖
  const palmBase = landmarks[9]; // 手掌中心

  // 🔍 计算手的实际大小（手腕到中指掌指关节的距离）作为参考
  const handSize = calculateDistance(wrist, middleMcp);

  // 1. 检查大拇指和食指是否形成圆圈（使用动态阈值）
  const thumbIndexDist = calculateDistance(thumbTip, indexTip);
  // 动态阈值：允许圆圈直径为手掌大小的 15%（原来是固定0.08）
  const circleThreshold = Math.max(handSize * 0.15, 0.06); // 最小阈值0.06
  const isCircleFormed = thumbIndexDist < circleThreshold;

  // 圆圈质量评分（越小越好，满分40）
  const circleQuality = isCircleFormed
    ? Math.max(0, 40 - (thumbIndexDist / circleThreshold) * 10)
    : 0;

  // 2. 检查其他三根手指是否伸直（使用相对位置）
  // 改进：使用相对于手掌基准的距离，考虑手的大小
  const fingerExtendThreshold = handSize * 0.4; // 动态阈值

  const middleExtendDist = Math.abs(middleTip.y - palmBase.y);
  const ringExtendDist = Math.abs(ringTip.y - palmBase.y);
  const pinkyExtendDist = Math.abs(pinkyTip.y - palmBase.y);

  // 手指伸直判断（y坐标小于手掌基准）
  const middleExtended =
    middleTip.y < palmBase.y && middleExtendDist > fingerExtendThreshold * 0.5;
  const ringExtended =
    ringTip.y < palmBase.y && ringExtendDist > fingerExtendThreshold * 0.4;
  const pinkyExtended =
    pinkyTip.y < palmBase.y && pinkyExtendDist > fingerExtendThreshold * 0.3;

  // 3. 确保食指是弯曲的（形成圆圈的一部分）
  // 改进：检查食指弯曲角度（更宽松）
  const indexBent = indexPip.y < indexTip.y || indexMcp.y < indexTip.y;

  // 4. 额外检查：确保大拇指和食指在合理的位置（圆圈中心应该在手掌前方）
  const circleCenter = {
    x: (thumbTip.x + indexTip.x) / 2,
    y: (thumbTip.y + indexTip.y) / 2,
  };
  const circleCenterReasonable = circleCenter.y < palmBase.y + handSize * 0.3;

  // 计算置信度（优化评分权重）
  let confidenceScore = 0;

  // 圆圈形成是核心特征（40分，质量评分）
  confidenceScore += circleQuality;

  // 手指伸直（每个20分，但只要有2根伸直就算合格）
  const extendedFingers = [middleExtended, ringExtended, pinkyExtended];
  const extendedCount = extendedFingers.filter(Boolean).length;

  if (middleExtended) confidenceScore += 20;
  if (ringExtended) confidenceScore += 20;
  if (pinkyExtended) confidenceScore += 15;

  // 食指弯曲（5分）
  if (indexBent) confidenceScore += 5;

  // 圆圈位置合理（额外5分奖励）
  if (circleCenterReasonable) confidenceScore += 5;

  // 判断是否为OK手势（优化判断逻辑）
  // 条件1：置信度 >= 70分（降低要求）
  // 条件2：必须形成圆圈
  // 条件3：至少2根手指伸直
  const isOK = confidenceScore >= 70 && isCircleFormed && extendedCount >= 2;

  return {
    isOK,
    confidence: Math.min(100, Math.round(confidenceScore)),
  };
}

interface GestureDetectionProps {
  onGestureDetected?: (gesture: string) => void;
}

export default function GestureDetection({
  onGestureDetected,
}: GestureDetectionProps): React.JSX.Element {
  const videoRef = React.useRef<HTMLVideoElement>(null);
  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  const [isLoading, setIsLoading] = React.useState<boolean>(true);
  const [gesture, setGesture] = React.useState<string>("无");
  const [confidence, setConfidence] = React.useState<number>(0);
  const [error, setError] = React.useState<string | null>(null);

  // 处理检测结果
  const onResults = React.useCallback(
    (results: Results) => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      // 清空画布
      ctx.save();
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // 绘制视频帧
      ctx.drawImage(results.image, 0, 0, canvas.width, canvas.height);

      // 如果检测到手
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
            onGestureDetected?.("OK");

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
    },
    [onGestureDetected]
  );

  React.useEffect(() => {
    const initializeHands = async () => {
      try {
        if (!videoRef.current || !canvasRef.current) return;

        const hands = new Hands({
          locateFile: (file) => {
            return `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`;
          },
        });

        hands.setOptions({
          maxNumHands: 2, // 最多检测2只手
          modelComplexity: 1, // 模型复杂度 0-2
          minDetectionConfidence: 0.7, // 检测置信度
          minTrackingConfidence: 0.5, // 跟踪置信度
        });

        hands.onResults(onResults);

        const camera = new Camera(videoRef.current, {
          onFrame: async () => {
            if (videoRef.current) {
              await hands.send({ image: videoRef.current });
            }
          },
          width: 640,
          height: 480,
        });

        await camera.start();
        setIsLoading(false);
      } catch (err) {
        console.error("初始化手势识别失败:", err);
        setError("无法启动摄像头或加载模型");
        setIsLoading(false);
      }
    };

    initializeHands();
  }, [onResults]);

  return (
    <div className="gesture-detection-container">
      {isLoading && <div className="loading">⏳ 正在加载手势识别模型...</div>}

      {error && (
        <div className="error-message">
          <p>❌ {error}</p>
        </div>
      )}

      <div className="gesture-content">
        <video ref={videoRef} style={{ display: "none" }} playsInline muted />
        <canvas
          ref={canvasRef}
          width={640}
          height={480}
          className="gesture-canvas"
        />
      </div>

      <div className="gesture-info">
        <div className="gesture-display">
          <h3>当前手势</h3>
          <div className={`gesture-result ${gesture === "OK 👌" ? "ok" : ""}`}>
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

      <div className="gesture-instructions">
        <h3>📝 使用说明</h3>
        <div className="instruction-grid">
          <div className="instruction-item">
            <span className="step">1️⃣</span>
            <p>将手放在摄像头前</p>
          </div>
          <div className="instruction-item">
            <span className="step">2️⃣</span>
            <p>大拇指和食指形成圆圈</p>
          </div>
          <div className="instruction-item">
            <span className="step">3️⃣</span>
            <p>其他三指伸直向上</p>
          </div>
          <div className="instruction-item">
            <span className="step">✅</span>
            <p>成功识别 OK 手势！</p>
          </div>
        </div>

        <div className="tips">
          <p>💡 提示：确保光线充足，手势清晰完整</p>
          <p>🖐️ 支持检测最多 2 只手</p>
          <p>🎯 置信度达到 80% 以上即可识别</p>
        </div>
      </div>
    </div>
  );
}
