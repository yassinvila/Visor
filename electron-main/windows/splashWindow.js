/**
 * splashWindow.js — Creates and manages the startup splash animation
 */

const { BrowserWindow, screen } = require('electron');
const path = require('path');

let splashWin = null;

/**
 * Create the splash window
 */
function createSplashWindow() {
  const primaryDisplay = screen.getPrimaryDisplay();
  const { width, height } = primaryDisplay.workAreaSize;

  splashWin = new BrowserWindow({
    width,
    height,
    x: 0,
    y: 0,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    skipTaskbar: true,
    resizable: false,
    movable: false,
    hasShadow: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, '../preload.js')
    }
  });

  // Load the splash HTML
  splashWin.loadFile(path.join(__dirname, '../../renderer/splash/splash.html'));

  // Prevent closing
  splashWin.setClosable(false);

  // Handle cleanup
  splashWin.on('closed', () => {
    splashWin = null;
  });

  return splashWin;
}

/**
 * Close and destroy the splash window
 */
function closeSplashWindow() {
  if (splashWin && !splashWin.isDestroyed()) {
    splashWin.setClosable(true);
    splashWin.close();
    splashWin = null;
  }
}

/**
 * Get the splash window instance
 */
function getSplashWindow() {
  return splashWin;
}

module.exports = {
  createSplashWindow,
  closeSplashWindow,
  getSplashWindow
};
