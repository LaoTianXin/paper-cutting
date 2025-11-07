import cv, { type CascadeClassifier, type Mat } from "@techstark/opencv-js";
import { loadDataFile } from "./cvDataFile";

let faceCascade: CascadeClassifier;

/**
 * Ensure OpenCV is fully loaded and ready
 * @returns A promise that resolves when OpenCV is ready
 */
function ensureOpenCVReady(): Promise<void> {
  return new Promise<void>((resolve) => {
    if (cv && cv.Mat) {
      // OpenCV is already loaded
      resolve();
    } else {
      // Wait for OpenCV to load
      const checkInterval = setInterval(() => {
        if (cv && cv.Mat) {
          clearInterval(checkInterval);
          resolve();
        }
      }, 100);
    }
  });
}

/**
 * Load Haar-cascade face detection models
 * @returns A promise that resolves when models are loaded
 */
export async function loadHaarFaceModels(): Promise<void> {
  console.log("=======start downloading Haar-cascade models=======");

  // Ensure OpenCV is ready first
  await ensureOpenCVReady();
  console.log("OpenCV is ready");

  try {
    // Load the cascade file
    await loadDataFile(
      "haarcascade_frontalface_default.xml",
      "/models/haarcascade_frontalface_default.xml"
    );

    // Wait a bit for the file system to stabilize
    await new Promise<void>((resolve) => setTimeout(resolve, 500));

    // Load the cascade classifier
    faceCascade = new cv.CascadeClassifier();
    const loaded = faceCascade.load("haarcascade_frontalface_default.xml");

    if (!loaded) {
      throw new Error("Failed to load cascade classifier");
    }

    console.log("=======downloaded Haar-cascade models=======");
  } catch (error: unknown) {
    console.error("Error loading Haar-cascade models:", error);
    throw error;
  }
}

/**
 * Detect faces from the input image.
 * See https://docs.opencv.org/master/d2/d99/tutorial_js_face_detection.html
 * @param img - Input image
 * @returns the modified image with detected faces drawn on it.
 */
export async function detectHaarFace(img: Mat): Promise<Mat> {
  const msize = new cv.Size(0, 0);

  // const newImg = img.clone();
  const newImg = img;

  const gray = new cv.Mat();
  cv.cvtColor(newImg, gray, cv.COLOR_RGBA2GRAY, 0);

  const faces = new cv.RectVector();

  // detect faces
  faceCascade.detectMultiScale(gray, faces, 1.1, 3, 0, msize, msize);
  for (let i = 0; i < faces.size(); ++i) {
    const point1 = new cv.Point(faces.get(i).x, faces.get(i).y);
    const point2 = new cv.Point(
      faces.get(i).x + faces.get(i).width,
      faces.get(i).y + faces.get(i).height
    );
    cv.rectangle(newImg, point1, point2, [255, 0, 0, 255]);
  }

  gray.delete();
  faces.delete();

  return newImg;
}
