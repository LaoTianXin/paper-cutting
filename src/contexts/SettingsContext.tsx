import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { getCameraCapabilities, type CameraCapabilities } from '../utils/cameraCapabilities';

// 设置类型定义
export interface Settings {
    // 视频分辨率
    videoWidth: number;
    videoHeight: number;

    // 身体检测参数 (Pose)
    poseModelComplexity: 0 | 1 | 2;
    poseMinDetectionConfidence: number;
    poseMinTrackingConfidence: number;

    // 手势检测参数 (Hands)
    handsMaxNum: number;
    handsModelComplexity: 0 | 1;
    handsMinDetectionConfidence: number;
    handsMinTrackingConfidence: number;

    // 调试模式
    debugMode: boolean;

    // OK手势识别参数
    gestureCircleThreshold: number; // 圆圈判定阈值 (默认 0.15)
    gestureFingerExtendThreshold: number; // 手指伸直阈值 (默认 0.4)
    gestureConfidenceThreshold: number; // 置信度阈值 (默认 70)
}

// 默认设置
export const DEFAULT_SETTINGS: Settings = {
    videoWidth: 1280,
    videoHeight: 960,

    poseModelComplexity: 1,
    poseMinDetectionConfidence: 0.5,
    poseMinTrackingConfidence: 0.5,

    handsMaxNum: 2,
    handsModelComplexity: 1,
    handsMinDetectionConfidence: 0.5,
    handsMinTrackingConfidence: 0.5,

    debugMode: false,

    gestureCircleThreshold: 0.15,
    gestureFingerExtendThreshold: 0.4,
    gestureConfidenceThreshold: 70,
};

// 视频分辨率预设
export const VIDEO_PRESETS = [
    { label: '640 × 480 (VGA)', width: 640, height: 480 },
    { label: '1280 × 720 (HD)', width: 1280, height: 720 },
    { label: '1280 × 960 (4:3 HD)', width: 1280, height: 960 },
    { label: '1920 × 1080 (Full HD)', width: 1920, height: 1080 },
    { label: '1920 × 1440 (4:3 Full HD)', width: 1920, height: 1440 },
];

const STORAGE_KEY = 'paper-cutting-settings';

interface SettingsContextType {
    settings: Settings;
    updateSettings: (partial: Partial<Settings>) => void;
    resetToDefaults: () => void;
    fps: number;
    updateFps: (fps: number) => void;
    cameraCapabilities: CameraCapabilities | null;
    isLoadingCapabilities: boolean;
}

const SettingsContext = createContext<SettingsContextType | null>(null);

// 从 localStorage 加载设置
function loadSettings(): Settings {
    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
            const parsed = JSON.parse(stored);
            return { ...DEFAULT_SETTINGS, ...parsed };
        }
    } catch (error) {
        console.warn('Failed to load settings from localStorage:', error);
    }
    return DEFAULT_SETTINGS;
}

// 保存设置到 localStorage
function saveSettings(settings: Settings): void {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    } catch (error) {
        console.warn('Failed to save settings to localStorage:', error);
    }
}

export function SettingsProvider({ children }: { children: React.ReactNode }) {
    const [settings, setSettings] = useState<Settings>(loadSettings);
    const [fps, setFps] = useState(0);
    const [cameraCapabilities, setCameraCapabilities] = useState<CameraCapabilities | null>(null);
    const [isLoadingCapabilities, setIsLoadingCapabilities] = useState(true);

    // 获取摄像头能力
    useEffect(() => {
        getCameraCapabilities().then(caps => {
            setCameraCapabilities(caps);
            setIsLoadingCapabilities(false);
            if (caps) {
                console.log(`📹 摄像头: ${caps.label}`);
                console.log(`📹 支持分辨率范围: ${caps.minWidth}x${caps.minHeight} - ${caps.maxWidth}x${caps.maxHeight}`);
            }
        });
    }, []);

    // 当设置变化时保存到 localStorage
    useEffect(() => {
        saveSettings(settings);
    }, [settings]);

    const updateSettings = useCallback((partial: Partial<Settings>) => {
        setSettings(prev => ({ ...prev, ...partial }));
    }, []);

    const resetToDefaults = useCallback(() => {
        setSettings(DEFAULT_SETTINGS);
    }, []);

    const updateFps = useCallback((newFps: number) => {
        setFps(newFps);
    }, []);

    return (
        <SettingsContext.Provider value={{
            settings,
            updateSettings,
            resetToDefaults,
            fps,
            updateFps,
            cameraCapabilities,
            isLoadingCapabilities
        }}>
            {children}
        </SettingsContext.Provider>
    );
}

export function useSettings(): SettingsContextType {
    const context = useContext(SettingsContext);
    if (!context) {
        throw new Error('useSettings must be used within a SettingsProvider');
    }
    return context;
}

