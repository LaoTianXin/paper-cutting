import React from "react";
import type { PageProps } from "../../types/paperCutting";

/**
 * Page 3: Countdown Stage  
 * Only renders UI decorations - camera is handled by PaperCuttingApp
 */
const Page3Countdown: React.FC<PageProps> = ({ detectionState }) => {
  const countdown = detectionState?.countdownValue ?? 3;

  return (
    <>
      {/* Page-specific content only */}
      <div className="fixed inset-0 pointer-events-none" style={{ zIndex: 20 }}>
        {/* Main content area - countdown overlay */}
        <div className="relative h-full pointer-events-none">
          {/* Countdown text - fixed position at top */}
          <div 
            className="absolute font-dabiaosong text-[#B80509] drop-shadow-lg text-center whitespace-nowrap"
            style={{ 
              fontSize: '36px',
              opacity: 0.9,
              bottom: '342px',
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
              bottom: '200px',
              left: '50%',
              transform: 'translateX(-50%)',
            }}
          >
            <div
              key={countdown}
              className="font-dabiaosong font-bold animate-countdown"
              style={{
                fontSize: '80px',
                color: '#B80509',
                width: '112px',
                height: '112px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: '3px solid #B80509',
                borderRadius: '50%',
                backgroundColor: 'rgba(255, 255, 255, 0.1)',
                backdropFilter: 'blur(10px)',
              }}
            >
              {countdown}
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default Page3Countdown;
