/**
 * win32.js — Windows-specific screen capture implementation.
 *
 * Uses screenshot-desktop for capture, with Windows-specific error handling
 * and troubleshooting guidance for common permission/security issues.
 */

const process = require('process');

const LAPTOP_RESOLUTION_MAP = {
  'surface-laptop': { width: 2256, height: 1504 },
  'default': { width: 1920, height: 1080 }
};

function inferResolutionFromLaptopVersion() {
  const v = process.env.LAPTOP_VERSION || 'default';
  return LAPTOP_RESOLUTION_MAP[v] || LAPTOP_RESOLUTION_MAP['default'];
}

function getImageFormatFromBuffer(buf) {
  if (!buf || buf.length < 4) return 'png';
  // PNG signature
  if (buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) return 'png';
  // JPEG signature
  if (buf[0] === 0xff && buf[1] === 0xd8) return 'jpeg';
  return 'png';
}

async function tryGetDimensionsFromBuffer(buf) {
  try {
    const sizeOf = require('image-size');
    const dims = sizeOf(buf);
    return { width: dims.width, height: dims.height };
  } catch (e) {
    return null;
  }
}

/**
 * Capture the current screen on Windows.
 *
 * @returns {Promise<Object>} CaptureResult { imageBuffer, width, height, format, timestamp, mockData }
 * @throws {Error} With actionable troubleshooting message on failure
 */
async function captureCurrentScreen() {
  try {
    const takeScreenshot = require('screenshot-desktop');
    const image = await takeScreenshot();

    if (!image || !Buffer.isBuffer(image)) {
      throw new Error('screenshot-desktop returned no buffer');
    }

    const dims =
      (await tryGetDimensionsFromBuffer(image)) || inferResolutionFromLaptopVersion();

    return {
      imageBuffer: image,
      width: dims.width,
      height: dims.height,
      format: getImageFormatFromBuffer(image),
      timestamp: Date.now(),
      mockData: false
    };
  } catch (err) {
    const msg = err && err.message ? err.message : String(err);

    // Provide actionable troubleshooting for Windows
    throw new Error(
      `Windows screen capture failed: ${msg}. Troubleshooting: (1) Ensure the app runs as a standard user (not elevated); (2) Check for active Remote Desktop session (may block capture); (3) Verify desktop composition is enabled; (4) Install optional 'screenshot-desktop' dependency if missing.`
    );
  }
}

module.exports = {
  captureCurrentScreen
};
