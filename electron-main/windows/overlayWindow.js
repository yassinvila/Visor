const path = require('path');
const { BrowserWindow, screen } = require('electron');

const isDev = process.env.VISOR_DEV_SERVER === 'true';

function createOverlayWindow() {
  const display = screen.getPrimaryDisplay();

  const win = new BrowserWindow({
    width: display.size.width,
    height: display.size.height,
    x: display.bounds.x,
    y: display.bounds.y,
    frame: false,
    transparent: true,
    resizable: false,
    hasShadow: false,
    movable: false,
    fullscreen: false,
    fullscreenable: false,
    skipTaskbar: true,
    alwaysOnTop: true,
    focusable: false,
    show: false,
    backgroundColor: '#00000000',
    titleBarStyle: 'hiddenInset',
    webPreferences: {
      preload: path.join(__dirname, '..', 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true
    }
  });

  win.setIgnoreMouseEvents(true, { forward: true });

  if (isDev) {
    win.loadURL('http://localhost:5173/overlay/index.html');
  } else {
    win.loadFile(path.join(__dirname, '..', '..', 'dist', 'overlay', 'index.html'));
  }

  win.once('ready-to-show', () => win.showInactive());

  return win;
}

module.exports = createOverlayWindow;
