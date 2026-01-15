// Page stages in the Paper-Cutting UI flow
export const PageStage = {
  SCAN_START: "SCAN_START", // Page 1: Waiting for person detection
  GESTURE_COMPARISON: "GESTURE_COMPARISON", // Page 2: Person detected, waiting for gesture
 COUNTDOWN: "COUNTDOWN", // Page 3: Gesture detected, counting down
  PHOTO_CAPTURE: "PHOTO_CAPTURE", // Page 4: Taking photo with shutter effect
  IMAGE_DISPLAY: "IMAGE_DISPLAY", // Page 5: Displaying captured photo
} as const;

export type PageStage = typeof PageStage[keyof typeof PageStage];


// Detection states for pose and gesture
export interface DetectionState {
  personDetected: boolean;
  gestureDetected: boolean;
  gestureConfidence: number;
  gestureProgress: number; // 0-1, time-based progress for gesture hold (3s to reach 1)
  countdownValue: number;
}

// Props for page container
export interface PageContainerProps {
  children: React.ReactNode;
  backgroundImage?: string;
  className?: string;
}

// Props for individual page components
export interface PageProps {
  onNextStage?: () => void;
  onPrevStage?: () => void;
  detectionState?: DetectionState;
  capturedImage?: string;
  // AI generation props (for Page5)
  aiGeneratedImage?: string;
  isGenerating?: boolean;
  generationError?: string;
}

// Common navigation props
export interface NavigationProps {
  currentStage: PageStage;
  onStageChange: (stage: PageStage) => void;
}

// Gesture types
export type GestureType = "ok" | "thumbsup" | "victory" | "none";

// Camera feed props
export interface CameraFeedProps {
  videoRef: React.RefObject<HTMLVideoElement>;
  canvasRef: React.RefObject<HTMLCanvasElement>;
  width?: number;
  height?: number;
}
