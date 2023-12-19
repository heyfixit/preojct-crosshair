const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electron', {
  ipcRenderer: {
    on: (channel, func) => {
      ipcRenderer.on(channel, (_event, ...args) => func(...args));
    },
    send: (channel, ...args) => {
      ipcRenderer.send(channel, ...args);
    },
  },
});
