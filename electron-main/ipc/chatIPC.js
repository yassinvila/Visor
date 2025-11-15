// Manages chat IPC channels
// 
// Channels:
//   - 'chat:send' — user sends a message from chat UI
//     Payload: string (the chat message / task goal)
//   - 'chat:history' — renderer requests chat message history
//     Returns: Promise<Array> of message objects

const { ipcMain } = require('electron');

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
}

module.exports = registerChatIPC;