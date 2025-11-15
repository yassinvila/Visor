/**
 * screenCapture.js — Captures the current desktop screen as an image.
 * 
 * Public API (stable interface for stepController and LLM layer):
 *   - captureCurrentScreen(): Promise<CaptureResult>
 *   - loadDemoImage(path): Promise<CaptureResult>
 * 
 * CaptureResult shape:
 *   {
 *     imageBuffer,  // Buffer with PNG/JPEG data
 *     width,        // screen width in pixels
 *     height,       // screen height in pixels
 *     format,       // 'png' | 'jpeg'
 *     timestamp,    // Date.now()
 *     mockData      // boolean flag
 *   }
 * 
 * Implementation strategy:
 *   - Short term (dev): Mock data with mockData = true
 *   - Long term (prod): Real capture via desktopCapturer or native library with mockData = false
 *   - Transitions between modes via VISOR_USE_REAL_CAPTURE environment variable
 */

const fs = require('fs');
const path = require('path');

// Feature flag: enable real capture when available
const USE_REAL_CAPTURE = process.env.VISOR_USE_REAL_CAPTURE === 'true';

// ============================================================================
// REAL CAPTURE (Production)
// ============================================================================

/**
 * Attempt to capture screen using available methods.
 * Priority:
 *   1. Electron's desktopCapturer (via hidden window or main process)
 *   2. Native screenshot library (if installed)
 *   3. Fall back to mock
 * 
 * @returns {Promise<Object>} CaptureResult or mock if unavailable
 */
async function captureWithRealMethod() {
  try {
    // Attempt to use Electron's desktopCapturer if available
    // In a full implementation, this would:
    //   - Create a hidden BrowserWindow
    //   - Use desktopCapturer.getSources() to list displays
    //   - Use desktopCapturer.startListening() to capture the primary display
    //   - Convert to PNG buffer
    //
    // For now, we provide the structure and fall back to mock.
    
    let electronDesktopCapturer;
    try {
      const { desktopCapturer } = require('electron');
      electronDesktopCapturer = desktopCapturer;
    } catch (e) {
      // desktopCapturer not available in this context
      console.debug('desktopCapturer not available, trying fallback');
    }

    if (electronDesktopCapturer) {
      // This is a placeholder. In production:
      // const sources = await electronDesktopCapturer.getSources({ types: ['screen'] });
      // if (sources.length > 0) {
      //   const stream = await navigator.mediaDevices.getUserMedia({
      //     audio: false,
      //     video: { mandatory: { chromeMediaSource: 'desktop', chromeMediaSourceId: sources[0].id } }
      //   });
      //   // Convert stream to image buffer...
      // }
      console.info('desktopCapturer available but full implementation pending');
    }

    // Try native screenshot library if desktopCapturer failed
    let screenshot;
    try {
      // Attempt to load optional native library
      // npm install screenshot-desktop
      const takeScreenshot = require('screenshot-desktop');
      const imageBuffer = await takeScreenshot();
      
      return {
        imageBuffer,
        width: 1920, // Would be parsed from image data in production
        height: 1080,
        format: 'png',
        timestamp: Date.now(),
        mockData: false
      };
    } catch (e) {
      console.debug('screenshot-desktop not available:', e.message);
    }

    // All real capture methods failed, fall back to mock
    console.warn('Real capture unavailable, falling back to mock');
    return createMockCapture();

  } catch (error) {
    console.error('Error attempting real capture:', error);
    return createMockCapture();
  }
}

// ============================================================================
// PUBLIC API
// ============================================================================

/**
 * Capture the current screen.
 * 
 * Routes to real or mock implementation based on USE_REAL_CAPTURE flag.
 * Always resolves with a CaptureResult; never rejects.
 * 
 * @returns {Promise<Object>} CaptureResult { imageBuffer, width, height, format, timestamp, mockData }
 * @throws {Error} If capture fails (rare; fallback to mock)
 */
async function captureCurrentScreen() {
  try {
    if (USE_REAL_CAPTURE) {
      return await captureWithRealMethod();
    } else {
      return createMockCapture();
    }
  } catch (error) {
    console.error('captureCurrentScreen error:', error);
    // Always return something; never crash
    return createMockCapture();
  }
}

/**
 * Load a demo/test image from disk.
 * Useful for testing and development without relying on live screen capture.
 * 
 * @param {string} imagePath - Absolute or relative path to image file
 * @returns {Promise<Object>} CaptureResult with mockData = true
 * @throws {Error} If file not found or unreadable
 */
async function loadDemoImage(imagePath) {
  try {
    // Resolve path (handle relative and absolute)
    const resolvedPath = path.resolve(imagePath);

    if (!fs.existsSync(resolvedPath)) {
      throw new Error(`Image file not found: ${resolvedPath}`);
    }

    // Read image file into buffer
    const imageBuffer = fs.readFileSync(resolvedPath);

    // Infer format from file extension
    const ext = path.extname(resolvedPath).toLowerCase().slice(1);
    const format = ['png', 'jpg', 'jpeg', 'gif'].includes(ext) ? ext : 'png';

    // In production, parse actual image dimensions from buffer
    // For now, use standard dimensions
    return {
      imageBuffer,
      width: 1920,
      height: 1080,
      format,
      timestamp: Date.now(),
      mockData: true
    };

  } catch (error) {
    console.error('loadDemoImage error:', error);
    throw error; // Let caller handle missing demo images
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

module.exports = {
  captureCurrentScreen,
  loadDemoImage,
  // Internal helpers (for testing/debugging):
  _createMockCapture: createMockCapture,
  _captureWithRealMethod: captureWithRealMethod,
  _getPrimaryDisplaySize: getPrimaryDisplaySize
};

/**
 * Returns the primary display dimensions in pixels.
 * Uses Electron's screen module when available, otherwise falls back to mock defaults.
 */
function getPrimaryDisplaySize() {
  try {
    const { screen } = require('electron');
    const primary = screen.getPrimaryDisplay();
    return {
      width: primary.workAreaSize?.width ?? primary.size.width,
      height: primary.workAreaSize?.height ?? primary.size.height
    };
  } catch (error) {
    console.warn('Electron screen module unavailable, returning default size.', error.message);
    return { width: 1920, height: 1080 };
  }
}

