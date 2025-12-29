import React from "react";
import PageContainer from "./PageContainer";
import CameraWithFrame from "./CameraWithFrame";
import { Page1Images } from "../../constants/images";
import type { PageProps } from "../../types/paperCutting";

/**
 * Page 1: Scan Start Stage
 * Displays when no person is detected yet
 * Shows footprint animation and waiting indicator
 */
const Page1Scan: React.FC<PageProps & { sourceRef: React.RefObject<HTMLCanvasElement | null> }> = ({ sourceRef }) => {
  return (
    <PageContainer backgroundImage={Page1Images.background}>
      {/* Camera with frame overlay */}
      <CameraWithFrame 
        sourceRef={sourceRef}
        frameImage={Page1Images.paperCuttingFrame}
      />

      {/* Logo at the top */}
      <div className="absolute top-8 left-1/2 transform -translate-x-1/2 z-20">
        <img
          src={Page1Images.logo}
          alt="Logo"
          className="h-16 w-auto animate-fade-in"
        />
      </div>

      {/* Main content area */}
      <div className="flex flex-col items-center justify-end flex-1 z-10 pb-32">
        {/* Footprints animation */}
        <div className="mb-8 animate-bounce-slow">
          <img
            src={Page1Images.footprints}
            alt="Footprints"
            className="w-24 h-auto"
          />
        </div>

        {/* Waiting text */}
        <div className="font-dabiaosong text-white text-2xl font-bold mb-2 drop-shadow-lg">
          请站在镜头前
        </div>
        <div className="font-dabiaosong text-white text-lg opacity-90">
          扫描识别中...
        </div>
      </div>

      {/* Bottom frame */}
      <div className="absolute bottom-0 left-0 right-0 z-10">
        <img
          src={Page1Images.bottomFrame}
          alt="Bottom Frame"
          className="w-full h-auto"
        />
      </div>
    </PageContainer>
  );
};

export default Page1Scan;
