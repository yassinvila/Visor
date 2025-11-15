/**
 * darwin.js — macOS-specific screen capture implementation.
 *
 * Uses screenshot-desktop for capture, with macOS-specific handling for
 * Screen Recording permission issues (required on macOS 10.15+).
 */

const process = require('process');

const LAPTOP_RESOLUTION_MAP = {
  'macbook-pro-14': { width: 3024, height: 1964 },
  'macbook-pro-13': { width: 2560, height: 1600 },
  'macbook-air-13': { width: 2560, height: 1664 },
  'default': { width: 1920, height: 1080 }
};

function inferResolutionFromLaptopVersion() {
  const v = process.env.LAPTOP_VERSION || 'default';
  return LAPTOP_RESOLUTION_MAP[v] || LAPTOP_RESOLUTION_MAP['default'];
}

function getImageFormatFromBuffer(buf) {
  if (!buf || buf.length < 4) return 'png';
  if (buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) return 'png';
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
 * Capture the current screen on macOS.
 *
 * Detects Screen Recording permission issues and provides actionable guidance.
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

    // Detect Screen Recording permission issue
    const isPermissionIssue = /screen recording|not authorized|permission denied/i.test(msg);
    if (isPermissionIssue) {
      throw new Error(
        'macOS Screen Recording permission required. Go to System Settings → Privacy & Security → Screen Recording and enable it for Visor, then restart the app.'
      );
    }

    // Generic failure with guidance
    throw new Error(
      `macOS screen capture failed: ${msg}. Troubleshooting: (1) Grant Screen Recording permission in System Settings; (2) Ensure 'screenshot-desktop' dependency is installed; (3) Restart the app after granting permission.`
    );
  }
}

module.exports = {
  captureCurrentScreen
};
