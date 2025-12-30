import React from "react";
import CameraWithFrame from "./CameraWithFrame";
import { Page3Images } from "../../constants/images";
import type { PageProps } from "../../types/paperCutting";

/**
 * Page 3: Countdown Stage  
 * Flat hierarchy: Background → Camera → Frame → UI
 */
const Page3Countdown: React.FC<PageProps & { sourceRef: React.RefObject<HTMLCanvasElement | null> }> = ({ detectionState, sourceRef }) => {
  const countdown = detectionState?.countdownValue ?? 3;

  return (
    <>
      {/* 1. Background layer - full screen */}
      <div className="fixed inset-0" style={{ zIndex: 0 }}>
        <img
          src={Page3Images.background}
          alt="Background"
          className="w-full h-full object-cover"
        />
      </div>

      {/* 2 & 3. Camera and Frame layers */}
      <CameraWithFrame 
        sourceRef={sourceRef} 
        frameImage={Page3Images.paperCuttingFrame} 
      />

      {/* 4. UI layer - full screen, topmost */}
      <div className="fixed inset-0 pointer-events-none" style={{ zIndex: 20 }}>
        {/* Logo at the top */}
        <div className="absolute top-[12rem] left-1/2 transform -translate-x-1/2 pointer-events-auto">
          <img
            src={Page3Images.logo}
            alt="Logo"
            className="animate-fade-in"
            style={{ height: '150px', width: 'auto', maxWidth: 'none' }}
          />
        </div>

        {/* Main content area - countdown overlay */}
        <div className="relative h-full pointer-events-none">
          {/* Countdown text - fixed position at top */}
          <div 
            className="absolute font-dabiaosong text-[#B80509] drop-shadow-lg text-center whitespace-nowrap"
            style={{ 
              fontSize: '70px',
              opacity: 0.9,
              bottom: '880px',
              left: '50%',
              transform: 'translateX(-50%)',
            }}
          >
            摆好姿势准备拍咯！
          </div>

          {/* Large countdown number with red circular border - below text */}
          <div
            className="absolute"
            style={{
              bottom: '520px',
              left: '50%',
              transform: 'translateX(-50%)',
            }}
          >
            <div
              key={countdown}
              className="font-dabiaosong font-bold animate-countdown"
              style={{
                fontSize: '200px',
                color: '#B80509',
                width: '280px',
                height: '280px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: '8px solid #B80509',
                borderRadius: '50%',
                backgroundColor: 'rgba(255, 255, 255, 0.1)',
                backdropFilter: 'blur(10px)',
              }}
            >
              {countdown}
            </div>
          </div>
        </div>

        {/* Bottom frame */}
        <div className="absolute bottom-0 left-0 right-0">
          <img
            src={Page3Images.bottomFrame}
            alt="Bottom Frame"
            className="w-full h-auto"
          />
        </div>
      </div>
    </>
  );
};

export default Page3Countdown;
