const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electron', {
    onPdfFile: (callback) => ipcRenderer.on('pdf-file', (_event, value) => callback(value)),
    changePdf: () => ipcRenderer.send('change-pdf'),
    savePdf: (ulLat, ulLong, lrLat, lrLong) => ipcRenderer.send('save-pdf', ulLat, ulLong, lrLat, lrLong)
});

// See the Electron documentation for details on how to use preload scripts:
// https://www.electronjs.org/docs/latest/tutorial/process-model#preload-scripts
