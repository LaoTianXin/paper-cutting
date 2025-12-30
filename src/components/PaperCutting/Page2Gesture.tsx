import React from "react";
import { Page2Images } from "../../constants/images";
import type { PageProps } from "../../types/paperCutting";

/**
 * Page 2: Gesture Comparison Stage
 * Only renders UI decorations - camera is handled by PaperCuttingApp
 */
const Page2Gesture: React.FC<PageProps> = ({ detectionState }) => {
  const confidence = detectionState?.gestureConfidence ?? 0;

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

          {/* Adjustable position image */}
          <div 
            className="absolute"
            style={{
              bottom: '200px',
              left: '50%',
              transform: 'translateX(-50%)',
            }}
          >
            <img
              src={Page2Images.gestureIcon}
              alt="Gesture Icon"
              className="w-[120px] h-auto"
            />
          </div>

          {/* Confidence indicator */}
          {confidence > 0 && (
            <div 
              className="absolute bg-white bg-opacity-30 rounded-full overflow-hidden backdrop-blur-sm"
              style={{ 
                width: '150px',
                height: '8px',
                bottom: '160px',
                left: '50%',
                transform: 'translateX(-50%)',
              }}
            >
              <div
                className="bg-gradient-to-r from-green-400 to-green-600 h-full transition-all duration-300 rounded-full"
                style={{ width: `${confidence * 100}%` }}
              />
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default Page2Gesture;
