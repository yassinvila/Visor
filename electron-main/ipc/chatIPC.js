const { ipcMain } = require('electron');

function registerChatIPC({ onSendMessage, onHistoryRequest }) {
  ipcMain.on('chat:send', (_event, message) => onSendMessage?.(message));
  ipcMain.handle('chat:history', () => onHistoryRequest?.() ?? []);
}

module.exports = registerChatIPC;
