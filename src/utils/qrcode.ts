/**
 * QR Code Utility Functions
 */

/**
 * Create share page URL with data ID parameter
 * @param dataId - ID of the uploaded data from the server
 * @param baseUrl - Base URL of the application (defaults to current origin)
 * @returns Full share page URL
 * 
 * URL format: <base_url>?id=<data_id>
 * Example: https://example.com/paper-cutting/?id=abc123
 */
export function createSharePageUrl(dataId: string, baseUrl?: string): string {
  const origin = baseUrl || window.location.origin;
  // 使用 import.meta.env.BASE_URL 获取配置的 base 路径 (如 /paper-cutting/)
  const basePath = import.meta.env.BASE_URL || '/';
  // 确保 basePath 以 / 结尾
  const normalizedBase = basePath.endsWith('/') ? basePath : `${basePath}/`;
  // 直接在 base path 后加 ?id= 参数，不再需要 /share 路径
  return `${origin}${normalizedBase}?id=${dataId}`;
}
