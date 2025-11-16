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
    mockData: true,
    devicePixelRatio: 1
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
          // If width/height missing, try to infer from image buffer
          if (!res.width || !res.height) {
            try {
              const sizeOf = require('image-size');
              const dims = sizeOf(res.imageBuffer);
              if (dims && dims.width && dims.height) {
                res.width = res.width || dims.width;
                res.height = res.height || dims.height;
              }
            } catch (_) {
              const inferred = inferResolutionFromLaptopVersion();
              res.width = res.width || inferred.width;
              res.height = res.height || inferred.height;
            }
          }
          res.devicePixelRatio = res.devicePixelRatio || res.scale || 1;
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
    // Try to determine actual dimensions from buffer if possible
    let width, height;
    try {
      const sizeOf = require('image-size');
      const dims = sizeOf(imageBuffer);
      width = dims.width; height = dims.height;
    } catch (e) {
      const inferred = inferResolutionFromLaptopVersion();
      width = inferred.width; height = inferred.height;
    }
    return {
      imageBuffer,
      width,
      height,
      format: 'png',
      timestamp: Date.now(),
      mockData: false,
      devicePixelRatio: 1
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
    // If an overlay window has been registered, hide it briefly to avoid
    // capturing the overlay itself in screenshots. This is important for
    // overlays that are always-on-top/transparent.
    if (overlayWindowRef) {
      let overlayWasVisible = false;
      try {
        if (!overlayWindowRef.isDestroyed() && overlayWindowRef.isVisible && overlayWindowRef.isVisible()) {
          overlayWasVisible = true;
          try { overlayWindowRef.hide(); } catch (_) {}
          // Allow compositor time to repaint without the overlay
          await new Promise((res) => setTimeout(res, 140));
        }
      } catch (_) {
        // ignore overlay hide errors and proceed with capture
      }

      try {
        if (USE_REAL_CAPTURE) {
          const real = await captureWithFallbacks();
          return real;
        }
        return createMockCapture();
      } finally {
        // Restore overlay visibility if we hid it
        try {
          if (overlayWasVisible && !overlayWindowRef.isDestroyed()) {
            overlayWindowRef.show();
          }
        } catch (_) {}
      }
    }

    // No overlay registered — normal capture flow
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

// Module-scoped reference to an overlay BrowserWindow (optional). Main process
// should call `setOverlayWindow(win)` after creating the overlay window so
// the capture service can hide/show it during screenshots.
let overlayWindowRef = null;

function setOverlayWindow(win) {
  overlayWindowRef = win;
}

function clearOverlayWindow() {
  overlayWindowRef = null;
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
    // Attempt to infer dimensions from the demo image buffer
    let width, height;
    try {
      const sizeOf = require('image-size');
      const dims = sizeOf(imageBuffer);
      width = dims.width; height = dims.height;
    } catch (_) {
      const inferred = inferResolutionFromLaptopVersion();
      width = inferred.width; height = inferred.height;
    }
    return {
      imageBuffer,
      width,
      height,
      format,
      timestamp: Date.now(),
      mockData: true,
      devicePixelRatio: 1
    };
  } catch (error) {
    console.error('loadDemoImage error:', error.message);
    throw error;
  }
}

module.exports = {
  captureCurrentScreen,
  loadDemoImage,
  setOverlayWindow,
  clearOverlayWindow
};

