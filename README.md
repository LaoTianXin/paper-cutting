# 🎭 OpenCV Demo - AI 视觉检测平台

一个基于 React + TypeScript + OpenCV.js + MediaPipe 的综合性视觉检测演示平台。

## ✨ 功能特性

### 1. 📹 人脸识别
- 实时摄像头人脸检测（Haar Cascade）
- 支持图片上传检测
- 支持视频文件检测
- FPS 实时显示

### 2. 👌 OK 手势识别
- 基于 MediaPipe Hands 的手势识别
- 实时检测 OK 手势
- 置信度显示
- 支持视频文件检测

### 3. 🚶 全身检测
- 基于 Haar Cascade 的全身检测
- 视频文件批量检测
- 检测统计信息

### 4. ✂️ 人物抠图
- 自动全身检测和抠图
- 支持单人/多人场景
- 一键下载透明背景图
- 显示检测信息（位置、尺寸）

### 5. 📸 智能拍照系统（新功能）
这是一个整合了全身识别、手势识别和自动拍照的完整解决方案：

#### 工作流程：
1. **全身识别**：检测并确认只有一人在画面中（持续 1 秒）
2. **手势确认**：检测 OK 手势（保持 3 秒）
3. **倒计时**：5 秒倒计时准备拍照
4. **自动拍照**：截取全身照片并放大显示

#### 特点：
- ✅ 智能状态机管理
- ✅ 多重安全检测
- ✅ 自动重置机制（超过 1 秒未检测到全身）
- ✅ 实时状态提示
- ✅ 照片下载功能
- ✅ 精准截图和放大

详细使用说明请查看：[智能拍照系统使用指南](./INTEGRATED_CAPTURE_GUIDE.md)

## 🚀 快速开始

### 环境要求
- Node.js 16+
- pnpm（推荐）或 npm

### 安装依赖
```bash
pnpm install
# 或
npm install
```

### 开发模式
```bash
pnpm dev
# 或
npm run dev
```

访问 http://localhost:5173

### 构建生产版本
```bash
pnpm build
# 或
npm run build
```

### 预览生产版本
```bash
pnpm preview
# 或
npm run preview
```

## 📚 技术栈

### 核心技术
- **React 18**: UI 框架
- **TypeScript**: 类型安全
- **Vite**: 构建工具
- **OpenCV.js**: 计算机视觉（人脸检测、全身检测）
- **MediaPipe**: 手势识别
- **Canvas API**: 图像处理和渲染

### 主要库
- `@techstark/opencv-js`: OpenCV.js 的 npm 包装
- `@mediapipe/hands`: MediaPipe 手部检测
- `@mediapipe/camera_utils`: MediaPipe 摄像头工具
- `@mediapipe/drawing_utils`: MediaPipe 绘图工具
- `react-webcam`: React 摄像头组件

## 📖 文档

- [完整使用指南](./COMPLETE_GUIDE.md)
- [人物抠图指南](./EXTRACT_GUIDE.md)
- [全身检测指南](./FULLBODY_DETECTION_GUIDE.md)
- [手势识别指南](./GESTURE_RECOGNITION_GUIDE.md)
- [OK手势检测指南](./OK_GESTURE_GUIDE.md)
- [智能拍照系统指南](./INTEGRATED_CAPTURE_GUIDE.md) ⭐新增
- [常见问题](./USAGE_GUIDE.md)

## 🎯 应用场景

### 人脸识别
- 人脸考勤系统
- 人脸门禁系统
- 视频会议人脸标注

### 手势识别
- 无接触交互界面
- 手势控制游戏
- 远程操控系统

### 全身检测
- 智能监控系统
- 人流量统计
- 姿态分析

### 人物抠图
- 证件照制作
- 虚拟背景替换
- 电商产品图处理

### 智能拍照
- 自助拍照机
- 证件照采集系统
- 虚拟试衣间
- 体态评估应用
- 健身进度记录

## 🌐 浏览器兼容性

推荐使用现代浏览器：
- Chrome 90+
- Edge 90+
- Firefox 88+
- Safari 14+

需要支持：
- WebRTC（摄像头访问）
- WebAssembly（OpenCV.js）
- Canvas API
- ES6+

## 🔒 隐私说明

- ✅ 所有处理均在本地浏览器完成
- ✅ 不上传任何图像或视频数据
- ✅ 不存储个人信息
- ✅ 摄像头权限仅用于实时检测

## 📁 项目结构

```
opencv-demo/
├── public/
│   ├── models/                          # OpenCV 模型文件
│   │   ├── haarcascade_frontalface_default.xml
│   │   └── haarcascade_fullbody.xml
│   └── vite.svg
├── src/
│   ├── App.tsx                          # 主应用组件
│   ├── App.css
│   ├── index.css                        # 全局样式
│   ├── main.tsx                         # 入口文件
│   ├── opencv.d.ts                      # OpenCV 类型定义
│   ├── cvDataFile.ts                    # OpenCV 文件加载工具
│   ├── haarFaceDetection.ts            # 人脸检测逻辑
│   ├── fullBodyDetection.ts            # 全身检测逻辑
│   ├── ImageUpload.tsx                  # 图片上传组件
│   ├── VideoUpload.tsx                  # 视频上传（人脸）组件
│   ├── GestureDetection.tsx            # 手势识别组件
│   ├── GestureVideoUpload.tsx          # 手势视频检测组件
│   ├── FullBodyVideoUpload.tsx         # 全身视频检测组件
│   ├── FullBodyExtract.tsx             # 人物抠图组件
│   └── IntegratedPhotoCapture.tsx      # 智能拍照系统 ⭐新增
├── *.md                                 # 各种使用指南
├── package.json
├── tsconfig.json
├── vite.config.ts
└── README.md
```

## 🛠️ 开发说明

### 添加新功能
1. 在 `src/` 目录下创建新组件
2. 在 `App.tsx` 中注册新模式
3. 在 `index.css` 中添加样式
4. 创建相应的使用指南文档

### 性能优化建议
- 使用 `requestAnimationFrame` 控制帧率
- 及时释放 OpenCV Mat 对象（`.delete()`）
- 合理设置检测参数平衡准确度和性能
- 使用 React.memo 优化组件渲染

## 🐛 已知问题

1. 全身检测在复杂背景下可能不准确
2. 手势识别需要良好的光线条件
3. 移动端性能可能较低

## 📝 更新日志

### v2.0.0 (最新)
- ✨ 新增智能拍照系统
- ✅ 整合全身识别、手势识别和自动拍照
- ✅ 实现多阶段状态机管理
- ✅ 添加自动重置机制
- ✅ 优化用户界面和交互体验

### v1.0.0
- ✅ 实现人脸识别（摄像头、图片、视频）
- ✅ 实现 OK 手势识别（摄像头、视频）
- ✅ 实现全身检测（视频）
- ✅ 实现人物抠图功能
- ✅ 响应式设计

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

## 📄 License

MIT

## 🙏 致谢

- [OpenCV.js](https://docs.opencv.org/4.x/d5/d10/tutorial_js_root.html)
- [MediaPipe](https://google.github.io/mediapipe/)
- [React](https://react.dev/)
- [Vite](https://vitejs.dev/)

---

Made with ❤️ by OpenCV Demo Team
