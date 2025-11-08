# 🎯 MediaPipe Pose 升级说明

## 📋 概述

已成功将全身检测功能从 **Haar Cascade** 升级到 **MediaPipe Pose**，提供更高精度的人体姿态检测。

## 🆕 新增功能

### 1. MediaPipe Pose 检测模块 (`src/poseDetection.ts`)

**核心功能：**
- ✅ 33个全身关键点检测（从头到脚）
- ✅ 3D 坐标支持（包含深度信息）
- ✅ 自动计算身体边界框
- ✅ 姿态验证（检查是否站立）
- ✅ 关键点可见度检测
- ✅ 智能边距计算（10% padding）

**主要 API：**

```typescript
// 初始化 Pose
await initializePose();

// 计算身体边界框
const rect = calculateBodyRect(poseLandmarks, width, height);

// 检查站立姿势
const standing = isStandingPose(poseLandmarks);
```

### 2. V2 智能拍照组件 (`src/IntegratedPhotoCaptureV2.tsx`)

**特点：**
- ✨ 使用 MediaPipe Pose 进行全身检测
- ✨ 实时显示 33 个骨骼关键点
- ✨ 更准确的边界框计算
- ✨ 保留原有 OK 手势识别
- ✨ 完整的拍照流程

**工作流程：**
1. **全身检测阶段**：使用 Pose 检测人体骨骼
2. **手势识别阶段**：使用 Hands 检测 OK 手势
3. **倒计时拍照**：5秒倒计时自动拍照
4. **图片保存**：截取全身区域并下载

## 🆚 技术对比

| 特性 | Haar Cascade (旧) | MediaPipe Pose (新) |
|------|------------------|-------------------|
| **检测方式** | 传统边缘检测 | 深度学习 AI |
| **精度** | 中等 | 非常高 |
| **关键点** | 无 | 33个3D点 |
| **姿态识别** | ❌ | ✅ |
| **多人支持** | 需手动筛选 | 自动选择最显眼 |
| **误检率** | 较高 | 很低 |
| **性能** | 快 | 稍慢但可接受 |
| **视觉反馈** | 矩形框 | 完整骨骼 |

## 📦 新增依赖

```json
{
  "@mediapipe/pose": "^0.5.1675469404"
}
```

## 🚀 使用方式

### 方法1：通过界面切换

1. 启动应用后，点击顶部绿色按钮：**"✨ 智能拍照V2 (Pose)"**
2. 站在摄像头前，保持全身可见
3. 当看到绿色骨骼线时，表示检测成功
4. 做出 OK 手势并保持 3 秒
5. 倒计时后自动拍照

### 方法2：直接导入组件

```typescript
import IntegratedPhotoCaptureV2 from "./IntegratedPhotoCaptureV2";

function App() {
  return <IntegratedPhotoCaptureV2 />;
}
```

## 🎨 视觉特效

### 全身检测阶段
- **绿色骨骼连线**：显示 33 个关键点连接
- **红色关键点**：标记重要身体节点
- **绿色边界框**：完整身体范围
- **实时提示**：当前检测状态

### 手势识别阶段
- **绿色手部连线**：手指骨骼
- **红色手部关键点**：21 个手部节点
- **OK 标识**：识别成功时显示 "OK 👌"
- **倒计时数字**：5秒倒计时

## 📊 检测参数配置

```typescript
// Pose 配置
pose.setOptions({
  modelComplexity: 1,        // 0:Lite, 1:Full, 2:Heavy
  smoothLandmarks: true,     // 平滑关键点
  enableSegmentation: false, // 关闭分割（性能优化）
  minDetectionConfidence: 0.5,
  minTrackingConfidence: 0.5,
});
```

## 🔧 自定义开发

### 访问关键点数据

```typescript
// 在 onPoseResults 回调中
const onPoseResults = (results) => {
  if (results.poseLandmarks) {
    // 访问特定关键点
    const nose = results.poseLandmarks[0];
    const leftShoulder = results.poseLandmarks[11];
    const rightShoulder = results.poseLandmarks[12];
    
    console.log('鼻子位置:', nose.x, nose.y, nose.z);
  }
};
```

### 关键点索引表

```
0: 鼻子
11, 12: 左右肩膀
13, 14: 左右手肘
15, 16: 左右手腕
23, 24: 左右髋部
25, 26: 左右膝盖
27, 28: 左右脚踝
... 共33个点
```

## 🎯 多人检测说明

**MediaPipe Pose 特性：**
- 单次检测会自动选择画面中最显眼的人
- 通常是离摄像头最近、姿态最完整的人
- 无需手动筛选，已内置优化

**如需真正多人同时检测：**
- 需要使用循环多次调用或使用其他方案
- 当前实现已满足"检测多人但选择最大者"的需求

## 📝 注意事项

1. **光照条件**：确保光线充足，避免强背光
2. **完整可见**：尽量保持全身在画面内
3. **姿势清晰**：站立姿势效果最佳
4. **距离适中**：距离摄像头 1.5-3 米为宜
5. **背景简洁**：避免复杂背景干扰

## 🐛 故障排查

### 问题：检测不到人体
- **检查**：是否全身在画面中
- **检查**：光线是否充足
- **解决**：调整站位或增加光照

### 问题：骨骼线抖动
- **原因**：关键点检测不稳定
- **解决**：保持静止，减少快速移动

### 问题：加载时间长
- **原因**：首次加载 MediaPipe 模型
- **说明**：正常现象，后续会缓存

## 📚 相关文档

- [MediaPipe Pose 官方文档](https://google.github.io/mediapipe/solutions/pose.html)
- [Pose Landmark 说明](https://google.github.io/mediapipe/solutions/pose#pose-landmark-model-blazepose-ghum-3d)

## 🎉 版本对比测试

可同时保留两个版本进行对比：

- **V1 (Haar Cascade)**：点击 "📸 智能拍照"
- **V2 (MediaPipe Pose)**：点击 "✨ 智能拍照V2 (Pose)"

建议优先使用 **V2 版本**，精度更高，用户体验更好。

---

**升级完成时间**: 2025-11-08  
**技术栈**: React + TypeScript + MediaPipe Pose + MediaPipe Hands



