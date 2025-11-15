const { ipcMain } = require('electron');

function registerOverlayIPC({ onReady, onToggle, onMarkDone, onAutoAdvanceRequest }) {
  ipcMain.on('overlay:ready', () => onReady?.());
  ipcMain.on('overlay:toggle', () => onToggle?.());
  ipcMain.on('overlay:done', (_event, stepId) => onMarkDone?.(stepId));
  ipcMain.on('overlay:autoAdvance', (_event, enabled) => onAutoAdvanceRequest?.(enabled));
}

module.exports = registerOverlayIPC;
