import cv from "@techstark/opencv-js";
import { loadDataFile } from "./cvDataFile";
import type { Mat, CascadeClassifier } from "@techstark/opencv-js";

let fullBodyCascade: CascadeClassifier;
let isLoading = false;
let isLoaded = false;
let loadPromise: Promise<void> | null = null;

/**
 * Load full body detection models
 * @returns A promise that resolves when models are loaded
 */
export async function loadFullBodyModels(): Promise<void> {
  // 如果已经加载完成，直接返回
  if (isLoaded) {
    console.log("全身检测模型已加载，跳过重复加载");
    return;
  }

  // 如果正在加载，返回现有的 Promise
  if (isLoading && loadPromise) {
    console.log("全身检测模型正在加载中，等待完成...");
    return loadPromise;
  }

  // 开始新的加载流程
  isLoading = true;
  console.log("=======开始加载全身检测模型=======");

  // 创建加载 Promise
  loadPromise = (async () => {
    try {
      // 确保 OpenCV 已加载
      await new Promise<void>((resolve) => {
        if (cv && cv.Mat) {
          resolve();
        } else {
          const checkInterval = setInterval(() => {
            if (cv && cv.Mat) {
              clearInterval(checkInterval);
              resolve();
            }
          }, 100);
        }
      });

      // 加载全身检测模型
      await loadDataFile("haarcascade_eye.xml", "/models/haarcascade_eye.xml");

      // 等待文件系统稳定
      await new Promise<void>((resolve) => setTimeout(resolve, 500));

      // 加载分类器
      fullBodyCascade = new cv.CascadeClassifier();
      const loaded = fullBodyCascade.load("haarcascade_eye.xml");

      if (!loaded) {
        throw new Error("Failed to load full body cascade classifier");
      }

      console.log("=======全身检测模型加载完成=======");

      // 标记为已加载
      isLoaded = true;
      isLoading = false;
    } catch (error: unknown) {
      console.error("加载全身检测模型失败:", error);
      isLoading = false;
      isLoaded = false;
      loadPromise = null;
      throw error;
    }
  })();

  return loadPromise;
}

/**
 * Get the loaded full body cascade classifier
 * @returns The cascade classifier instance
 */
export function getFullBodyCascade(): CascadeClassifier {
  if (!isLoaded || !fullBodyCascade) {
    throw new Error(
      "Full body cascade is not loaded. Call loadFullBodyModels() first."
    );
  }
  return fullBodyCascade;
}

/**
 * Check if the full body models are loaded
 * @returns True if models are loaded
 */
export function isFullBodyModelsLoaded(): boolean {
  return isLoaded;
}

/**
 * Detect full bodies from the input image
 * @param img - Input image
 * @returns the modified image with detected bodies drawn on it
 */
export async function detectFullBody(img: Mat): Promise<Mat> {
  const msize = new cv.Size(0, 0);
  const newImg = img;

  // 转换为灰度图
  const gray = new cv.Mat();
  cv.cvtColor(newImg, gray, cv.COLOR_RGBA2GRAY, 0);

  const bodies = new cv.RectVector();

  // 检测全身
  // 参数说明：
  // scaleFactor: 1.05 (更小的值检测更准确但更慢)
  // minNeighbors: 3 (较低值会有更多检测但可能误检)
  // minSize: 适当的最小尺寸避免误检
  fullBodyCascade.detectMultiScale(
    gray,
    bodies,
    1.05,
    3,
    0,
    new cv.Size(50, 100), // minSize: 最小身体尺寸 (宽x高)
    msize
  );

  // 绘制检测到的身体
  for (let i = 0; i < bodies.size(); ++i) {
    const body = bodies.get(i);
    const point1 = new cv.Point(body.x, body.y);
    const point2 = new cv.Point(body.x + body.width, body.y + body.height);

    // 绘制矩形框
    cv.rectangle(newImg, point1, point2, [0, 255, 0, 255], 3);

    // 添加标签
    const label = `Body ${i + 1}`;
    cv.putText(
      newImg,
      label,
      new cv.Point(body.x, body.y - 10),
      cv.FONT_HERSHEY_SIMPLEX,
      0.8,
      [0, 255, 0, 255],
      2
    );
  }

  // 在图像顶部显示检测到的身体数量
  const count = bodies.size();
  if (count > 0) {
    cv.putText(
      newImg,
      `Detected: ${count} ${count === 1 ? "person" : "people"}`,
      new cv.Point(10, 40),
      cv.FONT_HERSHEY_SIMPLEX,
      1.2,
      [0, 255, 0, 255],
      3
    );
  }

  gray.delete();
  bodies.delete();

  return newImg;
}
