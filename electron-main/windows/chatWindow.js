const path = require('path');
const { BrowserWindow, screen, ipcMain } = require('electron');

const isDev = process.env.VISOR_DEV_SERVER === 'true';

function createChatWindow() {
  const display = screen.getPrimaryDisplay();
  const workArea = display.workArea || {
    x: display.bounds.x,
    y: display.bounds.y,
    width: display.size.width,
    height: display.size.height
  };
  const collapsedHeight = 70;
  const expandedHeight = 680;
  const width = 420;
  const margin = 12; // gap from bottom

  const initialX = Math.round(workArea.x + (workArea.width - width) / 2);
  const initialY = Math.round(workArea.y + workArea.height - collapsedHeight - margin);

  const win = new BrowserWindow({
    width,
    height: collapsedHeight,
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

  // Place at bottom-center above dock/taskbar
  win.setPosition(initialX, initialY);
  // Allow resizing down to virtually any size
  try {
    win.setMinimumSize(420, 300);
  } catch (_) {}
  win.once('ready-to-show', () => win.show());

  // Expand handler from renderer
  ipcMain.on('chat:expand', () => {
    try {
      const currentBounds = win.getBounds();
      const y = Math.round(workArea.y + workArea.height - expandedHeight - margin);
      // Preserve current width to not force a larger size; only adjust height and y
      win.setBounds({ x: currentBounds.x, y, width: currentBounds.width, height: expandedHeight }, true);
      win.focus();
    } catch (e) {
      // ignore failures
    }
  });

  // Prevent chat window content from appearing in screenshots/recordings
  try {
    if (typeof win.setContentProtection === 'function') {
      win.setContentProtection(true);
    }
  } catch (_) {}

  return win;
}

module.exports = createChatWindow;
