const path = require('path');
const { BrowserWindow } = require('electron');

const isDev = process.env.VISOR_DEV_SERVER === 'true';

function createChatWindow() {
  const win = new BrowserWindow({
    width: 420,
    height: 680,
    minWidth: 360,
    minHeight: 500,
    frame: false,
    resizable: true,
    transparent: true,
    alwaysOnTop: true,
    skipTaskbar: true,
    show: false,
    vibrancy: 'sidebar',
    visualEffectState: 'active',
    webPreferences: {
      preload: path.join(__dirname, '..', 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true
    }
  });

  if (isDev) {
    win.loadURL('http://localhost:5173/chatbox/chat.html');
  } else {
    win.loadFile(path.join(__dirname, '..', '..', 'dist', 'chatbox', 'chat.html'));
  }

  win.once('ready-to-show', () => win.show());

  return win;
}

module.exports = createChatWindow;
