import { useEffect, useState } from 'react';

// Upload API URL for retrieving data
const UPLOAD_API_URL = import.meta.env.VITE_UPLOAD_API_URL || '';

/**
 * SharePage - H5 Share Page Component
 * 
 * This page is accessed via QR code scan from mobile devices.
 * It fetches the image data from the server using the data ID,
 * then displays the image and provides save functionality.
 * 
 * URL format: <base_url>?id=<data_id>
 * Example: https://example.com/paper-cutting/?id=abc123
 */

interface ShareData {
    imageData: string;
    imageType: string;
    timestamp: number;
    appName: string;
}

const SharePage = () => {
    const [imageDataUrl, setImageDataUrl] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        // Get data ID from query parameters
        const params = new URLSearchParams(window.location.search);
        const dataId = params.get('id');

        if (!dataId) {
            setError('未找到图片ID');
            setLoading(false);
            return;
        }

        if (!UPLOAD_API_URL) {
            setError('API配置错误');
            setLoading(false);
            return;
        }

        // Fetch the data from server
        const fetchData = async () => {
            try {
                console.log('[SharePage] Fetching data for ID:', dataId);
                const response = await fetch(`${UPLOAD_API_URL}/public/v1/uploadData/${dataId}`, {
                    method: 'GET',
                    headers: {
                        'Content-Type': 'application/json',
                        'Accept': '*/*',
                    },
                });

                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}`);
                }

                const data: ShareData = await response.json();
                console.log('[SharePage] Data received:', { ...data, imageData: '[truncated]' });

                if (data.imageData) {
                    // Convert base64 back to data URL
                    const imageType = data.imageType || 'image/png';
                    const dataUrl = `data:${imageType};base64,${data.imageData}`;
                    setImageDataUrl(dataUrl);
                } else {
                    throw new Error('图片数据不存在');
                }
            } catch (e) {
                console.error('[SharePage] Error fetching data:', e);
                setError(e instanceof Error ? e.message : '加载失败');
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, []);

    // Handle image download
    const handleDownload = () => {
        if (!imageDataUrl) return;

        try {
            // Create download link from data URL
            const link = document.createElement('a');
            link.href = imageDataUrl;
            link.download = `paper-cutting-${Date.now()}.png`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        } catch (e) {
            console.error('Download failed:', e);
            alert('下载失败，请尝试长按图片保存');
        }
    };

    if (loading) {
        return (
            <div className="share-page share-page--loading">
                <div className="share-page__spinner"></div>
                <p>加载中...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="share-page share-page--error">
                <div className="share-page__error-icon">⚠️</div>
                <p>{error}</p>
            </div>
        );
    }

    return (
        <div className="share-page">
            {/* Header */}
            <div className="share-page__header">
                <h1>正定剪纸艺术</h1>
                <p>长按图片保存到相册</p>
            </div>

            {/* Image container */}
            <div className="share-page__image-container">
                {imageDataUrl && (
                    <img
                        src={imageDataUrl}
                        alt="剪纸艺术作品"
                        className="share-page__image"
                        onError={() => setError('图片加载失败')}
                    />
                )}
            </div>

            {/* Action buttons */}
            <div className="share-page__actions">
                <button
                    className="share-page__button share-page__button--primary"
                    onClick={handleDownload}
                >
                    保存图片
                </button>
            </div>

            {/* Footer tip */}
            <div className="share-page__footer">
                <p>如果保存按钮无效，请长按图片选择"保存到相册"</p>
            </div>
        </div>
    );
};

export default SharePage;
