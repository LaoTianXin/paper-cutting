import { useRef, useEffect, useState, useCallback, forwardRef, useImperativeHandle } from 'react';
import { Page5Images } from '../../constants/images';

/**
 * ShareCardCanvas Component
 * 
 * A responsive Canvas-based component for rendering the share card.
 * The component width is based on parent element, height maintains aspect ratio.
 * 
 * Design dimensions: 522 x 775 (ratio: 0.6735)
 * - Title area: 442 x auto at top
 * - Image area: full width x 613px proportional
 */

export interface ShareCardCanvasProps {
    /** AI generated or captured image URL/dataURL */
    image: string | null;
    /** Callback when canvas is ready for export */
    onCanvasReady?: (canvas: HTMLCanvasElement) => void;
    /** Optional className for the container */
    className?: string;
}

export interface ShareCardCanvasRef {
    /** Get canvas as Blob for upload */
    getImageBlob: () => Promise<Blob | null>;
    /** Get canvas as DataURL */
    getImageDataURL: () => string | null;
    /** Get the canvas element */
    getCanvas: () => HTMLCanvasElement | null;
}

// Design dimensions from original UI
// Frame dimensions (decoration-3)
const FRAME_WIDTH = 522;
const FRAME_HEIGHT = 775;
// Canvas dimensions (5% larger than frame for outer background)
const BORDER_PADDING = 0.025; // 2.5% on each side = 5% total
const DESIGN_WIDTH = Math.round(FRAME_WIDTH * (1 + BORDER_PADDING * 2));
const DESIGN_HEIGHT = Math.round(FRAME_HEIGHT * (1 + BORDER_PADDING * 2));
const FRAME_OFFSET_X = Math.round(FRAME_WIDTH * BORDER_PADDING);
const FRAME_OFFSET_Y = Math.round(FRAME_HEIGHT * BORDER_PADDING);
// Title and content dimensions (relative to frame)
const TITLE_WIDTH = 442;
const TITLE_TOP = FRAME_OFFSET_Y + 40;
const IMAGE_HEIGHT = 613;
const PADDING_X = FRAME_OFFSET_X + 35;

const ShareCardCanvas = forwardRef<ShareCardCanvasRef, ShareCardCanvasProps>(
    ({ image, onCanvasReady, className }, ref) => {
        const containerRef = useRef<HTMLDivElement>(null);
        const canvasRef = useRef<HTMLCanvasElement>(null);
        const [dimensions, setDimensions] = useState({ width: DESIGN_WIDTH, height: DESIGN_HEIGHT });
        const [imagesLoaded, setImagesLoaded] = useState(false);
        const loadedImagesRef = useRef<Map<string, HTMLImageElement>>(new Map());

        // Expose methods to parent via ref
        useImperativeHandle(ref, () => ({
            getImageBlob: async () => {
                const canvas = canvasRef.current;
                if (!canvas) return null;
                return new Promise<Blob | null>((resolve) => {
                    canvas.toBlob((blob) => resolve(blob), 'image/png');
                });
            },
            getImageDataURL: () => {
                const canvas = canvasRef.current;
                if (!canvas) return null;
                return canvas.toDataURL('image/png');
            },
            getCanvas: () => canvasRef.current,
        }));

        // Preload all required images
        const preloadImages = useCallback(async () => {
            const imageSources = [
                Page5Images.decorations[4], // Background (decoration-5) - outermost layer
                Page5Images.decorations[2], // Frame (decoration-3)
                Page5Images.decorations[5], // Image area background (decoration-6)
                Page5Images.maskGroup,      // Title
                Page5Images.cardBorder,     // Card border for AI image
            ];

            // Add the main image if available
            // IMPORTANT: Add timestamp to bypass browser cache for the main image
            // This fixes the issue where the browser uses a cached non-CORS response
            // for the CORS-requiring canvas drawImage call
            let mainImageSrc = null;
            if (image) {
                // Only append timestamp if it's a remote URL (http/https), not data: URI
                if (image.startsWith('http')) {
                    const separator = image.includes('?') ? '&' : '?';
                    mainImageSrc = `${image}${separator}t=${new Date().getTime()}`;
                    imageSources.push(mainImageSrc);
                } else {
                    mainImageSrc = image;
                    imageSources.push(image);
                }
            }

            const loadPromises = imageSources.map((src) => {
                return new Promise<void>((resolve) => {
                    // Check if already loaded
                    if (loadedImagesRef.current.has(src)) {
                        resolve();
                        return;
                    }

                    const img = new Image();
                    img.crossOrigin = 'anonymous'; // Enable CORS for all images
                    img.onload = () => {
                        console.log(`[ShareCardCanvas] Loaded: ${src.substring(0, 50)}...`);
                        loadedImagesRef.current.set(src, img);
                        resolve();
                    };
                    img.onerror = (e) => {
                        console.warn(`[ShareCardCanvas] Failed to load image: ${src}`, e);
                        resolve(); // Continue even if one fails
                    };
                    img.src = src;
                });
            });

            await Promise.all(loadPromises);
            setImagesLoaded(true);

            // If we modified the main image source with a timestamp, we need to map it back 
            // so the draw function can find it using the original prop 'image' key, 
            // OR we ensure the draw function uses the same logic.
            // Better approach: Store the loaded image under the *original* key (prop 'image') 
            // if we modified it, or just rely on the fact that we'll look it up by the mainImageSrc.

            // Let's update the loadedImagesRef to satisfy the lookup in the draw function.
            // The draw function uses `loadedImagesRef.current.get(image)`.
            if (image && mainImageSrc && mainImageSrc !== image) {
                const img = loadedImagesRef.current.get(mainImageSrc);
                if (img) {
                    loadedImagesRef.current.set(image, img);
                }
            }
        }, [image]);

        // Handle container resize
        useEffect(() => {
            const container = containerRef.current;
            if (!container) return;

            const resizeObserver = new ResizeObserver((entries) => {
                for (const entry of entries) {
                    const width = entry.contentRect.width;
                    if (width > 0) {
                        const height = width * (DESIGN_HEIGHT / DESIGN_WIDTH);
                        setDimensions({ width, height });
                    }
                }
            });

            resizeObserver.observe(container);

            // Initial size
            const initialWidth = container.clientWidth;
            if (initialWidth > 0) {
                const height = initialWidth * (DESIGN_HEIGHT / DESIGN_WIDTH);
                setDimensions({ width: initialWidth, height });
            }

            return () => resizeObserver.disconnect();
        }, []);

        // Load images when component mounts or image prop changes
        useEffect(() => {
            preloadImages();
        }, [preloadImages]);

        // Draw canvas when dimensions change or images load
        useEffect(() => {
            if (!imagesLoaded) return;

            const canvas = canvasRef.current;
            const ctx = canvas?.getContext('2d');
            if (!canvas || !ctx) return;

            // Set canvas size (use design dimensions for high quality)
            canvas.width = DESIGN_WIDTH;
            canvas.height = DESIGN_HEIGHT;

            // Scale canvas display size to fill container
            canvas.style.width = `${dimensions.width}px`;
            canvas.style.height = `${dimensions.height}px`;

            // Clear canvas
            ctx.clearRect(0, 0, DESIGN_WIDTH, DESIGN_HEIGHT);

            console.log('[ShareCardCanvas] Starting draw, loaded images:',
                Array.from(loadedImagesRef.current.keys()));

            // 1. Draw background (decoration-5) - outermost layer, fills entire canvas
            const bgOuterImage = loadedImagesRef.current.get(Page5Images.decorations[4]);
            if (bgOuterImage) {
                ctx.drawImage(bgOuterImage, 0, 0, DESIGN_WIDTH, DESIGN_HEIGHT);
                console.log('[ShareCardCanvas] Drew outer background (decoration-5)');
            } else {
                // Fallback: fill with solid color if background not loaded
                ctx.fillStyle = '#FFF5F5';
                ctx.fillRect(0, 0, DESIGN_WIDTH, DESIGN_HEIGHT);
                console.warn('[ShareCardCanvas] Outer background NOT loaded, using fallback color');
            }

            // 2. Draw frame (decoration-3) - centered on canvas with 5% border
            const bgImage = loadedImagesRef.current.get(Page5Images.decorations[2]);
            if (bgImage) {
                ctx.drawImage(bgImage, FRAME_OFFSET_X, FRAME_OFFSET_Y, FRAME_WIDTH, FRAME_HEIGHT);
                console.log('[ShareCardCanvas] Drew frame (decoration-3) at offset:', FRAME_OFFSET_X, FRAME_OFFSET_Y);
            } else {
                console.warn('[ShareCardCanvas] Frame NOT loaded:', Page5Images.decorations[2]);
            }

            // 3. Draw title (maskGroup)
            const titleImage = loadedImagesRef.current.get(Page5Images.maskGroup);
            console.log('[ShareCardCanvas] maskGroup src:', Page5Images.maskGroup);
            console.log('[ShareCardCanvas] titleImage loaded:', !!titleImage);
            if (titleImage) {
                const titleHeight = (titleImage.height / titleImage.width) * TITLE_WIDTH;
                const titleX = (DESIGN_WIDTH - TITLE_WIDTH) / 2;
                console.log('[ShareCardCanvas] Drawing title at:', titleX, TITLE_TOP, TITLE_WIDTH, titleHeight);
                ctx.drawImage(titleImage, titleX, TITLE_TOP, TITLE_WIDTH, titleHeight);
            } else {
                console.warn('[ShareCardCanvas] maskGroup NOT loaded');
            }

            // Draw main image area (relative to frame position)
            const contentWidth = FRAME_WIDTH - 35 * 2; // Use original padding relative to frame
            const imageAreaTop = TITLE_TOP + 52 + 12; // Title height + margin

            // Draw background image (decoration-6) for image area
            const imageBgImage = loadedImagesRef.current.get(Page5Images.decorations[5]);
            if (imageBgImage) {
                ctx.drawImage(imageBgImage, PADDING_X, imageAreaTop, contentWidth, IMAGE_HEIGHT);
            } else {
                // Fallback: fill with gray if background not loaded
                ctx.fillStyle = '#9CA3AF'; // gray-400
                ctx.fillRect(PADDING_X, imageAreaTop, contentWidth, IMAGE_HEIGHT);
            }

            // Calculate 80% scaled area for card border + AI image
            const outerScaleFactor = 0.80;
            const scaledAreaWidth = contentWidth * outerScaleFactor;
            const scaledAreaHeight = IMAGE_HEIGHT * outerScaleFactor;
            const areaOffsetX = (contentWidth - scaledAreaWidth) / 2;
            const areaOffsetY = (IMAGE_HEIGHT - scaledAreaHeight) / 2;
            const scaledAreaX = PADDING_X + areaOffsetX;
            const scaledAreaY = imageAreaTop + areaOffsetY;

            // Draw card border as background layer (80% size, centered)
            const cardBorderImage = loadedImagesRef.current.get(Page5Images.cardBorder);
            if (cardBorderImage) {
                ctx.drawImage(cardBorderImage, scaledAreaX, scaledAreaY, scaledAreaWidth, scaledAreaHeight);
                console.log('[ShareCardCanvas] Drew card border as background (80% size)');
            }

            // Draw the main image if available (92% of the 80% border area to show border)
            if (image) {
                const mainImage = loadedImagesRef.current.get(image);
                if (mainImage) {
                    // Calculate 92% size within the scaled border area
                    const innerScaleFactor = 0.92;
                    const innerWidth = scaledAreaWidth * innerScaleFactor;
                    const innerHeight = scaledAreaHeight * innerScaleFactor;
                    const innerOffsetX = (scaledAreaWidth - innerWidth) / 2;
                    const innerOffsetY = (scaledAreaHeight - innerHeight) / 2;

                    // Calculate aspect ratio fit within inner area
                    const imgRatio = mainImage.width / mainImage.height;
                    const areaRatio = innerWidth / innerHeight;

                    let drawWidth, drawHeight, drawX, drawY;

                    if (imgRatio > areaRatio) {
                        // Image is wider, fit to width
                        drawWidth = innerWidth;
                        drawHeight = innerWidth / imgRatio;
                        drawX = scaledAreaX + innerOffsetX;
                        drawY = scaledAreaY + innerOffsetY + (innerHeight - drawHeight) / 2;
                    } else {
                        // Image is taller, fit to height
                        drawHeight = innerHeight;
                        drawWidth = innerHeight * imgRatio;
                        drawX = scaledAreaX + innerOffsetX + (innerWidth - drawWidth) / 2;
                        drawY = scaledAreaY + innerOffsetY;
                    }

                    ctx.drawImage(mainImage, drawX, drawY, drawWidth, drawHeight);
                }
            } else {
                // Draw placeholder text
                ctx.fillStyle = '#6B7280'; // gray-500
                ctx.font = '24px sans-serif';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText('暂无图片', DESIGN_WIDTH / 2, imageAreaTop + IMAGE_HEIGHT / 2);
            }

            // Notify parent that canvas is ready
            if (onCanvasReady) {
                onCanvasReady(canvas);
            }
        }, [dimensions, imagesLoaded, image, onCanvasReady]);

        return (
            <div ref={containerRef} className={`w-full ${className || ''}`}>
                <canvas
                    ref={canvasRef}
                    className="block"
                    style={{ width: '100%', height: 'auto' }}
                />
            </div>
        );
    }
);

ShareCardCanvas.displayName = 'ShareCardCanvas';

export default ShareCardCanvas;
