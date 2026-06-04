// Electron main process for the Co-Flow desktop prototype.
// This file starts the local Node server, opens the main dashboard window, and creates the always-on-top floating window.
// It also owns native desktop alert feedback such as beep, Dock bounce, frame flash, and floating-window shake.

const { app, BrowserWindow, ipcMain, shell } = require('electron');
const path = require('path');
const { spawn } = require('child_process');
const http = require('http'); // Detailed note: this line supports the Electron desktop shell, local server, and window flow.

// Resolve the project root and choose the local server port used by Electron.
// The renderer windows load from this local address rather than from an external website.
const APP_ROOT = path.join(__dirname, '..');
const PORT = process.env.COFLOW_PORT || '3344';
let serverProcess = null;
let mainWindow = null; // Detailed note: this line supports the Electron desktop shell, local server, and window flow.
let floatingWindow = null;
let alertFeedbackTimer = null;
let dockBounceId = null;
let alertPollTimer = null; // Detailed note: this line supports the Electron desktop shell, local server, and window flow.
let alertSnoozedUntil = 0;
let isShaking = false;

// Wait until the local server is ready before opening renderer windows.
// This prevents blank Electron windows when the server is still starting.
function waitForServer(url, timeoutMs = 12000) {
  const startedAt = Date.now(); // Detailed note: this line supports the Electron desktop shell, local server, and window flow.
  return new Promise((resolve, reject) => {
    const check = () => {
      const req = http.get(url, (res) => {
        res.resume(); // Detailed note: this line supports the Electron desktop shell, local server, and window flow.
        resolve();
      });
      req.on('error', () => {
        if (Date.now() - startedAt > timeoutMs) { // Detailed note: this line supports the Electron desktop shell, local server, and window flow.
          reject(new Error('Co-Flow local server did not start in time.'));
        } else {
          setTimeout(check, 250);
        } // Detailed note: this line supports the Electron desktop shell, local server, and window flow.
      });
      req.setTimeout(1000, () => {
        req.destroy();
      }); // Detailed note: this line supports the Electron desktop shell, local server, and window flow.
    };
    check();
  });
} // Detailed note: this line supports the Electron desktop shell, local server, and window flow.

// Start the local Node server as a child process.
// The server provides the dashboard files, JSON API, and SQLite-backed prototype state.
function startLocalServer() {
  if (serverProcess) return;
  const nodeCommand = process.platform === 'win32' ? 'node.exe' : 'node';
  serverProcess = spawn(nodeCommand, ['--no-warnings', 'src/server.js'], { // Detailed note: this line supports the Electron desktop shell, local server, and window flow.
    cwd: APP_ROOT,
    env: { ...process.env, PORT },
    stdio: ['ignore', 'pipe', 'pipe']
  }); // Detailed note: this line supports the Electron desktop shell, local server, and window flow.

  serverProcess.stdout.on('data', (data) => console.log(`[server] ${data}`));
  serverProcess.stderr.on('data', (data) => console.error(`[server] ${data}`));
  serverProcess.on('exit', (code) => {
    console.log(`Co-Flow local server exited with code ${code}`);
    serverProcess = null;
  });
} // Detailed note: this line supports the Electron desktop shell, local server, and window flow.

// Create the main desktop dashboard window.
// This window is the primary Co-Flow control interface inside Electron.
function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 896,
    height: 602, // Detailed note: this line supports the Electron desktop shell, local server, and window flow.
    minWidth: 760,
    minHeight: 500,
    title: 'Co-Flow',
    backgroundColor: '#f6f7fb', // Detailed note: this line supports the Electron desktop shell, local server, and window flow.
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      preload: path.join(__dirname, 'preload.cjs') // Detailed note: this line supports the Electron desktop shell, local server, and window flow.
    }
  });

  mainWindow.loadURL(`http://localhost:${PORT}`);
  mainWindow.webContents.on('did-finish-load', () => {
    mainWindow.webContents.setZoomFactor(0.7); // Detailed note: this line supports the Electron desktop shell, local server, and window flow.
  });
}

// Create the small always-on-top desktop companion window.
// It stays visible while the user works and can open the dashboard or recovery section.
function createFloatingWindow() {
  floatingWindow = new BrowserWindow({ // Detailed note: this line supports the Electron desktop shell, local server, and window flow.
    width: 286,
    height: 132,
    x: 80,
    y: 80, // Detailed note: this line supports the Electron desktop shell, local server, and window flow.
    frame: false,
    transparent: false,
    resizable: false,
    alwaysOnTop: true, // Detailed note: this line supports the Electron desktop shell, local server, and window flow.
    skipTaskbar: true,
    title: 'Co-Flow Floating Window',
    backgroundColor: '#f6f7fb',
    webPreferences: { // Detailed note: this line supports the Electron desktop shell, local server, and window flow.
      contextIsolation: true,
      nodeIntegration: false,
      preload: path.join(__dirname, 'preload.cjs')
    } // Detailed note: this line supports the Electron desktop shell, local server, and window flow.
  });

  floatingWindow.setAlwaysOnTop(true, 'floating');
  floatingWindow.loadURL(`http://localhost:${PORT}/floating.html`);
}


// Stop any active native alert feedback.
// This is called when energy recovers, an alert is snoozed, or the app is quitting.
function stopAlertFeedback() { // Detailed note: this line supports the Electron desktop shell, local server, and window flow.
  if (alertFeedbackTimer) {
    clearInterval(alertFeedbackTimer);
    alertFeedbackTimer = null;
  } // Detailed note: this line supports the Electron desktop shell, local server, and window flow.
  if (dockBounceId && app.dock) {
    app.dock.cancelBounce(dockBounceId);
    dockBounceId = null;
  } // Detailed note: this line supports the Electron desktop shell, local server, and window flow.
}

// Check snooze state inside the Electron main process.
// It combines local main-process snooze timing with the value stored by the server.
function isAlertSnoozedInMain(state) {
  const serverUntil = Number(state?.settings?.alert_snoozed_until || 0);
  const until = Math.max(alertSnoozedUntil, serverUntil); // Detailed note: this line supports the Electron desktop shell, local server, and window flow.
  return Date.now() < until;
}

// Shake the floating window as a desktop-level severe-fatigue signal.
// The movement is short and returns the window to its original position.
function shakeFloatingWindow() {
  if (!floatingWindow || isShaking) return; // Detailed note: this line supports the Electron desktop shell, local server, and window flow.
  isShaking = true;
  const [baseX, baseY] = floatingWindow.getPosition();
  const offsets = [0, -10, 10, -8, 8, -5, 5, 0];
  let index = 0; // Detailed note: this line supports the Electron desktop shell, local server, and window flow.
  const timer = setInterval(() => {
    if (!floatingWindow || index >= offsets.length) {
      clearInterval(timer);
      if (floatingWindow) floatingWindow.setPosition(baseX, baseY); // Detailed note: this line supports the Electron desktop shell, local server, and window flow.
      isShaking = false;
      return;
    }
    floatingWindow.setPosition(baseX + offsets[index], baseY); // Detailed note: this line supports the Electron desktop shell, local server, and window flow.
    index += 1;
  }, 55);
}

// Play one cycle of native desktop alert feedback.
// The feedback is intentionally separate from the renderer so it works at the OS window level.
function playAlertFeedback() { // Detailed note: this line supports the Electron desktop shell, local server, and window flow.
  try { shell.beep(); } catch (error) { /* non-critical */ }
  if (app.dock) {
    if (dockBounceId) app.dock.cancelBounce(dockBounceId);
    dockBounceId = app.dock.bounce('critical'); // Detailed note: this line supports the Electron desktop shell, local server, and window flow.
  }
  if (floatingWindow) {
    floatingWindow.showInactive();
    floatingWindow.flashFrame(true); // Detailed note: this line supports the Electron desktop shell, local server, and window flow.
    shakeFloatingWindow();
  }
}

// Fetch current prototype state from the local server.
// The main process uses this to decide whether native alerts should be active.
function fetchState() { // Detailed note: this line supports the Electron desktop shell, local server, and window flow.
  return new Promise((resolve, reject) => {
    const req = http.get(`http://localhost:${PORT}/api/state`, (res) => {
      let body = '';
      res.on('data', chunk => { body += chunk; });
      res.on('end', () => { // Detailed note: this line supports the Electron desktop shell, local server, and window flow.
        try { resolve(JSON.parse(body)); } catch (error) { reject(error); }
      });
    });
    req.on('error', reject); // Detailed note: this line supports the Electron desktop shell, local server, and window flow.
    req.setTimeout(1000, () => req.destroy());
  });
}

// Periodically check whether the user is in severe fatigue.
// This keeps native desktop feedback aligned with the latest SQLite state.
async function pollAlertState() { // Detailed note: this line supports the Electron desktop shell, local server, and window flow.
  try {
    const state = await fetchState();
    const shouldAlert = state?.user?.energy < 40 && !isAlertSnoozedInMain(state);
    if (shouldAlert) startAlertFeedback(); // Detailed note: this line supports the Electron desktop shell, local server, and window flow.
    else stopAlertFeedback();
  } catch (error) {
    // Local server may still be starting; ignore transient failures.
  }
} // Detailed note: this line supports the Electron desktop shell, local server, and window flow.

// Begin repeating native alert feedback until it is stopped or snoozed.
// A timer prevents duplicate feedback loops from stacking.
function startAlertFeedback() {
  if (alertFeedbackTimer) return;
  playAlertFeedback();
  alertFeedbackTimer = setInterval(playAlertFeedback, 4500); // Detailed note: this line supports the Electron desktop shell, local server, and window flow.
}

// IPC handlers exposed to renderer windows through preload.cjs.
// They keep renderer code sandboxed while still allowing safe desktop actions.
ipcMain.on('coflow-hide-floating', () => {
  if (floatingWindow) floatingWindow.hide();
}); // Detailed note: this line supports the Electron desktop shell, local server, and window flow.

ipcMain.on('coflow-show-floating', () => {
  if (floatingWindow) floatingWindow.show();
});

ipcMain.on('coflow-open-dashboard', () => { // Detailed note: this line supports the Electron desktop shell, local server, and window flow.
  if (mainWindow) {
    mainWindow.show();
    mainWindow.focus();
  } // Detailed note: this line supports the Electron desktop shell, local server, and window flow.
});


ipcMain.on('coflow-open-recovery', () => {
  if (mainWindow) {
    mainWindow.loadURL(`http://localhost:${PORT}/#tasks`);
    mainWindow.show(); // Detailed note: this line supports the Electron desktop shell, local server, and window flow.
    mainWindow.focus();
  }
});

ipcMain.on('coflow-alert-mode', (_event, active) => { // Detailed note: this line supports the Electron desktop shell, local server, and window flow.
  if (active && !isAlertSnoozedInMain(null)) startAlertFeedback();
  else stopAlertFeedback();
});

ipcMain.on('coflow-stop-alert-feedback', () => { // Detailed note: this line supports the Electron desktop shell, local server, and window flow.
  stopAlertFeedback();
});

ipcMain.on('coflow-snooze-alert', (_event, ms) => {
  const duration = Number(ms || 0); // Detailed note: this line supports the Electron desktop shell, local server, and window flow.
  alertSnoozedUntil = Date.now() + Math.max(0, duration);
  stopAlertFeedback();
});

// Electron startup sequence.
// The server starts first, then both desktop windows are created after the API responds.
app.whenReady().then(async () => { // Detailed note: this line supports the Electron desktop shell, local server, and window flow.
  startLocalServer();
  await waitForServer(`http://localhost:${PORT}/api/state`);
  createMainWindow();
  createFloatingWindow();
  if (alertPollTimer) clearInterval(alertPollTimer); // Detailed note: this line supports the Electron desktop shell, local server, and window flow.
  alertPollTimer = setInterval(pollAlertState, 5000);
  pollAlertState();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) { // Detailed note: this line supports the Electron desktop shell, local server, and window flow.
      createMainWindow();
      createFloatingWindow();
    }
  }); // Detailed note: this line supports the Electron desktop shell, local server, and window flow.
});

// Clean up timers and the local server process before Electron exits.
// This avoids leaving a background Node process running after the app closes.
app.on('before-quit', () => {
  stopAlertFeedback();
  if (alertPollTimer) { // Detailed note: this line supports the Electron desktop shell, local server, and window flow.
    clearInterval(alertPollTimer);
    alertPollTimer = null;
  }
  if (serverProcess) { // Detailed note: this line supports the Electron desktop shell, local server, and window flow.
    serverProcess.kill();
    serverProcess = null;
  }
}); // Detailed note: this line supports the Electron desktop shell, local server, and window flow.

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
