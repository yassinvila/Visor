const { globalShortcut } = require('electron');

function registerHotkeys({ onToggleOverlay, onMarkDone }) {
  globalShortcut.register('CommandOrControl+Shift+O', () => onToggleOverlay?.());
  globalShortcut.register('CommandOrControl+Shift+D', () => onMarkDone?.());
}

function unregisterHotkeys() {
  globalShortcut.unregisterAll();
}

module.exports = {
  registerHotkeys,
  unregisterHotkeys
};
