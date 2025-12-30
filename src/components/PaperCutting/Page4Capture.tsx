import React from "react";
import { Page4Images } from "../../constants/images";
import type { PageProps } from "../../types/paperCutting";

/**
 * Page 4: Photo Capture Stage
 * Displays during photo capture and AI image generation
 * Shows frame decoration, logo, and loading indicator
 */
const Page4Capture: React.FC<PageProps> = () => {
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

      {/* Generating text with pulsing animation */}
      <div className="fixed bottom-[18rem] left-1/2 transform -translate-x-1/2" style={{ zIndex: 40 }}>
        <div 
          className="font-dabiaosong flex  animate-pulse-slow"
          style={{
            fontSize: '28px',
            backgroundImage: `url(${Page4Images.shutterEffects[2]})`,
            width:"412px",
            height:"128px",
            backgroundSize:"cover",
            backgroundPosition:"center",
            justifyContent:"center",
            alignItems:"center",
            color:"#B80509"
          }}
        >
          正在进行裁剪，请耐心等待...
        </div>
      </div>
    </>
  );
};

export default Page4Capture;
