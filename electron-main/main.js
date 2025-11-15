const { app, ipcMain } = require('electron');
const path = require('path');

const createOverlayWindow = require('./windows/overlayWindow');
const createChatWindow = require('./windows/chatWindow');
const registerOverlayIPC = require('./ipc/overlayIPC');
const registerChatIPC = require('./ipc/chatIPC');
const { registerHotkeys, unregisterHotkeys } = require('./services/hotkeys');

let overlayWindow;
let chatWindow;

const isDev = process.env.VISOR_DEV_SERVER === 'true';

function createWindows() {
  overlayWindow = createOverlayWindow();
  chatWindow = createChatWindow();

  overlayWindow.on('closed', () => {
    overlayWindow = undefined;
  });

  chatWindow.on('closed', () => {
    chatWindow = undefined;
  });
}

function setupIPC() {
  registerOverlayIPC({
    onReady: () => {
      // placeholder: request first step from backend
    },
    onToggle: () => {
      // mirror renderer toggle request with global hotkey behaviour
    },
    onMarkDone: (stepId) => {
      console.log('Step completed', stepId);
    },
    onAutoAdvanceRequest: (enabled) => {
      console.log('Auto advance set to', enabled);
    }
  });

  registerChatIPC({
    onSendMessage: (message) => {
      console.log('User asked:', message);
      // placeholder: send to LLM service and then forward response via IPC
      overlayWindow?.webContents.send('overlay:step', {
        id: `mock-${Date.now()}`,
        title: 'Mock step from main',
        description: 'This is coming from Electron main process',
        actionHint: 'Implement LLM to replace this',
        annotation: 'circle',
        target: { x: 400, y: 300, width: 120, height: 60 }
      });
    },
    onHistoryRequest: () => [
      {
        id: 'seed-1',
        role: 'assistant',
        content: 'Welcome to Visor! I can guide you through desktop flows.'
      }
    ]
  });
}

function setupLifecycle() {
  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
      app.quit();
    }
  });

  app.on('activate', () => {
    if (!overlayWindow) {
      createWindows();
    }
  });
}

async function main() {
  if (!isDev) {
    app.disableHardwareAcceleration();
  }

  await app.whenReady();
  createWindows();
  setupIPC();
  registerHotkeys({
    onToggleOverlay: () => overlayWindow?.webContents.send('overlay:toggle'),
    onMarkDone: () => overlayWindow?.webContents.send('overlay:done-hotkey')
  });
  setupLifecycle();

  app.on('before-quit', () => {
    unregisterHotkeys();
  });
}

main().catch((error) => {
  console.error('Failed to start Visor main process', error);
  app.quit();
});
