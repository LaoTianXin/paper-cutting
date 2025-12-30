import React from "react";
import CameraWithFrame from "./CameraWithFrame";
import { Page1Images } from "../../constants/images";
import type { PageProps } from "../../types/paperCutting";

/**
 * Page 1: Scan Start Stage
 * Flat hierarchy: Background → Camera → Frame → UI
 */
const Page1Scan: React.FC<PageProps & { sourceRef: React.RefObject<HTMLCanvasElement | null> }> = ({ sourceRef }) => {
  return (
    <>
      {/* 1. Background layer - full screen */}
      <div className="fixed inset-0" style={{ zIndex: 0 }}>
        <img
          src={Page1Images.background}
          alt="Background"
          className="w-full h-full object-cover"
        />
      </div>

      {/* 2 & 3. Camera and Frame layers */}
      <CameraWithFrame 
        sourceRef={sourceRef} 
        frameImage={Page1Images.paperCuttingFrame} 
      />

      {/* 4. UI layer - full screen, topmost */}
      <div className="fixed inset-0 pointer-events-none" style={{ zIndex: 20 }}>
        {/* Logo at the top */}
        <div className="absolute top-[12rem] left-1/2 transform -translate-x-1/2 pointer-events-auto">
          <img
            src={Page1Images.logo}
            alt="Logo"
            className="animate-fade-in"
            style={{ height: '150px', width: 'auto', maxWidth: 'none' }}
          />
        </div>

        {/* Main content area */}
        <div className="relative h-full pointer-events-none">
          {/* Fixed position text */}
          <div 
            className="absolute font-dabiaosong text-[#B80509] drop-shadow-lg text-center whitespace-nowrap"
            style={{ 
              fontSize: '70px',
              lineHeight: '1.2',
              bottom: '880px', // Fixed position from bottom
              left: '50%',
              transform: 'translateX(-50%)',
            }}
          >
            站入指定区域，进入画面中
            <br />
            开启纸间映像之旅吧
          </div>

          {/* Adjustable position image */}
          <div 
            className="absolute"
            style={{
              bottom: '520px', // Adjustable position from bottom (26rem = 416px)
              left: '50%',
              transform: 'translateX(-50%)',
            }}
          >
            <img
              src={Page1Images.footprints}
              alt="Footprints"
              className="w-[458px] h-auto"
            />
          </div>
        </div>

        {/* Bottom frame */}
        <div className="absolute bottom-0 left-0 right-0">
          <img
            src={Page1Images.bottomFrame}
            alt="Bottom Frame"
            className="w-full h-auto"
          />
        </div>
      </div>
    </>
  );
};

export default Page1Scan;
