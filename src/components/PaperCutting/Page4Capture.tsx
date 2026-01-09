import React, { useState, useEffect, useCallback } from "react";
import { Page4Images, StandbyPaperCuttingImages } from "../../constants/images";

/**
 * Page 4: Photo Capture Stage
 * Displays during AI image generation with paper-cutting artwork slideshow
 */
const Page4Capture: React.FC = () => {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isVisible, setIsVisible] = useState(true);

  // Transition duration for fade effects (ms)
  const FADE_DURATION = 1000;
  // Display duration for each image (ms)
  const DISPLAY_DURATION = 10000;

  const transitionToNextImage = useCallback(() => {
    // Start fade out
    setIsVisible(false);

    // After fade out completes, switch image and fade in
    setTimeout(() => {
      setCurrentImageIndex((prev) =>
        (prev + 1) % StandbyPaperCuttingImages.length
      );
      setIsVisible(true);
    }, FADE_DURATION);
  }, []);

  useEffect(() => {
    // Set up interval for image transitions
    const intervalId = setInterval(() => {
      transitionToNextImage();
    }, DISPLAY_DURATION);

    return () => clearInterval(intervalId);
  }, [transitionToNextImage]);

  return (
    <>
      {/* Decorative frame overlay */}
      <div className="fixed inset-0" style={{ zIndex: 5 }}>
        <img
          src={Page4Images.background}
          alt="background"
          className="w-full h-full object-cover"
        />
      </div>

      <div className="fixed inset-0" style={{ zIndex: 6 }}>
        <img
          src={Page4Images.shutterEffects[1]}
          alt="background"
          className="w-full h-full object-cover"
        />
      </div>

      {/* Logo at the top */}
      <div className="fixed top-[3.2rem] left-1/2 transform -translate-x-1/2" style={{ zIndex: 30 }}>
        <img
          src={Page4Images.logo}
          alt="Logo"
          style={{ height: '60px', width: 'auto', maxWidth: 'none' }}
        />
      </div>

      {/* Paper-Cutting Artwork Slideshow - Displayed in front of UI */}
      <div
        className="fixed inset-0 top-[285px] flex  justify-center"
        style={{ zIndex: 50, marginTop: '-80px' }}
      >
        {/* Container for frame and artwork */}
        <div
          className="relative flex items-end justify-center pb-3"
          style={{
            width: '414px',
            height: '636px',
          }}
        >
          {/* Frame background - shutter-effect-4 */}
          <img
            src={Page4Images.shutterEffects[3]}
            alt="frame"
            className="absolute inset-0 w-full h-full object-contain"
            style={{ zIndex: 1 }}
          />

          {/* Paper-cutting artwork image inside the frame */}
          <div
            className="relative flex items-center justify-center"
            style={{
              width: '438px',
              transition: `opacity ${FADE_DURATION}ms ease-in-out`,
              opacity: isVisible ? 1 : 0,
              zIndex: 2,
            }}
          >
            <img
              src={StandbyPaperCuttingImages[currentImageIndex]}
              alt={`正定剪纸作品 ${currentImageIndex + 1}`}
              className="w-full h-auto object-contain"
              style={{
                filter: 'drop-shadow(0 4px 20px rgba(0, 0, 0, 0.15))',
              }}
            />
          </div>
        </div>
      </div>

      {/* Generating text with pulsing animation */}
      <div className="fixed bottom-[17rem] left-1/2 transform -translate-x-1/2" style={{ zIndex: 60 }}>
        <div
          className="font-dabiaosong flex flex-col animate-pulse-slow"
          style={{
            fontSize: '28px',
            backgroundImage: `url(${Page4Images.shutterEffects[2]})`,
            width: "412px",
            height: "128px",
            backgroundSize: "cover",
            backgroundPosition: "center",
            justifyContent: "center",
            alignItems: "center",
            color: "#B80509"
          }}
        >
          <span>AI 剪纸风格生成中...</span>
          <span style={{ fontSize: '18px', marginTop: '8px', opacity: 0.8 }}>请耐心等待，约需数十秒</span>
        </div>
      </div>
    </>
  );
};

export default Page4Capture;
