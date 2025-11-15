
// Manages overlay IPC channels
const { ipcMain } = require('electron');

function registerOverlayIPC({ onReady, onToggle, onMarkDone, onAutoAdvanceRequest, onPointerMode }) {
  ipcMain.on('overlay:ready', () => onReady?.());
  ipcMain.on('overlay:toggle', () => onToggle?.());
  ipcMain.on('overlay:done', (_event, stepId) => onMarkDone?.(stepId));
  ipcMain.on('overlay:autoAdvance', (_event, enabled) => onAutoAdvanceRequest?.(enabled));
  ipcMain.on('overlay:pointer-mode', (_event, mode) => onPointerMode?.(mode));
}

module.exports = registerOverlayIPC;

module.exports = registerOverlayIPC;
