import React, { useState, useEffect, useCallback } from "react";
import PageContainer from "./PageContainer";
import { Page5Images } from "../../constants/images";
import type { PageProps } from "../../types/paperCutting";
import { usePage5GestureDetection } from "../../hooks/usePage5GestureDetection";

/**
 * Page 5: Image Display Stage
 * Displays the AI-generated paper-cut style image or captured photo
 * Returns to page1 via OK gesture or 30-second timeout
 */
const Page5Display: React.FC<PageProps> = ({
  capturedImage,
  aiGeneratedImage,
  generationError,
  onPrevStage
}) => {
  const [countdown, setCountdown] = useState(30);

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

  // Calculate circular progress for SVG
  const circumference = 2 * Math.PI * 45; // radius = 45
  const strokeDashoffset = circumference - (progress / 100) * circumference;

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
          {/* Main Content Card */}
          <div
            className="w-[522px] h-[775px] z-20 pointer-events-none flex flex-col items-center px-[35px] bg-no-repeat bg-center"
            style={{ backgroundImage: `url(${Page5Images.decorations[2]})`, backgroundSize: 'cover' }}
          >
            <div className="mt-[40px] w-[442px]">
              <img src={Page5Images.maskGroup} alt="title" className="w-full h-auto" />
            </div>

            {/* Middle Image Area */}
            <div className="bg-gray-400 w-full h-[613px] mt-[12px] flex items-center justify-center relative overflow-hidden">
              {/* Error Display */}
              {generationError && (
                <div className="absolute top-2 left-2 right-2 bg-red-500 bg-opacity-90 text-white text-sm px-3 py-2 rounded z-20">
                  生成失败: {generationError}
                </div>
              )}

              {/* Display AI Generated Image or Captured Image */}
              {aiGeneratedImage ? (
                <img
                  src={aiGeneratedImage}
                  alt="AI paper-cut style"
                  className="max-w-full max-h-full object-contain"
                />
              ) : capturedImage ? (
                <img
                  src={capturedImage}
                  alt="captured"
                  className="max-w-full max-h-full object-contain"
                />
              ) : (
                <div className="absolute inset-[6.5%] w-[87%] h-[87%] bg-gray-200 flex items-center justify-center text-gray-500">
                  暂无图片
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Bottom Interaction Area */}
        <div className="absolute bottom-[216px] left-1/2 -translate-x-1/2 flex flex-col items-center w-full">
          {/* Countdown UI with Progress Ring */}
          <div className="mb-[-8px] flex items-center justify-center relative">
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
            <div className="rounded-full font-bold text-[#B80509] z-10">
              <span className="text-[60px]">{countdown}</span>
              <span className="text-[18px]">秒</span>
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
