// Secure preload bridge for the Co-Flow Electron desktop prototype.
// Renderer windows cannot access Node directly, so only a small safe desktop API is exposed.
// These functions send IPC messages to electron/main.cjs.

const { contextBridge, ipcRenderer } = require('electron');

// Expose only the desktop actions needed by the dashboard and floating window.
// This keeps contextIsolation enabled while still supporting the prototype workflow.
contextBridge.exposeInMainWorld('coflowDesktop', {
  openDashboard: () => ipcRenderer.send('coflow-open-dashboard'),
  openRecovery: () => ipcRenderer.send('coflow-open-recovery'), // Detailed note: this line keeps the renderer bridge small and safe for the desktop prototype.
  setAlertMode: (active) => ipcRenderer.send('coflow-alert-mode', Boolean(active)),
  stopAlertFeedback: () => ipcRenderer.send('coflow-stop-alert-feedback'),
  snoozeAlert: (ms) => ipcRenderer.send('coflow-snooze-alert', ms)
}); // Detailed note: this line keeps the renderer bridge small and safe for the desktop prototype.
