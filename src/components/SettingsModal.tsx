import React, { useState, useEffect } from 'react';
import { useSettings, DEFAULT_SETTINGS, type Settings } from '../contexts/SettingsContext';

interface SettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export default function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
    const { settings, updateSettings, fps, cameraCapabilities } = useSettings();
    const [localSettings, setLocalSettings] = useState<Settings>(settings);

    // Sync local settings when modal opens
    useEffect(() => {
        if (isOpen) {
            setLocalSettings(settings);
        }
    }, [isOpen, settings]);

    // Handle ESC key to close
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && isOpen) {
                onClose();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    const handleLocalChange = (partial: Partial<Settings>) => {
        setLocalSettings(prev => ({ ...prev, ...partial }));
    };

    const handleSave = () => {
        updateSettings(localSettings);
        onClose();
        // 刷新页面使设置生效
        window.location.reload();
    };

    const handleResetToDefaults = () => {
        setLocalSettings(DEFAULT_SETTINGS);
    };

    const handleVideoPresetChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const value = e.target.value;
        const [widthStr, heightStr] = value.split('x');
        const width = parseInt(widthStr, 10);
        const height = parseInt(heightStr, 10);
        if (!isNaN(width) && !isNaN(height)) {
            handleLocalChange({ videoWidth: width, videoHeight: height });
        }
    };

    const currentVideoPreset = `${localSettings.videoWidth}x${localSettings.videoHeight}`;

    return (
        <div
            className="fixed inset-0 flex items-center justify-center"
            style={{ zIndex: 9999, backgroundColor: 'rgba(0, 0, 0, 0.7)' }}
            onClick={onClose}
        >
            <div
                className="bg-white rounded-2xl shadow-2xl overflow-hidden"
                style={{ width: '600px', maxHeight: '90vh' }}
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="bg-gradient-to-r from-red-600 to-red-700 text-white p-6 flex justify-between items-center">
                    <h2 className="text-2xl font-bold">⚙️ 设置</h2>
                    <div className="flex items-center gap-4">
                        {localSettings.debugMode && (
                            <span className="bg-white/20 px-3 py-1 rounded-full text-sm">
                                FPS: {fps}
                            </span>
                        )}
                        <button
                            onClick={onClose}
                            className="text-white/80 hover:text-white text-3xl leading-none"
                        >
                            ×
                        </button>
                    </div>
                </div>

                {/* Content */}
                <div className="p-6 overflow-y-auto" style={{ maxHeight: 'calc(90vh - 180px)' }}>
                    {/* 视频分辨率 */}
                    <section className="mb-6">
                        <h3 className="text-lg font-bold text-gray-800 mb-3 flex items-center gap-2">
                            📹 视频分辨率
                        </h3>
                        {cameraCapabilities && (
                            <div className="mb-3 p-3 bg-blue-50 rounded-lg text-sm">
                                <div className="font-medium text-blue-800">🎥 {cameraCapabilities.label}</div>
                                <div className="text-blue-600">
                                    最大支持: {cameraCapabilities.maxWidth}×{cameraCapabilities.maxHeight}
                                </div>
                            </div>
                        )}
                        <select
                            value={currentVideoPreset}
                            onChange={handleVideoPresetChange}
                            className="w-full p-3 border border-gray-300 rounded-lg text-base focus:ring-2 focus:ring-red-500 focus:border-red-500"
                        >
                            {/* 根据摄像头能力动态生成分辨率选项 */}
                            {(() => {
                                // 基础分辨率列表
                                const baseResolutions = [
                                    { width: 640, height: 480, label: '640×480 (VGA)' },
                                    { width: 1280, height: 720, label: '1280×720 (HD)' },
                                    { width: 1280, height: 960, label: '1280×960 (4:3 HD)' },
                                    { width: 1920, height: 1080, label: '1920×1080 (Full HD)' },
                                    { width: 2560, height: 1440, label: '2560×1440 (2K)' },
                                    { width: 3840, height: 2160, label: '3840×2160 (4K)' },
                                ];

                                // 根据摄像头能力过滤
                                let resolutions = baseResolutions.filter(r =>
                                    !cameraCapabilities || (
                                        r.width <= cameraCapabilities.maxWidth &&
                                        r.height <= cameraCapabilities.maxHeight
                                    )
                                );

                                // 如果摄像头最大分辨率不在列表中，添加它
                                if (cameraCapabilities &&
                                    !resolutions.some(r => r.width === cameraCapabilities.maxWidth && r.height === cameraCapabilities.maxHeight)) {
                                    resolutions.push({
                                        width: cameraCapabilities.maxWidth,
                                        height: cameraCapabilities.maxHeight,
                                        label: `${cameraCapabilities.maxWidth}×${cameraCapabilities.maxHeight} (最高)`
                                    });
                                }

                                // 按分辨率排序
                                resolutions.sort((a, b) => (a.width * a.height) - (b.width * b.height));

                                return resolutions.map(r => (
                                    <option key={`${r.width}x${r.height}`} value={`${r.width}x${r.height}`}>
                                        {r.label}
                                    </option>
                                ));
                            })()}
                        </select>
                        <p className="text-sm text-gray-500 mt-2">
                            根据摄像头能力动态生成选项
                        </p>
                    </section>

                    {/* 身体检测参数 */}
                    <section className="mb-6">
                        <h3 className="text-lg font-bold text-gray-800 mb-3 flex items-center gap-2">
                            🧍 身体检测参数
                        </h3>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    模型复杂度: {localSettings.poseModelComplexity}
                                </label>
                                <input
                                    type="range"
                                    min="0"
                                    max="2"
                                    value={localSettings.poseModelComplexity}
                                    onChange={e => handleLocalChange({ poseModelComplexity: Number(e.target.value) as 0 | 1 | 2 })}
                                    className="w-full h-2 bg-gray-200 rounded-lg cursor-pointer accent-red-600"
                                />
                                <div className="flex justify-between text-xs text-gray-500">
                                    <span>轻量 (0)</span>
                                    <span>标准 (1)</span>
                                    <span>高精度 (2)</span>
                                </div>
                                <p className="text-xs text-gray-500 mt-1">
                                    越高精度越好，但计算消耗越大，可能导致卡顿。推荐使用 Lite 或 Full。
                                </p>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    检测置信度: {localSettings.poseMinDetectionConfidence.toFixed(2)}
                                </label>
                                <input
                                    type="range"
                                    min="0.1"
                                    max="1"
                                    step="0.05"
                                    value={localSettings.poseMinDetectionConfidence}
                                    onChange={e => handleLocalChange({ poseMinDetectionConfidence: Number(e.target.value) })}
                                    className="w-full h-2 bg-gray-200 rounded-lg cursor-pointer accent-red-600"
                                />
                                <p className="text-xs text-gray-500 mt-1">
                                    首次检测到人体的灵敏度。过高难识别，过低易误识别背景物体。
                                </p>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    跟踪置信度: {localSettings.poseMinTrackingConfidence.toFixed(2)}
                                </label>
                                <input
                                    type="range"
                                    min="0.1"
                                    max="1"
                                    step="0.05"
                                    value={localSettings.poseMinTrackingConfidence}
                                    onChange={e => handleLocalChange({ poseMinTrackingConfidence: Number(e.target.value) })}
                                    className="w-full h-2 bg-gray-200 rounded-lg cursor-pointer accent-red-600"
                                />
                                <p className="text-xs text-gray-500 mt-1">
                                    持续追踪的稳定性。过高身体易丢失，过低关键点易抖动。
                                </p>
                            </div>
                        </div>
                    </section>

                    {/* 手势检测参数 */}
                    <section className="mb-6">
                        <h3 className="text-lg font-bold text-gray-800 mb-3 flex items-center gap-2">
                            ✋ 手势检测参数
                        </h3>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    最大识别手数: {localSettings.handsMaxNum}
                                </label>
                                <input
                                    type="range"
                                    min="1"
                                    max="4"
                                    value={localSettings.handsMaxNum}
                                    onChange={e => handleLocalChange({ handsMaxNum: Number(e.target.value) })}
                                    className="w-full h-2 bg-gray-200 rounded-lg cursor-pointer accent-red-600"
                                />
                                <p className="text-xs text-gray-500 mt-1">
                                    画面中同时识别的手的最大数量。数量越多计算量越大。
                                </p>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    模型复杂度: {localSettings.handsModelComplexity}
                                </label>
                                <input
                                    type="range"
                                    min="0"
                                    max="1"
                                    value={localSettings.handsModelComplexity}
                                    onChange={e => handleLocalChange({ handsModelComplexity: Number(e.target.value) as 0 | 1 })}
                                    className="w-full h-2 bg-gray-200 rounded-lg cursor-pointer accent-red-600"
                                />
                                <div className="flex justify-between text-xs text-gray-500">
                                    <span>轻量 (0)</span>
                                    <span>标准 (1)</span>
                                </div>
                                <p className="text-xs text-gray-500 mt-1">
                                    越高精度越好，但计算消耗越大。
                                </p>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    检测置信度: {localSettings.handsMinDetectionConfidence.toFixed(2)}
                                </label>
                                <input
                                    type="range"
                                    min="0.1"
                                    max="1"
                                    step="0.05"
                                    value={localSettings.handsMinDetectionConfidence}
                                    onChange={e => handleLocalChange({ handsMinDetectionConfidence: Number(e.target.value) })}
                                    className="w-full h-2 bg-gray-200 rounded-lg cursor-pointer accent-red-600"
                                />
                                <p className="text-xs text-gray-500 mt-1">
                                    首次检测到手势的灵敏度。
                                </p>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    跟踪置信度: {localSettings.handsMinTrackingConfidence.toFixed(2)}
                                </label>
                                <input
                                    type="range"
                                    min="0.1"
                                    max="1"
                                    step="0.05"
                                    value={localSettings.handsMinTrackingConfidence}
                                    onChange={e => handleLocalChange({ handsMinTrackingConfidence: Number(e.target.value) })}
                                    className="w-full h-2 bg-gray-200 rounded-lg cursor-pointer accent-red-600"
                                />
                                <p className="text-xs text-gray-500 mt-1">
                                    持续追踪手势的稳定性。提高此值可减少误触。
                                </p>
                            </div>
                        </div>
                    </section>

                    {/* OK手势识别参数 */}
                    <section className="mb-6">
                        <h3 className="text-lg font-bold text-gray-800 mb-3 flex items-center gap-2">
                            👌 OK 手势识别参数
                        </h3>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    圆圈判定阈值: {localSettings.gestureCircleThreshold.toFixed(2)}
                                </label>
                                <input
                                    type="range"
                                    min="0.05"
                                    max="0.3"
                                    step="0.01"
                                    value={localSettings.gestureCircleThreshold}
                                    onChange={e => handleLocalChange({ gestureCircleThreshold: Number(e.target.value) })}
                                    className="w-full h-2 bg-gray-200 rounded-lg cursor-pointer accent-red-600"
                                />
                                <p className="text-xs text-gray-500 mt-1">
                                    允许的圆圈最大开口比例。值越大越容易识别圆圈，但易误判。
                                </p>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    手指伸直阈值: {localSettings.gestureFingerExtendThreshold.toFixed(2)}
                                </label>
                                <input
                                    type="range"
                                    min="0.2"
                                    max="0.8"
                                    step="0.05"
                                    value={localSettings.gestureFingerExtendThreshold}
                                    onChange={e => handleLocalChange({ gestureFingerExtendThreshold: Number(e.target.value) })}
                                    className="w-full h-2 bg-gray-200 rounded-lg cursor-pointer accent-red-600"
                                />
                                <p className="text-xs text-gray-500 mt-1">
                                    值越小越容易判定手指伸直（相对手掌基准）。
                                </p>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    总置信度阈值: {localSettings.gestureConfidenceThreshold}
                                </label>
                                <input
                                    type="range"
                                    min="50"
                                    max="90"
                                    step="5"
                                    value={localSettings.gestureConfidenceThreshold}
                                    onChange={e => handleLocalChange({ gestureConfidenceThreshold: Number(e.target.value) })}
                                    className="w-full h-2 bg-gray-200 rounded-lg cursor-pointer accent-red-600"
                                />
                                <p className="text-xs text-gray-500 mt-1">
                                    综合评分阈值。分数越高要求手势越标准。
                                </p>
                            </div>
                        </div>
                    </section>

                    {/* 调试模式 */}
                    <section className="mb-6">
                        <h3 className="text-lg font-bold text-gray-800 mb-3 flex items-center gap-2">
                            🐛 调试模式
                        </h3>

                        <label className="flex items-center gap-3 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={localSettings.debugMode}
                                onChange={e => handleLocalChange({ debugMode: e.target.checked })}
                                className="w-5 h-5 rounded border-gray-300 text-red-600 focus:ring-red-500"
                            />
                            <span className="text-gray-700">启用调试模式（显示线框、关键点和 FPS）</span>
                        </label>
                        <p className="text-xs text-gray-500 mt-2 ml-8">
                            开启后会在画面上显示人体骨架、手部关键点和检测框，用于排查识别问题。线上环境建议关闭。
                        </p>
                    </section>
                </div>

                {/* Footer */}
                <div className="border-t p-4 flex justify-between items-center bg-gray-50">
                    <button
                        onClick={handleResetToDefaults}
                        className="px-4 py-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition"
                    >
                        🔄 恢复默认
                    </button>
                    <div className="flex gap-3">
                        <button
                            onClick={onClose}
                            className="px-6 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition"
                        >
                            取消
                        </button>
                        <button
                            onClick={handleSave}
                            className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition"
                        >
                            保存
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
