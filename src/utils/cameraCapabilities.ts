/**
 * 摄像头能力检测工具
 * 用于获取摄像头支持的分辨率范围
 */

export interface CameraCapabilities {
  deviceId: string;
  label: string;
  minWidth: number;
  maxWidth: number;
  minHeight: number;
  maxHeight: number;
  supportedResolutions: Array<{ width: number; height: number; label: string }>;
}

/**
 * 常见分辨率预设
 */
const COMMON_RESOLUTIONS = [
  { width: 640, height: 480, label: '640×480 (VGA)' },
  { width: 1280, height: 720, label: '1280×720 (HD)' },
  { width: 1280, height: 960, label: '1280×960 (4:3 HD)' },
  { width: 1920, height: 1080, label: '1920×1080 (Full HD)' },
  { width: 1920, height: 1440, label: '1920×1440 (4:3 Full HD)' },
];

/**
 * 获取摄像头支持的能力（分辨率范围）
 */
export async function getCameraCapabilities(): Promise<CameraCapabilities | null> {
  try {
    // 先获取摄像头权限和设备信息
    const stream = await navigator.mediaDevices.getUserMedia({ 
      video: true 
    });
    
    const videoTrack = stream.getVideoTracks()[0];
    const capabilities = videoTrack.getCapabilities?.();
    const settings = videoTrack.getSettings();
    
    // 停止临时流
    stream.getTracks().forEach(track => track.stop());
    
    if (!capabilities) {
      console.warn('浏览器不支持获取摄像头能力信息');
      return null;
    }

    const result: CameraCapabilities = {
      deviceId: capabilities.deviceId || settings.deviceId || 'unknown',
      label: videoTrack.label || '未知摄像头',
      minWidth: capabilities.width?.min || 320,
      maxWidth: capabilities.width?.max || 1920,
      minHeight: capabilities.height?.min || 240,
      maxHeight: capabilities.height?.max || 1080,
      supportedResolutions: [],
    };

    // 检测哪些常见分辨率在支持范围内
    for (const res of COMMON_RESOLUTIONS) {
      if (res.width >= result.minWidth && res.width <= result.maxWidth &&
          res.height >= result.minHeight && res.height <= result.maxHeight) {
        result.supportedResolutions.push(res);
      }
    }

    console.log('📹 摄像头能力:', result);
    return result;
  } catch (error) {
    console.error('获取摄像头能力失败:', error);
    return null;
  }
}

/**
 * 使用实际约束测试特定分辨率是否被支持
 */
export async function testResolution(width: number, height: number): Promise<boolean> {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: {
        width: { exact: width },
        height: { exact: height }
      }
    });
    
    const videoTrack = stream.getVideoTracks()[0];
    const settings = videoTrack.getSettings();
    
    stream.getTracks().forEach(track => track.stop());
    
    return settings.width === width && settings.height === height;
  } catch {
    return false;
  }
}
