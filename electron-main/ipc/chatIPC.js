// Manages chat IPC channels
const { ipcMain } = require('electron');

function registerChatIPC({ onMessageSend, onLoadHistory }) {
	ipcMain.on('chat:send', (_event, message) => onMessageSend?.(message));

	// chat:history is an invoke from renderer expecting a promise/array
	ipcMain.handle('chat:history', async (_event) => {
		return (await onLoadHistory?.()) || [];
	});
}

module.exports = registerChatIPC;
function registerChatIPC({ onSendMessage, onHistoryRequest }) {
  ipcMain.on('chat:send', (_event, message) => onSendMessage?.(message));
  ipcMain.handle('chat:history', () => onHistoryRequest?.() ?? []);
}

module.exports = registerChatIPC;
