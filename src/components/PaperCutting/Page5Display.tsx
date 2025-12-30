import React, { useState } from "react";
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

  const handleDownload = () => {
    if (!capturedImage) return;

    const link = document.createElement("a");
    link.href = capturedImage;
    link.download = `paper-cutting-photo-${Date.now()}.png`;
    link.click();
  };

  const handleRestart = () => {
    if (onPrevStage) {
      onPrevStage();
    }
  };

  return (
    <PageContainer>
      {/* Decorative background pattern */}
      <div className="absolute inset-0 bg-gradient-to-br from-red-50 via-orange-50 to-yellow-50" />

      {/* Main frame */}
      <div className="absolute inset-0 pointer-events-none z-10">
        <img
          src={Page5Images.frame}
          alt="Frame"
          className="w-full h-full object-cover"
        />
      </div>

      {/* Photo display area */}
      <div className="relative z-10 flex flex-col items-center justify-center h-full px-3 py-6">
        {/* Photo frame container */}
        <div className="relative mb-3 animate-slide-up">
          {/* Border and ornaments */}
          <div className="absolute inset-0 pointer-events-none z-20">
            <img
              src={Page5Images.border}
              alt="Border"
              className="w-full h-full object-contain"
            />
          </div>

          {/* Photo with frame */}
          <div className="relative bg-white p-2 rounded-lg shadow-2xl">
            <div
              className="relative bg-gray-200 overflow-hidden rounded"
              style={{ width: "150px", height: "200px" }}
            >
              {capturedImage ? (
                <img
                  src={capturedImage}
                  alt="Captured"
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-400">
                  No Image
                </div>
              )}
            </div>

            {/* Selected decoration overlay */}
            {Page5Images.decorations[selectedDecoration] && (
              <div className="absolute top-1 right-1 w-8 h-8">
                <img
                  src={Page5Images.decorations[selectedDecoration]}
                  alt="Decoration"
                  className="w-full h-full object-contain"
                />
              </div>
            )}
          </div>
        </div>

        {/* Decoration selector */}
        <div className="flex gap-1.5 mb-3 z-20">
          {Page5Images.decorations.slice(0, 4).map((decoration, index) => (
            <button
              key={index}
              onClick={() => setSelectedDecoration(index)}
              className={`w-6 h-6 rounded-lg border-2 transition-all ${
                selectedDecoration === index
                  ? "border-red-500 scale-110 shadow-lg"
                  : "border-gray-300 hover:border-red-300"
              }`}
            >
              <img
                src={decoration}
                alt={`Decoration ${index + 1}`}
                className="w-full h-full object-contain p-1"
              />
            </button>
          ))}
        </div>

        {/* Action buttons */}
        <div className="flex gap-4 z-20">
          <button
            onClick={handleDownload}
            className="px-4 py-1.5 bg-gradient-to-r from-green-500 to-green-600 text-white font-dabiaosong text-base font-bold rounded-full shadow-lg hover:shadow-xl hover:scale-105 transition-all"
          >
            保存照片
          </button>
          <button
            onClick={handleRestart}
            className="px-4 py-1.5 bg-gradient-to-r from-blue-500 to-blue-600 text-white font-dabiaosong text-base font-bold rounded-full shadow-lg hover:shadow-xl hover:scale-105 transition-all"
          >
            重新拍摄
          </button>
        </div>
      </div>

      {/* Bottom frame */}
      <div className="absolute bottom-0 left-0 right-0 z-10">
        <img
          src={Page5Images.bottomFrame}
          alt="Bottom Frame"
          className="w-full h-auto"
        />
      </div>
    </PageContainer>
  );
};

export default Page5Display;
