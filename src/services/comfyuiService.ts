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

// Response type for share image upload
export interface UploadShareResponse {
  success: boolean;
  /** Data ID returned from server - used to construct retrieval URL */
  dataId?: string;
  /** Full URL to retrieve the data */
  url?: string;
  error?: string;
}

/**
 * Convert Blob to base64 string
 */
async function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      // Remove data URL prefix (e.g., "data:image/png;base64,")
      const base64 = result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

/**
 * Upload share card data to server
 * Uses POST /public/v1/uploadData endpoint
 * @param imageBlob - Blob data of the share card image
 * @returns Promise with the data ID and retrieval URL
 */
export async function uploadShareImage(imageBlob: Blob): Promise<UploadShareResponse> {
  try {
    console.log('[Share Service] Starting image upload...');
    console.log('[Share Service] Upload API URL:', UPLOAD_API_URL);
    console.log('[Share Service] Blob size:', (imageBlob.size / 1024).toFixed(2), 'KB');

    if (!UPLOAD_API_URL) {
      console.error('[Share Service] UPLOAD_API_URL is not configured');
      return {
        success: false,
        error: 'Upload API URL not configured',
      };
    }

    // Convert blob to base64
    const base64Image = await blobToBase64(imageBlob);
    console.log('[Share Service] Base64 length:', base64Image.length);

    // Prepare upload data
    const uploadData = {
      imageData: base64Image,
      imageType: 'image/png',
      timestamp: Date.now(),
      appName: 'paper-cutting',
    };

    // Send as JSON to uploadData endpoint
    const response = await fetch(`${UPLOAD_API_URL}/public/v1/uploadData`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': '*/*',
      },
      body: JSON.stringify(uploadData),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ detail: 'Unknown error' }));
      console.error('[Share Service] Upload error:', response.status, errorData);
      return {
        success: false,
        error: errorData.detail || errorData.message || `HTTP ${response.status}`,
      };
    }

    const data = await response.json();
    console.log('[Share Service] Upload result (full):', JSON.stringify(data, null, 2));

    // Extract the data ID from response - try multiple possible field names
    // The API returns 'xid' as the data identifier
    let dataId = data.xid || data.id || data.dataId || data._id || data.code || data.key || data.shortId;
    
    // If data is wrapped in a data property
    if (!dataId && data.data) {
      dataId = data.data.id || data.data.dataId || data.data._id || data.data.code || data.data.key;
    }
    
    // If the response itself is just a string (the ID directly)
    if (!dataId && typeof data === 'string') {
      dataId = data;
    }

    console.log('[Share Service] Extracted dataId:', dataId);
    console.log('[Share Service] Available keys in response:', Object.keys(data));

    if (dataId) {
      // Construct the retrieval URL
      const retrievalUrl = `${UPLOAD_API_URL}/public/v1/uploadData/${dataId}`;
      console.log('[Share Service] Data ID:', dataId);
      console.log('[Share Service] Retrieval URL:', retrievalUrl);
      
      return {
        success: true,
        dataId: dataId,
        url: retrievalUrl,
      };
    }

    console.error('[Share Service] Could not find data ID in response. Response structure:', data);
    return {
      success: false,
      error: `No data ID in response. Keys: ${Object.keys(data).join(', ')}`,
    };
  } catch (error) {
    console.error('[Share Service] Network error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Network error',
    };
  }
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
