const { app, BrowserWindow } = require('electron');

const createOverlayWindow = require('./windows/overlayWindow');
const createChatWindow = require('./windows/chatWindow');
const registerOverlayIPC = require('./ipc/overlayIPC');
const registerChatIPC = require('./ipc/chatIPC');
const stepController = require('./services/stepController');
const storage = require('./services/storage');

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
      // Start requesting steps from stepController
      stepController.requestNextStep();
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
    },
    onLoadHistory: async () => {
      // Return persisted chat history from storage service
      const history = await storage.loadChatHistory();
      return history;
    }
  });
}

app.whenReady().then(async () => {
  // Initialize storage
  await storage.init();

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

  createWindows();
  setupIPC();

  // Hotkey registration removed — handle global shortcuts elsewhere if needed.

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindows();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});