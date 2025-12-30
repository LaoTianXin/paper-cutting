import React from "react";
import CameraWithFrame from "./CameraWithFrame";
import { Page2Images } from "../../constants/images";
import type { PageProps } from "../../types/paperCutting";

/**
 * Page 2: Gesture Comparison Stage
 * Flat hierarchy: Background → Camera → Frame → UI
 */
const Page2Gesture: React.FC<PageProps & { sourceRef: React.RefObject<HTMLCanvasElement | null> }> = ({ detectionState, sourceRef }) => {
  const confidence = detectionState?.gestureConfidence ?? 0;

  return (
    <>
      {/* 1. Background layer - full screen */}
      <div className="fixed inset-0" style={{ zIndex: 0 }}>
        <img
          src={Page2Images.background}
          alt="Background"
          className="w-full h-full object-cover"
        />
      </div>

      {/* 2 & 3. Camera and Frame layers */}
      <CameraWithFrame 
        sourceRef={sourceRef} 
        frameImage={Page2Images.paperCuttingFrame} 
      />

      {/* 4. UI layer - full screen, topmost */}
      <div className="fixed inset-0 pointer-events-none" style={{ zIndex: 20 }}>
        {/* Logo at the top */}
        <div className="absolute top-[4.8rem] left-1/2 transform -translate-x-1/2 pointer-events-auto">
          <img
            src={Page2Images.logo}
            alt="Logo"
            className="animate-fade-in"
            style={{ height: '60px', width: 'auto', maxWidth: 'none' }}
          />
        </div>

        {/* Main content area */}
        <div className="relative h-full pointer-events-none">
          {/* Fixed position text */}
          <div 
            className="absolute font-dabiaosong text-[#B80509] drop-shadow-lg text-center whitespace-nowrap"
            style={{ 
              fontSize: '36px',
              lineHeight: '1.2',
              bottom: '342px', // Fixed position from bottom
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
              bottom: '200px', // Adjustable position from bottom
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

        {/* Bottom frame */}
        <div className="absolute bottom-0 left-0 right-0">
          <img
            src={Page2Images.bottomFrame}
            alt="Bottom Frame"
            className="w-full h-auto"
          />
        </div>
      </div>
    </>
  );
};

export default Page2Gesture;
