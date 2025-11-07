import cv from "@techstark/opencv-js";

/**
 * Load a data file for OpenCV
 * @param cvFilePath - The file path in OpenCV's virtual file system
 * @param url - The URL to fetch the file from
 */
export async function loadDataFile(
  cvFilePath: string,
  url: string
): Promise<void> {
  // see https://docs.opencv.org/master/utils.js
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(
      `Failed to fetch ${url}: ${response.status} ${response.statusText}`
    );
  }
  const buffer = await response.arrayBuffer();
  const data = new Uint8Array(buffer);

  // Create the file in OpenCV's virtual file system
  try {
    // Check if the file already exists and delete it
    try {
      cv.FS_createDataFile("/", cvFilePath, data, true, false, false);
    } catch {
      // If file exists, unlink and try again
      console.log(`File ${cvFilePath} might exist, attempting to recreate...`);
      try {
        // @ts-expect-error - FS_unlink might not be in type definitions
        if (cv.FS && cv.FS.unlink) {
          // @ts-expect-error - FS_unlink might not be in type definitions
          cv.FS.unlink("/" + cvFilePath);
        }
      } catch {
        // Ignore unlink errors
      }
      // Try creating again
      cv.FS_createDataFile("/", cvFilePath, data, true, false, false);
    }
    console.log(`Successfully loaded: ${cvFilePath} (${data.length} bytes)`);
  } catch (error) {
    console.error(`Failed to create data file ${cvFilePath}:`, error);
    throw error;
  }
}
