import { useState, useEffect, useCallback, useRef } from "react";
import { QRCodeSVG } from "qrcode.react";
import PageContainer from "./PageContainer";
import { Page5Images } from "../../constants/images";
import type { PageProps } from "../../types/paperCutting";
import { usePage5GestureDetection } from "../../hooks/usePage5GestureDetection";
import ShareCardCanvas, { type ShareCardCanvasRef } from "./ShareCardCanvas";
import { uploadShareImage } from "../../services/comfyuiService";
import { createSharePageUrl } from "../../utils/qrcode";

/**
 * Page 5: Image Display Stage
 * Displays the AI-generated paper-cut style image or captured photo
 * Shows QR code for mobile sharing
 * Returns to page1 via OK gesture or 30-second timeout
 */
const Page5Display: React.FC<PageProps> = ({
  capturedImage,
  aiGeneratedImage,
  generationError,
  onPrevStage
}) => {
  const [countdown, setCountdown] = useState(30);
  const [sharePageUrl, setSharePageUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const shareCardRef = useRef<ShareCardCanvasRef>(null);
  const hasUploadedRef = useRef(false);

  // Handle return to page1
  const handleReturn = useCallback(() => {
    if (onPrevStage) onPrevStage();
  }, [onPrevStage]);

  // OK gesture detection for this page only
  const { videoRef, progress, isGestureDetected } = usePage5GestureDetection({
    enabled: true,
    onOkGestureConfirmed: handleReturn,
    holdDuration: 3000, // 3 seconds to confirm
  });

  // Upload share card image when canvas is ready
  const handleCanvasReady = useCallback(async () => {
    // Prevent multiple uploads
    if (hasUploadedRef.current || uploading) return;

    const imageToShow = aiGeneratedImage || capturedImage;
    if (!imageToShow) return;

    hasUploadedRef.current = true;
    setUploading(true);
    setUploadError(null);

    try {
      // Small delay to ensure canvas is fully rendered
      await new Promise(resolve => setTimeout(resolve, 100));

      const blob = await shareCardRef.current?.getImageBlob();
      if (!blob) {
        throw new Error('Failed to get canvas blob');
      }

      console.log('[Page5] Uploading share card image...');
      const result = await uploadShareImage(blob);

      if (result.success && result.dataId) {
        console.log('[Page5] Upload successful, dataId:', result.dataId);
        // Pass dataId to share page, which will fetch the image data
        const shareUrl = createSharePageUrl(result.dataId);
        setSharePageUrl(shareUrl);
      } else {
        throw new Error(result.error || 'Upload failed');
      }
    } catch (error) {
      console.error('[Page5] Upload error:', error);
      setUploadError(error instanceof Error ? error.message : 'Upload failed');
    } finally {
      setUploading(false);
    }
  }, [aiGeneratedImage, capturedImage, uploading]);

  // 30-second auto-return timer
  useEffect(() => {
    if (countdown <= 0) {
      handleReturn();
      return;
    }

    const timer = setInterval(() => {
      setCountdown((prev) => prev - 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [countdown, handleReturn]);

  useEffect(() => {
    hasUploadedRef.current = false;
    setSharePageUrl(null);
    setUploadError(null);
  }, [aiGeneratedImage, capturedImage]);

  // Calculate circular progress for SVG
  const circumference = 2 * Math.PI * 45; // radius = 45
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  const displayImage = aiGeneratedImage || capturedImage || null;

  return (
    <PageContainer>
      {/* Hidden video element for gesture detection */}
      <video
        ref={videoRef}
        style={{ position: 'absolute', left: -9999, top: -9999, width: 640, height: 480, visibility: 'hidden' }}
        autoPlay
        playsInline
      />

      {/* Container with background */}
      <div
        className="w-full h-full relative"
        style={{ backgroundImage: `url(${Page5Images.decorations[0]})`, backgroundSize: 'cover', backgroundPosition: 'center' }}
      >
        {/* Background Overlay Layer */}
        <div
          className="absolute inset-0 w-full h-[841px] flex justify-center items-center bg-no-repeat bg-center"
          style={{ backgroundImage: `url(${Page5Images.decorations[4]})`, backgroundSize: 'cover' }}
        >
          {/* Main Content Card - DOM UI for display */}
          <div
            className="w-[522px] h-[775px] z-20 pointer-events-none flex flex-col items-center px-[35px] bg-no-repeat bg-center"
            style={{ backgroundImage: `url(${Page5Images.decorations[2]})`, backgroundSize: 'cover' }}
          >
            <div className="mt-[40px] w-[442px]">
              <img src={Page5Images.maskGroup} alt="title" className="w-full h-auto" />
            </div>

            {/* Middle Image Area */}
            <div
              className="w-full h-[613px] mt-[12px] flex items-center justify-center relative overflow-hidden bg-no-repeat bg-center bg-cover"
              style={{ backgroundImage: `url(${Page5Images.decorations[5]})` }}
            >
              {/* Container for card border + AI image, scaled to 80% */}
              <div className="relative w-[80%] h-[80%] flex items-center justify-center">
                {/* Card Border - as background layer behind the image */}
                <img
                  src={Page5Images.cardBorder}
                  alt=""
                  className="absolute inset-0 w-full h-full object-contain pointer-events-none z-0"
                />
                {/* Display AI Generated Image or Captured Image */}
                {displayImage ? (
                  <img
                    src={displayImage}
                    alt="paper-cut style"
                    className="max-w-[92%] max-h-[92%] object-contain z-10"
                  />
                ) : (
                  <div className="w-[87%] h-[87%] bg-gray-200 flex items-center justify-center text-gray-500 z-10">
                    暂无图片
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Hidden Canvas for screenshot export - positioned off-screen */}
        <div className="absolute -left-[9999px] -top-[9999px] opacity-0 pointer-events-none">
          <div className="w-[522px]">
            <ShareCardCanvas
              ref={shareCardRef}
              image={displayImage}
              onCanvasReady={handleCanvasReady}
            />
          </div>
        </div>

        {/* QR Code Section - positioned on the right side */}
        <div className="absolute right-[10px] top-[250px]  flex flex-col items-center z-30">
          {uploading && (
            <div className="bg-white/90 rounded-lg p-4 shadow-lg">
              <div className="w-[50px] h-[50px] flex items-center justify-center">
                <div className="animate-spin rounded-full h-10 w-10 border-4 border-[#B80509] border-t-transparent"></div>
              </div>
              <p className="text-center text-sm text-gray-600 mt-2">生成二维码中...</p>
            </div>
          )}

          {sharePageUrl && !uploading && (
            <div className="flex flex-col items-center">
              <div className="bg-white p-3 rounded-lg shadow-lg">
                <QRCodeSVG
                  value={sharePageUrl}
                  size={100}
                  bgColor="#FFFFFF"
                  fgColor="#B80509"
                  level="M"
                />
              </div>
              <div style={{
                backgroundImage: `url(${Page5Images.border})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                width: '191px',
                height: '24px',
              }} className="text-center text-[12px] text-[#B80509] mt-2 font-bold flex items-center justify-center">扫码获取剪纸艺术形象</div>
            </div>
          )}

          {uploadError && !uploading && (
            <div className="bg-white/90 rounded-lg p-4 shadow-lg">
              <div className="w-[150px] h-[150px] flex items-center justify-center text-red-500">
                <span className="text-4xl">⚠️</span>
              </div>
              <p className="text-center text-sm text-red-500 mt-2">二维码生成失败</p>
            </div>
          )}
        </div>

        {/* Error Display */}
        {generationError && (
          <div className="absolute top-[100px] left-1/2 -translate-x-1/2 bg-red-500 bg-opacity-90 text-white text-sm px-4 py-3 rounded z-30">
            生成失败: {generationError}
          </div>
        )}

        {/* Bottom Interaction Area */}
        <div className="absolute bottom-[180px] left-1/2 -translate-x-1/2 flex flex-col items-center w-full">
          {/* Countdown UI with Progress Ring */}
          <div className="mb-[-32px] flex items-center justify-center relative">
            {/* Progress Ring - visible when gesture is detected */}
            {isGestureDetected && (
              <svg
                className="absolute"
                width="128"
                height="128"
                viewBox="0 0 100 100"
                style={{ transform: 'rotate(-90deg)' }}
              >
                {/* Background circle */}
                <circle
                  cx="50"
                  cy="50"
                  r="45"
                  fill="none"
                  stroke="rgba(184, 5, 9, 0.2)"
                  strokeWidth="6"
                />
                {/* Progress circle */}
                <circle
                  cx="50"
                  cy="50"
                  r="45"
                  fill="none"
                  stroke="#B80509"
                  strokeWidth="6"
                  strokeLinecap="round"
                  strokeDasharray={circumference}
                  strokeDashoffset={strokeDashoffset}
                  style={{ transition: 'stroke-dashoffset 0.1s ease-out' }}
                />
              </svg>
            )}
            <div className="rounded-full text-[#B80509] z-10" style={{ fontFamily: "font-FangZheng DaBiaoSong" }}>
              <span className="text-[128px]">{countdown}</span>
              <span className="text-[36px]">秒</span>
            </div>
          </div>

          {/* Gesture hint text - changes when gesture detected */}
          <div className="relative w-full flex justify-center">
            <div className="absolute top-1/2 -translate-y-[40%] right-[170px] z-10 text-[25px] font-dabiaosong text-[#B80509]">
              {isGestureDetected ? (
                <span className="animate-pulse">保持手势中... {Math.round(progress)}%</span>
              ) : (
                '摆出图中手势，再次体验吧'
              )}
            </div>
            <img src={Page5Images.decorations[3]} alt="Gesture Guide" className="w-[453px] h-auto" />
          </div>
        </div>

        {/* Global Ornament */}
        <div className="absolute top-0 left-0 right-0 z-0 pointer-events-none">
          <img src={Page5Images.ornament} alt="" className="w-full h-auto" />
        </div>

        {/* Global Bottom Frame */}
        <div className="absolute bottom-0 left-0 right-0 z-10 pointer-events-none">
          <img
            src={Page5Images.bottomFrame}
            alt="Bottom Frame"
            className="w-full h-auto"
          />
        </div>
      </div>
    </PageContainer>
  );
};

export default Page5Display;
