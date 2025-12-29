import React from "react";
import type { PageContainerProps } from "../../types/paperCutting";

/**
 * PageContainer - Main container component that maintains 9:20 aspect ratio
 * Handles responsive scaling and centers content on screen
 */
const PageContainer: React.FC<PageContainerProps & { transparent?: boolean }> = ({
  children,
  backgroundImage,
  className = "",
  transparent = false,
}) => {
  return (
    <div 
      className={`paper-cutting-container ${className}`}
      style={transparent ? { background: 'none', backgroundColor: 'transparent' } : {}}
    >
      <div className={`page-wrapper ${className}`}>
        {backgroundImage && (
          <div
            className="page-background"
            style={{ backgroundImage: `url(${backgroundImage})` }}
          />
        )}
        <div className="page-content">{children}</div>
      </div>
    </div>
  );
};

export default PageContainer;
