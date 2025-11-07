import React from "react";
import cv from "@techstark/opencv-js";
import { loadFullBodyModels } from "./fullBodyDetection";

interface DetectedPerson {
  id: number;
  x: number;
  y: number;
  width: number;
  height: number;
  imageData: string;
}

export default function FullBodyExtract(): React.JSX.Element {
  const [selectedImage, setSelectedImage] = React.useState<string | null>(null);
  const [isProcessing, setIsProcessing] = React.useState<boolean>(false);
  const [modelLoaded, setModelLoaded] = React.useState<boolean>(false);
  const [detectedPeople, setDetectedPeople] = React.useState<DetectedPerson[]>(
    []
  );
  const [error, setError] = React.useState<string | null>(null);

  const imgRef = React.useRef<HTMLImageElement>(null);
  const canvasRef = React.useRef<HTMLCanvasElement>(null);

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

  const handleImageUpload = (
    event: React.ChangeEvent<HTMLInputElement>
  ): void => {
    const file = event.target.files?.[0];
    if (file && file.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const imageUrl = e.target?.result as string;
        setSelectedImage(imageUrl);
        setDetectedPeople([]);
      };
      reader.readAsDataURL(file);
    } else {
      alert("请选择图片文件（JPG, PNG 等）");
    }
  };

  const detectAndExtractPeople = React.useCallback(async () => {
    if (
      !imgRef.current ||
      !canvasRef.current ||
      !selectedImage ||
      !modelLoaded
    ) {
      return;
    }

    setIsProcessing(true);
    setDetectedPeople([]);

    try {
      // 等待图片加载
      await new Promise<void>((resolve) => {
        if (!imgRef.current) {
          resolve();
          return;
        }
        imgRef.current.onload = () => resolve();
        if (imgRef.current.complete) resolve();
      });

      if (!imgRef.current || !canvasRef.current) return;

      // 设置 canvas 尺寸
      const canvas = canvasRef.current;
      canvas.width = imgRef.current.width;
      canvas.height = imgRef.current.height;

      // 读取图像
      const img = cv.imread(imgRef.current);
      const displayImg = img.clone();

      // 转换为灰度图
      const gray = new cv.Mat();
      cv.cvtColor(img, gray, cv.COLOR_RGBA2GRAY, 0);

      // 检测全身
      const bodies = new cv.RectVector();
      const cascade = new cv.CascadeClassifier();
      cascade.load("haarcascade_fullbody.xml");

      cascade.detectMultiScale(
        gray,
        bodies,
        1.05,
        3,
        0,
        new cv.Size(50, 100),
        new cv.Size(0, 0)
      );

      // 找到最大的人物（假设最大的是主要人物）
      let largestBody = null;
      let maxArea = 0;

      for (let i = 0; i < bodies.size(); ++i) {
        const body = bodies.get(i);
        const area = body.width * body.height;
        if (area > maxArea) {
          maxArea = area;
          largestBody = body;
        }
      }

      const extractedPeople: DetectedPerson[] = [];

      // 只处理最大的人物
      if (largestBody) {
        const body = largestBody;

        // 在显示图像上绘制矩形（绿色高亮）
        const point1 = new cv.Point(body.x, body.y);
        const point2 = new cv.Point(body.x + body.width, body.y + body.height);
        cv.rectangle(displayImg, point1, point2, [0, 255, 0, 255], 4);

        // 添加标签
        cv.putText(
          displayImg,
          "Main Person",
          new cv.Point(body.x + 10, body.y + 40),
          cv.FONT_HERSHEY_SIMPLEX,
          1.2,
          [0, 255, 0, 255],
          3
        );

        // 绘制其他检测到的人物（灰色虚线框，不处理）
        for (let i = 0; i < bodies.size(); ++i) {
          const otherBody = bodies.get(i);
          if (otherBody !== largestBody) {
            const p1 = new cv.Point(otherBody.x, otherBody.y);
            const p2 = new cv.Point(
              otherBody.x + otherBody.width,
              otherBody.y + otherBody.height
            );
            cv.rectangle(displayImg, p1, p2, [128, 128, 128, 255], 2);
          }
        }

        // 裁剪主要人物区域
        const rect = new cv.Rect(body.x, body.y, body.width, body.height);
        const cropped = img.roi(rect);

        // 放大到固定尺寸 (例如 400x600)
        const targetWidth = 400;
        const targetHeight = 600;
        const resized = new cv.Mat();
        const dsize = new cv.Size(targetWidth, targetHeight);
        cv.resize(cropped, resized, dsize, 0, 0, cv.INTER_LINEAR);

        // 转换为图片数据
        const tempCanvas = document.createElement("canvas");
        tempCanvas.width = targetWidth;
        tempCanvas.height = targetHeight;
        cv.imshow(tempCanvas, resized);
        const imageData = tempCanvas.toDataURL("image/png");

        extractedPeople.push({
          id: 1,
          x: body.x,
          y: body.y,
          width: body.width,
          height: body.height,
          imageData: imageData,
        });

        cropped.delete();
        resized.delete();
      }

      // 显示标注后的图像
      cv.imshow(canvas, displayImg);

      setDetectedPeople(extractedPeople);

      // 清理
      img.delete();
      displayImg.delete();
      gray.delete();
      bodies.delete();
      cascade.delete();
    } catch (error) {
      console.error("检测失败:", error);
      alert("检测失败，请尝试其他图片");
    } finally {
      setIsProcessing(false);
    }
  }, [selectedImage, modelLoaded]);

  // 自动检测
  React.useEffect(() => {
    if (selectedImage && modelLoaded) {
      detectAndExtractPeople();
    }
  }, [selectedImage, modelLoaded, detectAndExtractPeople]);

  // 下载人物图片
  const downloadPerson = (person: DetectedPerson) => {
    const link = document.createElement("a");
    link.href = person.imageData;
    link.download = `extracted_person.png`;
    link.click();
  };

  return (
    <div className="fullbody-extract-container">
      <div className="upload-section">
        <label htmlFor="extract-image-upload" className="upload-button">
          {selectedImage ? "📷 选择其他图片" : "📷 上传图片抠出人物"}
          <input
            id="extract-image-upload"
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handleImageUpload}
            style={{ display: "none" }}
          />
        </label>

        {!modelLoaded && !error && (
          <p className="warning">⏳ 正在加载全身检测模型...</p>
        )}
        {error && <p className="error-message">❌ {error}</p>}
        {isProcessing && <p className="warning">🔍 正在检测和抠图...</p>}
      </div>

      {selectedImage && (
        <div className="extract-display">
          <div className="source-section">
            <h3>原始图片（标注）</h3>
            <div className="image-wrapper">
              <img
                ref={imgRef}
                src={selectedImage}
                alt="原图"
                style={{ display: "none" }}
              />
              <canvas ref={canvasRef} className="annotated-image" />
            </div>
            {detectedPeople.length > 0 && (
              <p className="detection-count">✅ 已选择主要人物并抠出</p>
            )}
          </div>

          {detectedPeople.length > 0 && (
            <div className="extracted-section">
              <div className="section-header">
                <h3>抠出的人物（放大 400×600）</h3>
              </div>
              <div className="single-person-display">
                {detectedPeople.map((person) => (
                  <div key={person.id} className="single-extracted-item">
                    <div className="single-image-wrapper">
                      <img
                        src={person.imageData}
                        alt="抠出的人物"
                        className="single-extracted-image"
                      />
                    </div>
                    <div className="single-person-info">
                      <div className="info-row">
                        <span className="info-label">原始尺寸：</span>
                        <span className="info-value">
                          {person.width} × {person.height} px
                        </span>
                      </div>
                      <div className="info-row">
                        <span className="info-label">放大尺寸：</span>
                        <span className="info-value">400 × 600 px</span>
                      </div>
                      <div className="info-row">
                        <span className="info-label">格式：</span>
                        <span className="info-value">PNG（无损）</span>
                      </div>
                    </div>
                    <button
                      onClick={() => downloadPerson(person)}
                      className="single-download-btn"
                    >
                      💾 下载抠图
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {detectedPeople.length === 0 && !isProcessing && (
            <div className="no-detection">
              <p>😕 未检测到人物</p>
              <p className="hint">请尝试：</p>
              <ul>
                <li>确保人物完整在画面内</li>
                <li>人物站立姿态</li>
                <li>光线充足</li>
                <li>背景简单</li>
              </ul>
            </div>
          )}
        </div>
      )}

      {!selectedImage && (
        <div className="instructions">
          <h3>📝 功能说明</h3>
          <div className="feature-list">
            <div className="feature-item">
              <span className="feature-icon">🔍</span>
              <div>
                <h4>智能识别</h4>
                <p>自动识别主要人物（最大/最清晰）</p>
              </div>
            </div>
            <div className="feature-item">
              <span className="feature-icon">✂️</span>
              <div>
                <h4>精准抠图</h4>
                <p>自动裁剪出主要人物区域</p>
              </div>
            </div>
            <div className="feature-item">
              <span className="feature-icon">🔎</span>
              <div>
                <h4>标准放大</h4>
                <p>统一放大到 400×600 标准尺寸</p>
              </div>
            </div>
            <div className="feature-item">
              <span className="feature-icon">💾</span>
              <div>
                <h4>高清下载</h4>
                <p>PNG 无损格式，一键下载保存</p>
              </div>
            </div>
          </div>

          <div className="tips">
            <h4>📷 最佳拍摄建议</h4>
            <ul>
              <li>✅ 主要人物全身在画面内</li>
              <li>✅ 站立或行走姿态</li>
              <li>✅ 光线充足均匀</li>
              <li>✅ 背景相对简单</li>
              <li>✅ 主要人物尽量占据画面中心</li>
            </ul>
          </div>

          <div className="tips">
            <h4>⚡ 使用技巧</h4>
            <ul>
              <li>支持 JPG、PNG 等格式</li>
              <li>多人照片会自动选择最大/主要人物</li>
              <li>其他人物会用灰色框标记（不处理）</li>
              <li>抠出的图片自动放大到标准尺寸</li>
              <li>点击下载按钮保存到本地</li>
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
