import React from "react";
import PageContainer from "./PageContainer";
import CameraWithFrame from "./CameraWithFrame";
import { Page3Images } from "../../constants/images";
import type { PageProps } from "../../types/paperCutting";

/**
 * Page 3: Countdown Stage
 * Displays when gesture is detected and countdown begins
 * Shows large countdown timer with animation
 */
const Page3Countdown: React.FC<PageProps & { sourceRef: React.RefObject<HTMLCanvasElement | null> }> = ({ detectionState, sourceRef }) => {
  const countdown = detectionState?.countdownValue ?? 3;

  return (
    <PageContainer backgroundImage={Page3Images.background}>
      {/* Camera with frame overlay */}
      <CameraWithFrame 
        sourceRef={sourceRef}
        frameImage={Page3Images.paperCuttingFrame}
      />
      {/* Logo at the top */}
      <div className="absolute top-8 left-1/2 transform -translate-x-1/2 z-20">
        <img
          src={Page3Images.logo}
          alt="Logo"
          className="h-16 w-auto"
        />
      </div>

      {/* Main content area - countdown overlay */}
      <div className="flex flex-col items-center justify-center flex-1 z-30">
        {/* Large countdown number */}
        <div
          key={countdown}
          className="font-dabiaosong text-white text-9xl font-bold animate-countdown mb-6"
          style={{
            textShadow: "0 0 30px rgba(255, 255, 255, 0.8), 0 0 60px rgba(255, 255, 255, 0.4)",
          }}
        >
          {countdown}
        </div>

        {/* Countdown text */}
        <div className="font-dabiaosong text-white text-2xl opacity-90 drop-shadow-lg">
          准备拍照...
        </div>
      </div>

      {/* Bottom frame */}
      <div className="absolute bottom-0 left-0 right-0 z-10">
        <img
          src={Page3Images.bottomFrame}
          alt="Bottom Frame"
          className="w-full h-auto"
        />
      </div>
    </PageContainer>
  );
};

export default Page3Countdown;
