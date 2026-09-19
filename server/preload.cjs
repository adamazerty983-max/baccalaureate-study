const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  isElectron: true,
  platform: process.platform,
  versions: {
    node: process.versions.node,
    chrome: process.versions.chrome,
    electron: process.versions.electron,
  },
  updater: {
    onStatusChange: (callback) => {
      const subscription = (event, data) => callback(data);
      ipcRenderer.on('updater:status', subscription);
      return () => ipcRenderer.removeListener('updater:status', subscription);
    },
    checkForUpdates: () => ipcRenderer.invoke('updater:check'),
    restartAndInstall: () => ipcRenderer.invoke('updater:restart-and-install'),
    getAppVersion: () => ipcRenderer.invoke('updater:get-app-version'),
  },
});
