// Manages overlay IPC channels
// 
// Channels (all events from overlay window to main process):
//   - 'overlay:ready' — overlay window is ready for first step
//   - 'overlay:toggle' — toggle overlay visibility
//   - 'overlay:done' — user marks current step as complete
//     Payload: string (stepId)
//   - 'overlay:autoAdvance' — user enables/disables auto-advance
//     Payload: boolean
//   - 'overlay:pointer-mode' — toggle pointer mode for overlay interactivity
//     Payload: 'interactive' | 'passthrough'
//
// Main → Overlay communication uses webContents.send():
//   - main.js sends 'overlay:step' with parsed step payload

const { ipcMain } = require('electron');

/**
 * Register overlay IPC handlers.
 * 
 * @param {Object} handlers
 * @param {Function} handlers.onReady - Called when overlay is ready: () => void
 * @param {Function} handlers.onToggle - Called when user toggles overlay: () => void
 * @param {Function} handlers.onMarkDone - Called when user completes step: (stepId: string) => void
 * @param {Function} handlers.onAutoAdvanceRequest - Called when user sets auto-advance: (enabled: boolean) => void
 * @param {Function} handlers.onPointerMode - Called to set pointer mode: (mode: 'interactive' | 'passthrough') => void
 */
function registerOverlayIPC({ onReady, onToggle, onMarkDone, onAutoAdvanceRequest, onPointerMode }) {
  // 'overlay:ready' — overlay window is ready for first step
  // Connect this to stepController.requestNextStep() to begin the workflow
  ipcMain.on('overlay:ready', () => {
    console.log('[IPC] Overlay ready');
    onReady?.();
  });

  // 'overlay:toggle' — user toggles overlay visibility
  // Typically triggered by a global hotkey
  ipcMain.on('overlay:toggle', () => {
    console.log('[IPC] Overlay toggle requested');
    onToggle?.();
  });

  // 'overlay:done' — user marks current step as complete
  // Payload: stepId (string) - must match the step ID from the current guidance
  // Connect this to stepController.markDone(stepId) to advance workflow
  ipcMain.on('overlay:done', (_event, stepId) => {
    if (typeof stepId === 'string') {
      console.log('[IPC] Step marked done:', stepId);
      onMarkDone?.(stepId);
    } else {
      console.warn('[IPC] Invalid stepId:', stepId);
    }
  });

  // 'overlay:autoAdvance' — user enables/disables auto-advance
  // Payload: boolean (true = auto-advance enabled)
  ipcMain.on('overlay:autoAdvance', (_event, enabled) => {
    if (typeof enabled === 'boolean') {
      console.log('[IPC] Auto-advance set to:', enabled);
      onAutoAdvanceRequest?.(enabled);
    }
  });

  // 'overlay:pointer-mode' — toggle pointer mode
  // Payload: 'interactive' | 'passthrough'
  // 'interactive' = overlay responds to mouse events
  // 'passthrough' = overlay ignores mouse events (lets app behind it respond)
  ipcMain.on('overlay:pointer-mode', (_event, mode) => {
    if (mode === 'interactive' || mode === 'passthrough') {
      console.log('[IPC] Pointer mode set to:', mode);
      onPointerMode?.(mode);
    }
  });
}

module.exports = registerOverlayIPC;