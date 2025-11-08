/**
 * 禁用 MediaPipe 的 WebGL 和内部日志
 * MediaPipe 会输出大量的 WebGL 初始化日志，这些日志对用户无用
 */

// 保存原始的 console 方法
const originalConsoleLog = console.log;
const originalConsoleInfo = console.info;
const originalConsoleWarn = console.warn;

// MediaPipe 日志的特征关键词
const MEDIAPIPE_LOG_PATTERNS = [
  "gl_context",
  "I0000",
  "W0000",
  "GL version",
  "OpenGL",
  "WebGL context",
  "Successfully created",
];

// 检查是否是 MediaPipe 日志
function isMediaPipeLog(message: unknown): boolean {
  if (typeof message !== "string") return false;
  return MEDIAPIPE_LOG_PATTERNS.some((pattern) => message.includes(pattern));
}

// 过滤后的 console.log
console.log = function (...args: unknown[]) {
  if (args.length > 0 && isMediaPipeLog(args[0])) {
    return; // 静默 MediaPipe 日志
  }
  originalConsoleLog.apply(console, args);
};

// 过滤后的 console.info
console.info = function (...args: unknown[]) {
  if (args.length > 0 && isMediaPipeLog(args[0])) {
    return; // 静默 MediaPipe 日志
  }
  originalConsoleInfo.apply(console, args);
};

// 过滤后的 console.warn
console.warn = function (...args: unknown[]) {
  if (args.length > 0 && isMediaPipeLog(args[0])) {
    return; // 静默 MediaPipe 日志
  }
  originalConsoleWarn.apply(console, args);
};

// 恢复原始 console 方法的函数（如果需要调试）
export function restoreConsole(): void {
  console.log = originalConsoleLog;
  console.info = originalConsoleInfo;
  console.warn = originalConsoleWarn;
}

// 默认导出，可以在应用启动时导入
export default function suppressMediaPipeLogs(): void {
  console.log("✅ MediaPipe 日志已被静默");
}


