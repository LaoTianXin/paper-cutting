/**
 * ComfyUI API Service for Paper-Cutting Style Generation
 * Handles communication with the backend API for AI image generation
 * Uses binary file upload (FormData) for efficient image transmission
 */

// API configuration - uses env variable or defaults to localhost
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080';
// Upload API URL for image display
const UPLOAD_API_URL = import.meta.env.VITE_UPLOAD_API_URL || '';

// Response type from the API
export interface GenerateResponse {
  success: boolean;
  image_url?: string;
  prompt_id?: string;
  error?: string;
}

/**
 * Process image URL - add prefix if needed
 * @param imageUrl - The URL returned from API
 * @returns Full URL with prefix if needed
 */
function processImageUrl(imageUrl: string): string {
  if (!imageUrl) return imageUrl;
  
  // If already a full URL (starts with http:// or https://), return as is
  if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
    return imageUrl;
  }
  
  // If it's a relative path, prepend the UPLOAD_API_URL
  if (UPLOAD_API_URL && imageUrl.startsWith('/')) {
    return `${UPLOAD_API_URL}${imageUrl}`;
  }
  
  return imageUrl;
}

/**
 * Convert canvas to Blob (binary data)
 * @param canvas - HTMLCanvasElement to convert
 * @returns Promise<Blob> - Binary image data
 */
async function canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) {
        resolve(blob);
      } else {
        reject(new Error('Failed to convert canvas to blob'));
      }
    }, 'image/png');
  });
}

/**
 * Convert data URL to Blob (binary data)
 * @param dataUrl - Data URL string (e.g., "data:image/png;base64,...")
 * @returns Blob - Binary image data
 */
function dataUrlToBlob(dataUrl: string): Blob {
  const [header, base64Data] = dataUrl.split(',');
  const mimeMatch = header.match(/:(.*?);/);
  const mimeType = mimeMatch ? mimeMatch[1] : 'image/png';
  
  const byteString = atob(base64Data);
  const arrayBuffer = new ArrayBuffer(byteString.length);
  const uint8Array = new Uint8Array(arrayBuffer);
  
  for (let i = 0; i < byteString.length; i++) {
    uint8Array[i] = byteString.charCodeAt(i);
  }
  
  return new Blob([uint8Array], { type: mimeType });
}

/**
 * Generate a paper-cut style image from the captured photo
 * Uses FormData for efficient binary file upload
 * @param imageSource - HTMLCanvasElement or data URL string containing the captured image
 * @returns Promise with the generated image URL or error
 */
export async function generatePaperCutImage(imageSource: HTMLCanvasElement | string): Promise<GenerateResponse> {
  try {
    console.log('[ComfyUI Service] Starting paper-cut image generation...');
    console.log('[ComfyUI Service] API URL:', API_BASE_URL);
    
    let blob: Blob;
    
    // Handle both canvas and data URL input
    if (typeof imageSource === 'string') {
      // Input is a data URL string
      console.log('[ComfyUI Service] Converting data URL to blob...');
      blob = dataUrlToBlob(imageSource);
    } else {
      // Input is an HTMLCanvasElement
      console.log('[ComfyUI Service] Image size:', imageSource.width, 'x', imageSource.height);
      blob = await canvasToBlob(imageSource);
    }
    
    console.log('[ComfyUI Service] Blob size:', (blob.size / 1024).toFixed(2), 'KB');
    
    // Create FormData with the image file
    const formData = new FormData();
    formData.append('image', blob, `capture_${Date.now()}.png`);
    
    // Send as multipart/form-data (browser sets Content-Type automatically with boundary)
    const response = await fetch(`${API_BASE_URL}/api/paper-cutting/generate`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ detail: 'Unknown error' }));
      console.error('[ComfyUI Service] API error:', response.status, errorData);
      return {
        success: false,
        error: errorData.detail || `HTTP ${response.status}`,
      };
    }

    const data: GenerateResponse = await response.json();
    console.log('[ComfyUI Service] Generation result:', data);
    
    // Process the image URL to add prefix if needed
    if (data.success && data.image_url) {
      data.image_url = processImageUrl(data.image_url);
      console.log('[ComfyUI Service] Processed image URL:', data.image_url);
    }
    
    return data;
  } catch (error) {
    console.error('[ComfyUI Service] Network error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Network error',
    };
  }
}

/**
 * Check if the ComfyUI service is available
 * @returns Promise with health status
 */
export async function checkHealth(): Promise<{ healthy: boolean; error?: string }> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/health`, {
      method: 'GET',
    });

    if (response.ok) {
      const data = await response.json();
      return { healthy: data.status === 'healthy' && data.comfyui === 'connected' };
    }

    return { healthy: false, error: `HTTP ${response.status}` };
  } catch (error) {
    return {
      healthy: false,
      error: error instanceof Error ? error.message : 'Network error',
    };
  }
}
