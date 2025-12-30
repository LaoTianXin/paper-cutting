import React from "react";
import { Page1Images } from "../../constants/images";
import type { PageProps } from "../../types/paperCutting";

/**
 * Page 1: Scan Start Stage
 * Only renders UI decorations - camera is handled by PaperCuttingApp
 */
const Page1Scan: React.FC<PageProps> = () => {
  return (
    <>
      {/* Page-specific content only */}
      <div className="fixed inset-0 pointer-events-none" style={{ zIndex: 20 }}>
        {/* Main content area */}
        <div className="relative h-full pointer-events-none">
          {/* Fixed position text */}
          <div 
            className="absolute font-dabiaosong text-[#B80509] drop-shadow-lg text-center whitespace-nowrap"
            style={{ 
              fontSize: '36px',
              lineHeight: '1.2',
              bottom: '342px',
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
              bottom: '200px',
              left: '50%',
              transform: 'translateX(-50%)',
            }}
          >
            <img
              src={Page1Images.footprints}
              alt="Footprints"
              className="w-[180px] h-auto"
            />
          </div>
        </div>
      </div>
    </>
  );
};

export default Page1Scan;
