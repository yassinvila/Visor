/**
 * test-splash.js — Quick test to see the splash animation
 * 
 * This script creates just the splash window so you can see the animation
 * without starting the full Visor app.
 * 
 * Usage: node test-splash.js
 */

const { app, BrowserWindow, screen } = require('electron');
const path = require('path');

function createTestSplash() {
  const primaryDisplay = screen.getPrimaryDisplay();
  const { width, height } = primaryDisplay.workAreaSize;

  const splashWin = new BrowserWindow({
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
      preload: path.join(__dirname, 'electron-main/preload.js')
    }
  });

  splashWin.loadFile(path.join(__dirname, 'renderer/splash/splash.html'));

  // Open DevTools to see console logs
  // splashWin.webContents.openDevTools({ mode: 'detach' });

  // Auto-close after animation completes (about 6 seconds)
  setTimeout(() => {
    console.log('Animation should be complete, closing in 2 seconds...');
    setTimeout(() => {
      splashWin.close();
      app.quit();
    }, 2000);
  }, 6000);

  return splashWin;
}

app.whenReady().then(() => {
  console.log('Creating splash window test...');
  createTestSplash();
});

app.on('window-all-closed', () => {
  app.quit();
});
