import React from "react";
import cv from "@techstark/opencv-js";
import { detectHaarFace } from "./haarFaceDetection";

interface ImageUploadProps {
  modelLoaded: boolean;
}

export default function ImageUpload({
  modelLoaded,
}: ImageUploadProps): React.JSX.Element {
  const [selectedImage, setSelectedImage] = React.useState<string | null>(null);
  const [processing, setProcessing] = React.useState<boolean>(false);
  const imgRef = React.useRef<HTMLImageElement>(null);
  const canvasRef = React.useRef<HTMLCanvasElement>(null);

  const handleImageUpload = (
    event: React.ChangeEvent<HTMLInputElement>
  ): void => {
    const file = event.target.files?.[0];
    if (file && file.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const imageUrl = e.target?.result as string;
        setSelectedImage(imageUrl);
      };
      reader.readAsDataURL(file);
    }
  };

  const detectFaces = async (): Promise<void> => {
    if (!imgRef.current || !canvasRef.current || !selectedImage || !modelLoaded)
      return;

    setProcessing(true);
    try {
      // Wait for image to load
      await new Promise<void>((resolve) => {
        if (!imgRef.current) {
          resolve();
          return;
        }
        imgRef.current.onload = () => resolve();
        if (imgRef.current.complete) resolve();
      });

      if (!imgRef.current || !canvasRef.current) return;

      // Read image and detect faces
      const img = cv.imread(imgRef.current);
      await detectHaarFace(img);
      cv.imshow(canvasRef.current, img);
      img.delete();
    } catch (error) {
      console.error("Error detecting faces:", error);
      alert("检测失败，请尝试其他图片");
    } finally {
      setProcessing(false);
    }
  };

  React.useEffect(() => {
    if (selectedImage && modelLoaded) {
      detectFaces();
    }
  }, [selectedImage, modelLoaded]);

  return (
    <div className="image-upload-container">
      <div className="upload-section">
        <label htmlFor="image-upload" className="upload-button">
          {selectedImage ? "📷 选择其他图片" : "📷 上传图片测试"}
          <input
            id="image-upload"
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handleImageUpload}
            style={{ display: "none" }}
          />
        </label>

        {!modelLoaded && <p className="warning">⏳ 等待模型加载中...</p>}
      </div>

      {selectedImage && (
        <div className="image-display">
          <div className="image-container">
            <h3>原始图片</h3>
            <img
              ref={imgRef}
              src={selectedImage}
              alt="上传的图片"
              className="uploaded-image"
            />
          </div>

          <div className="canvas-container">
            <h3>{processing ? "检测中... 🔍" : "检测结果 ✨"}</h3>
            <canvas ref={canvasRef} className="result-canvas" />
          </div>
        </div>
      )}

      {!selectedImage && (
        <div className="instructions">
          <h3>📝 使用说明</h3>
          <ul>
            <li>点击上方按钮选择图片或拍照</li>
            <li>支持 JPG、PNG 等常见格式</li>
            <li>自动检测图片中的人脸</li>
            <li>用蓝色框标记出人脸位置</li>
          </ul>
        </div>
      )}
    </div>
  );
}
