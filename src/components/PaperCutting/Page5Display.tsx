import React, { useState, useEffect } from "react";
import PageContainer from "./PageContainer";
import { Page5Images } from "../../constants/images";
import type { PageProps } from "../../types/paperCutting";

/**
 * Page 5: Image Display Stage
 * Displays the captured photo with decorative frame
 * Allows user to download or restart
 */
const Page5Display: React.FC<PageProps> = ({ capturedImage, onPrevStage }) => {
  const [selectedDecoration, setSelectedDecoration] = useState(0);
  const [countdown, setCountdown] = useState(30);

  useEffect(() => {
    if (countdown <= 0) {
      if (onPrevStage) onPrevStage();
      return;
    }

    const timer = setInterval(() => {
      setCountdown((prev) => prev - 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [countdown, onPrevStage]);




  return (
    <PageContainer>
      {/* Container with background */}
      <div
        className="w-full h-full relative"
        style={{ backgroundImage: `url(${Page5Images.decorations[0]})`, backgroundSize: 'cover', backgroundPosition: 'center' }}
      >
        {/* Background Overlay Layer */}
        <div
          className="absolute inset-0 w-full h-[841px] flex justify-center items-center bg-no-repeat bg-center"
          style={{ backgroundImage: `url(${Page5Images.decorations[4]})`, backgroundSize: 'cover' }}
        >
          {/* Main Content Card */}
          <div
            className="w-[522px] h-[775px] z-20 pointer-events-none flex flex-col items-center px-[35px] bg-no-repeat bg-center"
            style={{ backgroundImage: `url(${Page5Images.decorations[2]})`, backgroundSize: 'cover' }}
          >
            <div className="mt-[40px] w-[442px]">
              <img src={Page5Images.maskGroup} alt="title" className="w-full h-auto" />
            </div>

            {/* Middle Image Area */}
            <div className="bg-gray-400 w-full h-[613px] mt-[12px] flex items-center justify-center relative">
              {capturedImage ? (
                <img
                  src={capturedImage}
                  alt="captured"
                  className="max-w-full max-h-full object-contain"
                />
              ) : (
                <div className="absolute inset-[6.5%] w-[87%] h-[87%] bg-gray-200 flex items-center justify-center text-gray-500">
                  暂无图片
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Bottom Interaction Area */}
        <div className="absolute bottom-[216px] left-1/2 -translate-x-1/2 flex flex-col items-center w-full">
          {/* Countdown UI */}
          <div className="mb-[-36px] flex items-center justify-center">
            <div className="rounded-full font-bold text-[#B80509]">
              <span className="text-[96px]">{countdown}</span>
              <span className="text-[24px]">秒</span>
            </div>
          </div>

          <div className="relative w-full flex justify-center">
            <div className="absolute top-1/2 -translate-y-[40%] right-[170px] z-10 text-[25px] font-dabiaosong text-[#B80509]">
              摆出图中手势，再次体验吧
            </div>
            <img src={Page5Images.decorations[3]} alt="Gesture Guide" className="w-[453px] h-auto" />
          </div>
        </div>

        {/* Global Ornament */}
        <div className="absolute top-0 left-0 right-0 z-0 pointer-events-none">
          <img src={Page5Images.ornament} alt="" className="w-full h-auto" />
        </div>

        {/* Global Bottom Frame */}
        <div className="absolute bottom-0 left-0 right-0 z-10 pointer-events-none">
          <img
            src={Page5Images.bottomFrame}
            alt="Bottom Frame"
            className="w-full h-auto"
          />
        </div>
      </div>
    </PageContainer>
  );
};

export default Page5Display;
