const { app, BrowserWindow } = require('electron');

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
      if (chatWindow) {
        chatWindow.isVisible() ? chatWindow.hide() : chatWindow.show();
      }
    },
    onMarkDone: (stepId) => {
      console.log('Step completed', stepId);
      // TODO: forward to stepController when implemented
    },
    onAutoAdvanceRequest: (enabled) => {
      console.log('Auto advance set to', enabled);
    },
    onPointerMode: (mode) => {
      const ignore = mode !== 'interactive';
      overlayWindow?.setIgnoreMouseEvents(ignore, { forward: true });
    }
  });

  registerChatIPC({
    onMessageSend: (message) => {
      console.log('Chat message from renderer:', message);
      // TODO: forward messages to LLM client / step controller
    },
    onLoadHistory: async () => {
      // TODO: return persisted chat history from storage service
      return [];
    }
  });
}

app.whenReady().then(() => {
  createWindows();
  setupIPC();

  registerHotkeys({
    onToggleOverlay: () => {
      if (chatWindow) chatWindow.isVisible() ? chatWindow.hide() : chatWindow.show();
    },
    onMarkDone: () => {
      console.log('Global mark done');
    }
  });

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindows();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('will-quit', () => {
  unregisterHotkeys();
});
// end of main process code