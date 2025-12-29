export const CaptureState = {
  IDLE: "idle",
  DETECTING_BODY: "detecting_body",
  BODY_DETECTED: "body_detected",
  DETECTING_GESTURE: "detecting_gesture",
  GESTURE_DETECTED: "gesture_detected",
  COUNTDOWN: "countdown",
  CAPTURE: "capture",
  COMPLETED: "completed",
} as const;

export type CaptureState = (typeof CaptureState)[keyof typeof CaptureState];
