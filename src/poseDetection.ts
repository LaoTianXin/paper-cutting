import {
  Pose,
  Results as PoseResults,
  POSE_CONNECTIONS,
} from "@mediapipe/pose";

// 身体矩形接口
export interface BodyRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

// 检测结果接口
export interface PoseDetectionResult {
  count: number; // 检测到的人数
  largestRect: BodyRect | null; // 最大的身体矩形
  allRects: BodyRect[]; // 所有身体矩形
  largestLandmarks: PoseResults["poseLandmarks"] | null; // 最大目标的关键点
  allResults: PoseResults[]; // 所有检测结果
}

let poseInstance: Pose | null = null;
let isLoading = false;
let isLoaded = false;

/**
 * 初始化 MediaPipe Pose
 * @returns Pose 实例
 */
export async function initializePose(): Promise<Pose> {
  if (poseInstance && isLoaded) {
    console.log("Pose 已初始化，返回现有实例");
    return poseInstance;
  }

  if (isLoading) {
    // 等待加载完成
    while (isLoading) {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
    if (poseInstance) return poseInstance;
  }

  isLoading = true;
  console.log("=======开始初始化 MediaPipe Pose=======");

  try {
    const pose = new Pose({
      locateFile: (file) => {
        // 使用本地文件，避免 CDN 加载延迟
        return `/mediapipe/pose/${file}`;
      },
    });

    pose.setOptions({
      modelComplexity: 1, // 0: Lite, 1: Full, 2: Heavy
      smoothLandmarks: true, // 平滑关键点
      enableSegmentation: false, // 不需要分割
      smoothSegmentation: false,
      minDetectionConfidence: 0.5, // 检测置信度
      minTrackingConfidence: 0.5, // 跟踪置信度
    });

    poseInstance = pose;
    isLoaded = true;
    isLoading = false;

    console.log("=======MediaPipe Pose 初始化完成=======");
    return pose;
  } catch (error) {
    console.error("初始化 Pose 失败:", error);
    isLoading = false;
    isLoaded = false;
    throw error;
  }
}

/**
 * 获取已初始化的 Pose 实例
 */
export function getPoseInstance(): Pose | null {
  return poseInstance;
}

/**
 * 检查 Pose 是否已初始化
 */
export function isPoseLoaded(): boolean {
  return isLoaded && poseInstance !== null;
}

/**
 * 从关键点计算身体边界框
 * @param landmarks - Pose 关键点
 * @param imageWidth - 图像宽度
 * @param imageHeight - 图像高度
 * @returns 身体矩形
 */
export function calculateBodyRect(
  landmarks: PoseResults["poseLandmarks"],
  imageWidth: number,
  imageHeight: number
): BodyRect | null {
  if (!landmarks || landmarks.length === 0) {
    return null;
  }

  // 过滤可见度较高的关键点
  const visibleLandmarks = landmarks.filter((lm) => (lm.visibility ?? 1) > 0.5);

  if (visibleLandmarks.length < 5) {
    // 可见关键点太少，可能检测不完整
    return null;
  }

  // 计算边界框
  const xs = visibleLandmarks.map((lm) => lm.x);
  const ys = visibleLandmarks.map((lm) => lm.y);

  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);

  // 添加边距（10%）
  const padding = 0.1;
  const width = maxX - minX;
  const height = maxY - minY;

  const paddedMinX = Math.max(0, minX - width * padding);
  const paddedMaxX = Math.min(1, maxX + width * padding);
  const paddedMinY = Math.max(0, minY - height * padding);
  const paddedMaxY = Math.min(1, maxY + height * padding);

  return {
    x: paddedMinX * imageWidth,
    y: paddedMinY * imageHeight,
    width: (paddedMaxX - paddedMinX) * imageWidth,
    height: (paddedMaxY - paddedMinY) * imageHeight,
  };
}

/**
 * 计算身体矩形面积
 */
export function calculateRectArea(rect: BodyRect): number {
  return rect.width * rect.height;
}

/**
 * 从多个检测结果中选择最大的
 * @param results - 所有 Pose 检测结果
 * @param imageWidth - 图像宽度
 * @param imageHeight - 图像高度
 * @returns 处理后的检测结果
 */
export function selectLargestPose(
  results: PoseResults[],
  imageWidth: number,
  imageHeight: number
): PoseDetectionResult {
  const allRects: BodyRect[] = [];
  let largestRect: BodyRect | null = null;
  let largestArea = 0;
  let largestIndex = -1;
  let largestLandmarks: PoseResults["poseLandmarks"] | null = null;

  // 遍历所有检测结果
  results.forEach((result, index) => {
    if (result.poseLandmarks) {
      const rect = calculateBodyRect(
        result.poseLandmarks,
        imageWidth,
        imageHeight
      );
      if (rect) {
        allRects.push(rect);
        const area = calculateRectArea(rect);

        if (area > largestArea) {
          largestArea = area;
          largestRect = rect;
          largestIndex = index;
          largestLandmarks = result.poseLandmarks;
        }
      }
    }
  });

  return {
    count: allRects.length,
    largestRect,
    allRects,
    largestLandmarks,
    allResults: results,
  };
}

/**
 * 检查姿态是否为站立姿势（可选验证）
 * @param landmarks - Pose 关键点
 * @returns 是否站立
 */
export function isStandingPose(
  landmarks: PoseResults["poseLandmarks"]
): boolean {
  if (!landmarks || landmarks.length < 33) return false;

  // 检查关键点：11-左肩, 12-右肩, 23-左髋, 24-右髋, 27-左脚踝, 28-右脚踝
  const leftShoulder = landmarks[11];
  const rightShoulder = landmarks[12];
  const leftHip = landmarks[23];
  const rightHip = landmarks[24];
  const leftAnkle = landmarks[27];
  const rightAnkle = landmarks[28];

  // 检查可见度
  const allVisible = [
    leftShoulder,
    rightShoulder,
    leftHip,
    rightHip,
    leftAnkle,
    rightAnkle,
  ].every((lm) => (lm.visibility ?? 0) > 0.5);

  if (!allVisible) return false;

  // 检查是否站立：脚踝应该在髋部下方
  const avgHipY = (leftHip.y + rightHip.y) / 2;
  const avgAnkleY = (leftAnkle.y + rightAnkle.y) / 2;

  return avgAnkleY > avgHipY; // 脚踝在下方
}

/**
 * 清理 Pose 实例
 */
export function cleanupPose(): void {
  if (poseInstance) {
    try {
      poseInstance.close();
    } catch (err) {
      console.error("清理 Pose 失败:", err);
    }
    poseInstance = null;
    isLoaded = false;
  }
}

// 导出 POSE_CONNECTIONS 用于绘制骨骼
export { POSE_CONNECTIONS };
