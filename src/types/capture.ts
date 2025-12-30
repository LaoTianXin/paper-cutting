export const CaptureState = {
  IDLE: "idle",
  DETECTING_BODY: "detecting_body",
  BODY_DETECTED: "body_detected",
  DETECTING_GESTURE: "detecting_gesture",
  GESTURE_DETECTED: "gesture_detected",
  COUNTDOWN: "countdown",
  CAPTURING: "capturing", // 拍照中（显示快门效果）
  CAPTURE: "capture", // 执行实际截图
  COMPLETED: "completed",
} as const;

export type CaptureState = (typeof CaptureState)[keyof typeof CaptureState];
