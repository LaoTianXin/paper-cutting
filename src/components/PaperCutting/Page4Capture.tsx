import React, { useState, useEffect } from "react";
import PageContainer from "./PageContainer";
import CameraWithFrame from "./CameraWithFrame";
import { Page4Images } from "../../constants/images";
import type { PageProps } from "../../types/paperCutting";

/**
 * Page 4: Photo Capture Stage
 * Displays during photo capture with shutter animation
 * Shows sequential shutter effects
 */
const Page4Capture: React.FC<PageProps & { sourceRef: React.RefObject<HTMLCanvasElement | null> }> = ({ sourceRef }) => {
  const [shutterIndex, setShutterIndex] = useState(0);
  const [showFlash, setShowFlash] = useState(false);

  useEffect(() => {
    // Cycle through shutter effects
    const interval = setInterval(() => {
      setShutterIndex((prev) => {
        if (prev >= Page4Images.shutterEffects.length - 1) {
          setShowFlash(true);
          return prev;
        }
        return prev + 1;
      });
    }, 150);

    return () => clearInterval(interval);
  }, []);

  return (
    <PageContainer transparent={true}>
      {/* Camera and Frame layer */}
      <CameraWithFrame 
        sourceRef={sourceRef} 
        frameImage={Page4Images.frame} 
      />

      {/* Flash effect */}
      {showFlash && (
        <div className="absolute inset-0 bg-white z-50 animate-fade-out" />
      )}

      {/* Logo at the top */}
      <div className="absolute top-[12rem] left-1/2 transform -translate-x-1/2 z-30">
        <img
          src={Page4Images.logo}
          alt="Logo"
          className="animate-fade-in"
          style={{ height: '150px', width: 'auto', maxWidth: 'none' }}
        />
      </div>

      {/* Shutter effect overlay */}
      <div className="absolute inset-0 flex items-center justify-center z-40 pointer-events-none">
        <img
          src={Page4Images.shutterEffects[shutterIndex]}
          alt="Shutter Effect"
          className="w-full h-full object-contain"
          style={{ opacity: 0.9 }}
        />
      </div>

      {/* Capturing text */}
      <div className="absolute bottom-32 left-1/2 transform -translate-x-1/2 z-40">
        <div className="font-dabiaosong text-white text-3xl font-bold animate-pulse-slow"
          style={{
            textShadow: "0 0 20px rgba(0, 0, 0, 0.8)",
          }}
        >
          拍照中...
        </div>
      </div>
    </PageContainer>
  );
};

export default Page4Capture;
