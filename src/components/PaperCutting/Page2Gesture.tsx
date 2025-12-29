import React from "react";
import PageContainer from "./PageContainer";
import CameraWithFrame from "./CameraWithFrame";
import { Page2Images } from "../../constants/images";
import type { PageProps } from "../../types/paperCutting";

/**
 * Page 2: Gesture Comparison Stage
 * Displays when person is detected but gesture is not yet recognized
 * Shows camera feed with gesture target icon
 */
const Page2Gesture: React.FC<PageProps & { sourceRef: React.RefObject<HTMLCanvasElement | null> }> = ({ detectionState, sourceRef }) => {
  const confidence = detectionState?.gestureConfidence ?? 0;

  return (
    <PageContainer backgroundImage={Page2Images.background}>
      {/* Camera with frame overlay */}
      <CameraWithFrame 
        sourceRef={sourceRef}
        frameImage={Page2Images.paperCuttingFrame}
      />
      {/* Logo at the top */}
      <div className="absolute top-8 left-1/2 transform -translate-x-1/2 z-20">
        <img
          src={Page2Images.logo}
          alt="Logo"
          className="h-16 w-auto"
        />
      </div>

      {/* Main content area */}
      <div className="flex flex-col items-center justify-end flex-1 z-10 pb-32">
        {/* Gesture icon */}
        <div className="mb-4">
          <img
            src={Page2Images.gestureIcon}
            alt="Gesture Icon"
            className="w-24 h-auto opacity-90"
          />
        </div>

        {/* Instructions */}
        <div className="font-dabiaosong text-white text-2xl font-bold mb-2 drop-shadow-lg">
          请比出手势
        </div>

        {/* Confidence indicator */}
        {confidence > 0 && (
          <div className="w-48 bg-white bg-opacity-30 rounded-full h-3 overflow-hidden backdrop-blur-sm">
            <div
              className="bg-gradient-to-r from-green-400 to-green-600 h-full transition-all duration-300 rounded-full"
              style={{ width: `${confidence * 100}%` }}
            />
          </div>
        )}
      </div>

      {/* Bottom frame */}
      <div className="absolute bottom-0 left-0 right-0 z-10">
        <img
          src={Page2Images.bottomFrame}
          alt="Bottom Frame"
          className="w-full h-auto"
        />
      </div>
    </PageContainer>
  );
};

export default Page2Gesture;
