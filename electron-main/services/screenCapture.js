/**
 * screenCapture.js — Captures the current desktop screen as an image.
 *
 * This module delegates real, platform-specific capture to a subfolder
 * (`services/screenCapture/<platform>.js`) when `VISOR_USE_REAL_CAPTURE=true`.
 * It keeps a development-friendly mock fallback and preserves the public API:
 *   - captureCurrentScreen(): Promise<CaptureResult>
 *   - loadDemoImage(path): Promise<CaptureResult>
 *
 * Screenshot sizing: when real capture does not report dimensions, we infer
 * defaults from the `LAPTOP_VERSION` environment variable (mapping to common
 * laptop resolutions). This lets CI/devs and laptop variants provide the
 * expected size until a full image-parsing implementation is added.
 */

const fs = require('fs');
const path = require('path');
require('dotenv').config();

// Feature flag: allow disabling real capture for debugging.
// Production default: real capture enabled unless explicitly disabled.
const USE_REAL_CAPTURE = process.env.VISOR_USE_REAL_CAPTURE !== 'false';

// Map common laptop versions to default resolutions (can be extended)
const LAPTOP_RESOLUTION_MAP = {
  'macbook-pro-14': { width: 3024, height: 1964 },
  'macbook-pro-13': { width: 2560, height: 1600 },
  'macbook-air-13': { width: 2560, height: 1664 },
  'surface-laptop': { width: 2256, height: 1504 },
  'default': { width: 1920, height: 1080 }
};

function inferResolutionFromLaptopVersion() {
  const v = process.env.LAPTOP_VERSION || 'default';
  return LAPTOP_RESOLUTION_MAP[v] || LAPTOP_RESOLUTION_MAP['default'];
}

// ============================================================================
// MOCK CAPTURE (Fallback)
// ============================================================================

function loadMockImageBuffer() {
  try {
    const root = path.resolve(__dirname, '..', '..');
    const pngPath = path.join(root, 'assets', 'icons', 'appIcon.png');
    const jpgPath = path.join(root, 'assets', 'icons', 'appIcon.jpg');
    if (fs.existsSync(pngPath)) return fs.readFileSync(pngPath);
    if (fs.existsSync(jpgPath)) return fs.readFileSync(jpgPath);
  } catch (_) {}
  return null;
}

function createMockCapture() {
  const { width, height } = inferResolutionFromLaptopVersion();
  const buf = loadMockImageBuffer();
  return {
    imageBuffer: buf || Buffer.alloc(0),
    width,
    height,
    format: buf ? 'png' : 'png',
    timestamp: Date.now(),
    mockData: true
  };
}

// ============================================================================
// REAL CAPTURE: Delegate to platform-specific module if present
// (expected path: services/screenCapture/<platform>.js)
// ============================================================================

async function captureUsingPlatformModule() {
  const platform = process.platform; // 'win32' | 'darwin' | 'linux'
  const modulePath = path.join(__dirname, 'screenCapture', `${platform}.js`);

  if (fs.existsSync(modulePath)) {
    try {
      const platformModule = require(modulePath);
      if (typeof platformModule.captureCurrentScreen === 'function') {
        const res = await platformModule.captureCurrentScreen();
        // Ensure result matches CaptureResult shape
        if (res && res.imageBuffer) {
          // If width/height missing, infer from laptop version
          if (!res.width || !res.height) {
            const inferred = inferResolutionFromLaptopVersion();
            res.width = res.width || inferred.width;
            res.height = res.height || inferred.height;
          }
          res.mockData = false;
          return res;
        }
      }
    } catch (err) {
      console.warn('Platform-specific capture module failed:', err.message);
    }
  }
  return null;
}

async function captureWithFallbacks() {
  // 1) Try platform-specific module (preferred)
  const fromPlatform = await captureUsingPlatformModule();
  if (fromPlatform) return fromPlatform;

  // 2) Try optional native library `screenshot-desktop` if installed
  try {
    const takeScreenshot = require('screenshot-desktop');
    const imageBuffer = await takeScreenshot();
    // If the library returns a buffer, infer resolution from env mapping as fallback
    const { width, height } = inferResolutionFromLaptopVersion();
    return {
      imageBuffer,
      width,
      height,
      format: 'png',
      timestamp: Date.now(),
      mockData: false
    };
  } catch (e) {
    // Not available or failed — we'll fall back to mock below
    console.warn('Optional native screenshot library unavailable or failed:', e?.message || e);
  }

  // 3) All real capture methods failed — fall back to mock (last resort)
  console.warn('All real capture methods failed — returning mock capture result');
  return createMockCapture();
}

// ============================================================================
// PUBLIC API
// ============================================================================

async function captureCurrentScreen() {
  try {
    // In production mode (default), attempt real capture first.
    if (USE_REAL_CAPTURE) {
      const real = await captureWithFallbacks();
      return real;
    }

    // If real capture explicitly disabled, return mock for compatibility/testing.
    return createMockCapture();
  } catch (err) {
    // Do not throw in main process — caller (stepController) will treat this as an error.
    console.error('captureCurrentScreen error:', err?.message || err);
    return createMockCapture();
  }
}

async function loadDemoImage(imagePath) {
  try {
    const resolvedPath = path.resolve(imagePath);
    if (!fs.existsSync(resolvedPath)) {
      throw new Error(`Image file not found: ${resolvedPath}`);
    }
    const imageBuffer = fs.readFileSync(resolvedPath);
    const ext = path.extname(resolvedPath).toLowerCase().slice(1);
    const format = ['png', 'jpg', 'jpeg', 'gif'].includes(ext) ? ext : 'png';
    const { width, height } = inferResolutionFromLaptopVersion();
    return {
      imageBuffer,
      width,
      height,
      format,
      timestamp: Date.now(),
      mockData: true
    };
  } catch (error) {
    console.error('loadDemoImage error:', error.message);
    throw error;
  }
}

module.exports = {
  captureCurrentScreen,
  loadDemoImage
};

