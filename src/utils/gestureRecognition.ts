import { type NormalizedLandmark } from "@mediapipe/hands";

// 计算两点之间的距离
export function calculateDistance(
  point1: NormalizedLandmark,
  point2: NormalizedLandmark
): number {
  const dx = point1.x - point2.x;
  const dy = point1.y - point2.y;
  // z 坐标可能为 undefined，使用 0 作为默认值
  const dz = (point1.z ?? 0) - (point2.z ?? 0);
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

// 识别OK手势（优化版：适配全身拍照场景，使用动态阈值）
export function recognizeOKGesture(
  landmarks: NormalizedLandmark[],
  options: {
    circleThreshold?: number;
    fingerExtendThreshold?: number;
    confidenceThreshold?: number;
  } = {}
): {
  isOK: boolean;
  confidence: number;
} {
  const {
    circleThreshold: userCircleThreshold = 0.15,
    fingerExtendThreshold: userFingerExtendThreshold = 0.4,
    confidenceThreshold = 70
  } = options;
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
  // 动态阈值：允许圆圈直径为手掌大小的比例
  const circleThreshold = Math.max(handSize * userCircleThreshold, 0.06); // 最小阈值0.06
  const isCircleFormed = thumbIndexDist < circleThreshold;

  // 圆圈质量评分（越小越好，满分40）
  const circleQuality = isCircleFormed
    ? Math.max(0, 40 - (thumbIndexDist / circleThreshold) * 10)
    : 0;

  // 2. 检查其他三根手指是否伸直（使用相对位置）
  // 改进：使用相对于手掌基准的距离，考虑手的大小
  const fingerExtendThreshold = handSize * userFingerExtendThreshold; // 动态阈值

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
  // 判断是否为OK手势（优化判断逻辑）
  // 条件1：置信度 >= 阈值
  // 条件2：必须形成圆圈
  // 条件3：至少2根手指伸直
  const isOK = confidenceScore >= confidenceThreshold && isCircleFormed && extendedCount >= 2;

  return {
    isOK,
    confidence: Math.min(100, Math.round(confidenceScore)),
  };
}
