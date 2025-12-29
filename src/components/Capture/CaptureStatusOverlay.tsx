import React from "react";
import { CaptureState } from "../../types/capture";

interface CaptureStatusOverlayProps {
  state: CaptureState;
  statusMessage: string;
}

export const CaptureStatusOverlay: React.FC<CaptureStatusOverlayProps> = ({ state, statusMessage }) => {
  return (
    <>
      <div className="status-panel">
        <h3>📊 状态信息</h3>
        <div className="status-item">
          <span className="status-label">当前阶段：</span>
          <span className={`status-value state-${state}`}>
            {state === CaptureState.IDLE && "等待开始"}
            {state === CaptureState.DETECTING_BODY && "检测全身中（Pose）"}
            {state === CaptureState.BODY_DETECTED && "已识别全身"}
            {state === CaptureState.DETECTING_GESTURE && "等待手势"}
            {state === CaptureState.GESTURE_DETECTED && "检测到OK手势"}
            {state === CaptureState.COUNTDOWN && "倒计时中"}
            {state === CaptureState.CAPTURE && "正在拍照"}
            {state === CaptureState.COMPLETED && "拍照完成"}
          </span>
        </div>
        {statusMessage && (
          <div className="status-item">
            <span className="status-label">实时提示：</span>
            <span className="status-value hint-text">{statusMessage}</span>
          </div>
        )}
      </div>

      <div className="instructions">
        <h3>📝 使用流程</h3>
        <div className="instruction-steps">
          <div className={`step ${state === CaptureState.DETECTING_BODY || state === CaptureState.BODY_DETECTED ? "active" : ""} ${state !== CaptureState.IDLE && state !== CaptureState.DETECTING_BODY && state !== CaptureState.BODY_DETECTED ? "completed" : ""}`}>
            <span className="step-number">1</span>
            <div className="step-content">
              <h4>全身识别（MediaPipe Pose）</h4>
              <p>站在摄像头前，保持完整身体在画面中，持续1秒</p>
              <p className="step-note">✨ 使用AI骨骼检测，可看到33个关键点</p>
            </div>
          </div>

          <div className={`step ${state === CaptureState.DETECTING_GESTURE || state === CaptureState.GESTURE_DETECTED ? "active" : ""} ${state !== CaptureState.IDLE && state !== CaptureState.DETECTING_BODY && state !== CaptureState.BODY_DETECTED && state !== CaptureState.DETECTING_GESTURE && state !== CaptureState.GESTURE_DETECTED ? "completed" : ""}`}>
            <span className="step-number">2</span>
            <div className="step-content">
              <h4>OK手势</h4>
              <p>做出OK手势（大拇指和食指形成圆圈，其他手指伸直）</p>
              <p className="step-note">⚠️ 需要保持3秒</p>
            </div>
          </div>

          <div className={`step ${state === CaptureState.COUNTDOWN ? "active" : ""} ${state === CaptureState.CAPTURE || state === CaptureState.COMPLETED ? "completed" : ""}`}>
            <span className="step-number">3</span>
            <div className="step-content">
              <h4>倒计时拍照</h4>
              <p>5秒倒计时后自动拍照</p>
              <p className="step-note">💡 保持姿势和位置</p>
            </div>
          </div>

          <div className={`step ${state === CaptureState.COMPLETED ? "active completed" : ""}`}>
            <span className="step-number">4</span>
            <div className="step-content">
              <h4>完成</h4>
              <p>查看和下载照片</p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};
