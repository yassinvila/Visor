const { app, BrowserWindow } = require('electron');

const createOverlayWindow = require('./windows/overlayWindow');
const createChatWindow = require('./windows/chatWindow');
const { createSplashWindow, closeSplashWindow } = require('./windows/splashWindow');
const registerOverlayIPC = require('./ipc/overlayIPC');
const registerChatIPC = require('./ipc/chatIPC');
const stepController = require('./services/stepController');
const storage = require('./services/storage');

let overlayWindow;
let chatWindow;
let splashWindow;

const isDev = process.env.VISOR_DEV_SERVER === 'true';

function createWindows() {
  overlayWindow = createOverlayWindow();
  // Register overlay with screenCapture so screenshots omit the overlay
  try {
    const screenCapture = require('./services/screenCapture');
    if (screenCapture && typeof screenCapture.setOverlayWindow === 'function') {
      screenCapture.setOverlayWindow(overlayWindow);
    }
  } catch (err) {
    console.warn('Failed to register overlay window with screenCapture:', err?.message || err);
  }
  chatWindow = createChatWindow();

  overlayWindow.on('closed', () => {
    // Clear overlay reference in capture service
    try {
      const screenCapture = require('./services/screenCapture');
      if (screenCapture && typeof screenCapture.clearOverlayWindow === 'function') {
        screenCapture.clearOverlayWindow();
      }
    } catch (_) {}
    overlayWindow = undefined;
  });

  chatWindow.on('closed', () => {
    chatWindow = undefined;
  });
}

function setupIPC() {
  const { ipcMain } = require('electron');
  
  // Splash screen completion handler
  ipcMain.on('splash:complete', () => {
    console.log('[Main] Splash animation complete, creating main windows');
    closeSplashWindow();
    createWindows();
  });
  
  // Window control handlers
  ipcMain.on('window-close', (event) => {
    const window = BrowserWindow.fromWebContents(event.sender);
    if (window) window.close();
  });
  
  ipcMain.on('window-minimize', (event) => {
    const window = BrowserWindow.fromWebContents(event.sender);
    if (window) window.minimize();
  });
  
  registerOverlayIPC({
    onReady: () => {
      // Overlay is ready; wait for a goal before requesting steps
    },
    onToggle: () => {
      // mirror renderer toggle request with global hotkey behaviour
      if (chatWindow) {
        chatWindow.isVisible() ? chatWindow.hide() : chatWindow.show();
      }
    },
    onMarkDone: (stepId) => {
      // Forward step completion to stepController
      stepController.markDone(stepId);
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
      // Store the message and set goal in stepController
      storage.saveChatMessage({ role: 'user', text: message });
      stepController.setGoal(message);
      // Immediately request the first step for this goal (captures screenshot now)
      stepController.requestNextStep();
    },
    onLoadHistory: async () => {
      // Return persisted chat history from storage service
      const history = await storage.loadChatHistory();
      return history;
    }
  });
}

app.whenReady().then(async () => {
  // Show splash screen first
  splashWindow = createSplashWindow();

  // Initialize storage
  await storage.init();

  // Setup IPC handlers (including splash completion) BEFORE initializing stepController
  setupIPC();

  // Initialize stepController with callbacks to send steps to overlay and save to chat
  stepController.init({
    onStep: (step) => {
      // Save step to storage
      storage.logStep(stepController.getState().currentSessionId, step, { fromLLM: true });
      // Send step to overlay window for rendering
      overlayWindow?.webContents.send('overlay:step', step);
      // Optionally save assistant message to chat history
      storage.saveChatMessage({
        role: 'assistant',
        text: step.step_description || step.hintText || '',
        sessionId: stepController.getState().currentSessionId
      });
    },
    onComplete: (summary) => {
      // Session finished; notify overlay
      overlayWindow?.webContents.send('overlay:complete', summary);
      // Optionally save completion message to chat
      storage.saveChatMessage({
        role: 'system',
        text: `Session complete: ${summary.finalGoal || 'No goal'}`,
        sessionId: stepController.getState().currentSessionId
      });
    },
    onError: (error) => {
      // Error occurred; notify overlay and chat
      const errorMsg = error?.message || String(error);
      overlayWindow?.webContents.send('overlay:error', { message: errorMsg });
      storage.logError(error);
      storage.saveChatMessage({
        role: 'system',
        text: `Error: ${errorMsg}`
      });
    }
  });

  // Note: createWindows() is called when splash:complete is received
  // Hotkey registration removed — handle global shortcuts elsewhere if needed.
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    // On macOS re-activation, show splash if no windows exist
    splashWindow = createSplashWindow();
  }
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});