/**
 * QR Code Utility Functions
 */

/**
 * Create share page URL with data ID parameter
 * @param dataId - ID of the uploaded data from the server
 * @param baseUrl - Base URL of the application (defaults to current origin)
 * @returns Full share page URL
 */
export function createSharePageUrl(dataId: string, baseUrl?: string): string {
  const origin = baseUrl || window.location.origin;
  // 使用 import.meta.env.BASE_URL 获取配置的 base 路径 (如 /paper-cutting/)
  const basePath = import.meta.env.BASE_URL || '/';
  // 确保 basePath 以 / 结尾，share 前面不需要额外的 /
  const normalizedBase = basePath.endsWith('/') ? basePath : `${basePath}/`;
  return `${origin}${normalizedBase}share?id=${dataId}`;
}
