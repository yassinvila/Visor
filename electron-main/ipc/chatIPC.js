// Manages chat IPC channels
// 
// Channels:
//   - 'chat:send' — user sends a message from chat UI
//     Payload: string (the chat message / task goal)
//   - 'chat:history' — renderer requests chat message history
//     Returns: Promise<Array> of message objects

const { ipcMain, BrowserWindow } = require('electron');
const storage = require('../services/storage');

/**
 * Register chat IPC handlers.
 * 
 * @param {Object} handlers
 * @param {Function} handlers.onMessageSend - Called when user sends message: (message: string) => void
 * @param {Function} handlers.onLoadHistory - Called when renderer requests history: async () => Promise<Array>
 */
function registerChatIPC({ onMessageSend, onLoadHistory }) {
  // 'chat:send' — user sends a message from the chat UI
  // The renderer sends this via window.visor.chat.sendMessage(message)
  // The message is typically a task goal like "Create a Jira ticket"
  ipcMain.on('chat:send', (_event, message) => {
    if (typeof message === 'string') {
      onMessageSend?.(message);
    }
  });

  // 'chat:history' — renderer requests persisted chat history
  // The renderer invokes this via window.visor.chat.loadHistory()
  // Should return an array of message objects: { id, role, content, timestamp }
  ipcMain.handle('chat:history', async (_event) => {
    try {
      const history = await onLoadHistory?.();
      return history || [];
    } catch (error) {
      console.error('Error loading chat history:', error);
      return [];
    }
  });

  // 'chat:clear' — renderer requests to clear chat history
  ipcMain.handle('chat:clear', async () => {
    try {
      await storage.clearChatHistory();
      return { ok: true };
    } catch (error) {
      console.error('Error clearing chat history:', error);
      return { ok: false, error: String(error?.message || error) };
    }
  });
}

module.exports = registerChatIPC;