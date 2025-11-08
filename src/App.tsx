import React from "react";
import Webcam from "react-webcam";
import cv from "@techstark/opencv-js";
import { loadHaarFaceModels, detectHaarFace } from "./haarFaceDetection";
import ImageUpload from "./ImageUpload";
import VideoUpload from "./VideoUpload";
import GestureDetection from "./GestureDetection";
import GestureVideoUpload from "./GestureVideoUpload";
import FullBodyVideoUpload from "./FullBodyVideoUpload";
import FullBodyExtract from "./FullBodyExtract";
import IntegratedPhotoCapture from "./IntegratedPhotoCapture";
import IntegratedVideoCapture from "./IntegratedVideoCapture";
import IntegratedPhotoCaptureV2 from "./IntegratedPhotoCaptureV2";
import "./index.css";

type Mode =
  | "webcam"
  | "image"
  | "video"
  | "gesture"
  | "gesture-video"
  | "fullbody"
  | "extract"
  | "integrated"
  | "integrated-video"
  | "integrated-v2";

export default function App(): React.JSX.Element {
  const [modelLoaded, setModelLoaded] = React.useState<boolean>(false);
  const [error, setError] = React.useState<string | null>(null);
  const [mode, setMode] = React.useState<Mode>("webcam");

  React.useEffect(() => {
    loadHaarFaceModels()
      .then(() => {
        setModelLoaded(true);
        setError(null);
      })
      .catch((err: unknown) => {
        const errorMessage =
          err instanceof Error ? err.message : "Failed to load models";
        setError(errorMessage);
        console.error("Error loading face detection models:", err);
      });
  }, []);

  const webcamRef = React.useRef<Webcam>(null);
  const imgRef = React.useRef<HTMLImageElement>(null);
  const faceImgRef = React.useRef<HTMLCanvasElement>(null);

  React.useEffect(() => {
    if (!modelLoaded) return;

    const detectFace = async (): Promise<void> => {
      const imageSrc = webcamRef.current?.getScreenshot();
      if (!imageSrc) return;

      return new Promise<void>((resolve) => {
        if (!imgRef.current) {
          resolve();
          return;
        }

        imgRef.current.src = imageSrc;
        imgRef.current.onload = async () => {
          try {
            if (!imgRef.current || !faceImgRef.current) {
              resolve();
              return;
            }

            const img = cv.imread(imgRef.current);
            await detectHaarFace(img);
            cv.imshow(faceImgRef.current, img);

            img.delete();
            resolve();
          } catch (error) {
            console.log(error);
            resolve();
          }
        };
      });
    };

    let handle: number;
    const nextTick = (): void => {
      handle = requestAnimationFrame(async () => {
        await detectFace();
        nextTick();
      });
    };
    nextTick();
    return () => {
      cancelAnimationFrame(handle);
    };
  }, [modelLoaded]);

  return (
    <div className="App">
      <h2>🎭 AI 视觉检测平台</h2>

      {/* 模式切换按钮 */}
      <div className="mode-switch">
        <button
          className={mode === "webcam" ? "active" : ""}
          onClick={() => setMode("webcam")}
        >
          📹 人脸
        </button>
        <button
          className={mode === "image" ? "active" : ""}
          onClick={() => setMode("image")}
        >
          📸 图片
        </button>
        <button
          className={mode === "video" ? "active" : ""}
          onClick={() => setMode("video")}
        >
          🎬 人脸视频
        </button>
        <button
          className={mode === "gesture" ? "active" : ""}
          onClick={() => setMode("gesture")}
        >
          👌 OK手势
        </button>
        <button
          className={mode === "gesture-video" ? "active" : ""}
          onClick={() => setMode("gesture-video")}
        >
          🎥 OK视频
        </button>
        <button
          className={mode === "fullbody" ? "active" : ""}
          onClick={() => setMode("fullbody")}
        >
          🚶 全身检测
        </button>
        <button
          className={mode === "extract" ? "active" : ""}
          onClick={() => setMode("extract")}
        >
          ✂️ 人物抠图
        </button>
        <button
          className={mode === "integrated" ? "active" : ""}
          onClick={() => setMode("integrated")}
        >
          📸 智能拍照
        </button>
        <button
          className={mode === "integrated-video" ? "active" : ""}
          onClick={() => setMode("integrated-video")}
        >
          🎬 视频拍照
        </button>
        <button
          className={mode === "integrated-v2" ? "active" : ""}
          onClick={() => setMode("integrated-v2")}
          style={{ backgroundColor: "#4CAF50", color: "white" }}
        >
          ✨ 智能拍照V2 (Pose)
        </button>
      </div>

      {!modelLoaded && (
        <div className="loading">⏳ Loading Haar-cascade face model...</div>
      )}

      {error ? (
        <div style={{ color: "red", padding: "20px" }}>
          <h3>Error loading face detection models:</h3>
          <p>{error}</p>
          <p>Please check the console for more details.</p>
        </div>
      ) : (
        <>
          {mode === "webcam" && (
            <div className="webcam-mode">
              <Webcam
                ref={webcamRef}
                className="webcam"
                mirrored
                screenshotFormat="image/jpeg"
                videoConstraints={{
                  facingMode: "user", // 'user' 前置, 'environment' 后置
                }}
              />
              <img className="inputImage" alt="input" ref={imgRef} />
              <canvas className="outputImage" ref={faceImgRef} />
            </div>
          )}

          {mode === "image" && <ImageUpload modelLoaded={modelLoaded} />}

          {mode === "video" && <VideoUpload modelLoaded={modelLoaded} />}

          {mode === "gesture" && (
            <GestureDetection
              onGestureDetected={(gesture) => {
                console.log("检测到手势:", gesture);
              }}
            />
          )}

          {mode === "gesture-video" && <GestureVideoUpload />}

          {mode === "fullbody" && <FullBodyVideoUpload />}

          {mode === "extract" && <FullBodyExtract />}

          {mode === "integrated" && <IntegratedPhotoCapture />}

          {mode === "integrated-video" && <IntegratedVideoCapture />}

          {mode === "integrated-v2" && <IntegratedPhotoCaptureV2 />}
        </>
      )}
    </div>
  );
}
