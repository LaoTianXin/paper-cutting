import React from "react";
import { Page2Images } from "../../constants/images";
import type { PageProps } from "../../types/paperCutting";

/**
 * Page 2: Gesture Comparison Stage
 * Only renders UI decorations - camera is handled by PaperCuttingApp
 */
const Page2Gesture: React.FC<PageProps> = ({ detectionState }) => {
  // Use gestureProgress for time-based progress (0-1 over 3 seconds)
  const progress = detectionState?.gestureProgress ?? 0;
  const isGestureDetected = detectionState?.gestureDetected ?? false;

  // Calculate circular progress for SVG (same as Page5)
  const circumference = 2 * Math.PI * 45; // radius = 45
  const strokeDashoffset = circumference - progress * circumference;

  return (
    <>
      {/* Page-specific content only */}
      <div className="fixed inset-0 pointer-events-none" style={{ zIndex: 20 }}>
        {/* Main content area */}
        <div className="relative h-full pointer-events-none">
          {/* Fixed position text */}
          <div
            className="absolute font-dabiaosong text-[#B80509] drop-shadow-lg text-center whitespace-nowrap"
            style={{
              fontSize: '36px',
              lineHeight: '1.2',
              bottom: '342px',
              left: '50%',
              transform: 'translateX(-50%)',
            }}
          >
            想好造型后，摆出图中手势
            <br />
            准备开始吧
          </div>

          {/* Adjustable position image with circular progress ring */}
          <div
            className="absolute flex items-center justify-center"
            style={{
              bottom: '200px',
              left: '50%',
              transform: 'translateX(-50%)',
            }}
          >
            {/* Progress Ring - visible when gesture is detected */}
            {isGestureDetected && (
              <svg
                className="absolute"
                width="160"
                height="160"
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
            <img
              src={Page2Images.gestureIcon}
              alt="Gesture Icon"
              className="w-[120px] h-auto z-10"
            />
          </div>

          {/* Progress percentage text - shown when gesture detected */}
          {isGestureDetected && (
            <div
              className="absolute font-dabiaosong text-[#B80509] text-center animate-pulse"
              style={{
                fontSize: '20px',
                bottom: '160px',
                left: '50%',
                transform: 'translateX(-50%)',
              }}
            >
              保持手势中... {Math.round(progress * 100)}%
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default Page2Gesture;
