const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('visor', {
  splash: {
    complete: () => ipcRenderer.send('splash:complete')
  },
  overlay: {
    ready: () => ipcRenderer.send('overlay:ready'),
    toggle: () => ipcRenderer.send('overlay:toggle'),
    markDone: (id) => ipcRenderer.send('overlay:done', id),
    setAutoAdvance: (enabled) => ipcRenderer.send('overlay:autoAdvance', enabled),
    setPointerMode: (mode) => ipcRenderer.send('overlay:pointer-mode', mode),
    onStepUpdate: (callback) => {
      ipcRenderer.on('overlay:step', (_event, payload) => callback(payload));
      return () => ipcRenderer.removeAllListeners('overlay:step');
    },
    onReset: (callback) => {
      ipcRenderer.on('overlay:reset', callback);
      return () => ipcRenderer.removeAllListeners('overlay:reset');
    }
  },
  chat: {
    sendMessage: (message) => ipcRenderer.send('chat:send', message),
    onMessage: (callback) => {
      ipcRenderer.on('chat:message', (_event, payload) => callback(payload));
      return () => ipcRenderer.removeAllListeners('chat:message');
    },
    loadHistory: () => ipcRenderer.invoke('chat:history')
  },
  window: {
    close: () => ipcRenderer.send('window-close'),
    minimize: () => ipcRenderer.send('window-minimize')
  }
});
