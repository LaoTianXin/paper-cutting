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
  return `${origin}/share?id=${dataId}`;
}
