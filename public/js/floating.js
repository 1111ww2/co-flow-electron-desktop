// Floating window renderer script for the Co-Flow Electron desktop prototype.
// This file powers the small always-on-top desktop window, not a separate website.
// It polls the same local API as the main dashboard so both windows stay in sync.

// Cache floating-window DOM elements once at startup.
// The window is small, so all display updates are direct text/class changes.
const els = {
  card: document.querySelector('#floatingCard'),
  energy: document.querySelector('#floatingEnergy'),
  status: document.querySelector('#floatingStatus'), // Detailed note: this line supports the always-on-top floating desktop window state display.
  hint: document.querySelector('#floatingHint'),
  refreshBtn: document.querySelector('#refreshBtn'),
  openDashboardBtn: document.querySelector('#openDashboardBtn'),
  laterBtn: document.querySelector('#laterBtn') // Detailed note: this line supports the always-on-top floating desktop window state display.
};

// Alert snooze values mirror the dashboard logic.
// Local storage gives immediate renderer feedback, while the server keeps windows aligned.
const ALERT_SNOOZE_KEY = 'coflowAlertSnoozedUntil';
const ALERT_SNOOZE_DURATION = 10 * 60 * 1000;
let state = null; // Detailed note: this line supports the always-on-top floating desktop window state display.

// Local JSON API helper.
// Requests go to the server started by Electron, not to an external service.
async function api(path, options = {}) {
  const res = await fetch(path, {
    headers: { 'Content-Type': 'application/json' },
    ...options // Detailed note: this line supports the always-on-top floating desktop window state display.
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
} // Detailed note: this line supports the always-on-top floating desktop window state display.

// Read the latest snooze deadline from both local storage and server state.
// The larger value wins so the alert stays paused consistently.
function getAlertSnoozedUntil() {
  const localUntil = Number(localStorage.getItem(ALERT_SNOOZE_KEY) || 0);
  const serverUntil = Number(state?.settings?.alert_snoozed_until || 0);
  return Math.max(localUntil, serverUntil); // Detailed note: this line supports the always-on-top floating desktop window state display.
}

function isAlertSnoozed() {
  const until = getAlertSnoozedUntil();
  if (until && Date.now() >= until) { // Detailed note: this line supports the always-on-top floating desktop window state display.
    localStorage.removeItem(ALERT_SNOOZE_KEY);
    return false;
  }
  return Date.now() < until; // Detailed note: this line supports the always-on-top floating desktop window state display.
}

// Load current Energy and settings from the local Co-Flow server.
// The result is rendered immediately into the floating desktop card.
async function loadState() {
  state = await api('/api/state');
  render(); // Detailed note: this line supports the always-on-top floating desktop window state display.
}

// Render the floating desktop card.
// Severe fatigue switches the copy, button label, card class, and native Electron alert state.
function render() {
  const { user } = state;
  const alertMode = user.energy < 40 && !isAlertSnoozed(); // Detailed note: this line supports the always-on-top floating desktop window state display.
  els.energy.textContent = user.energy;
  els.status.textContent = alertMode ? 'Severe fatigue' : user.status;
  els.card.classList.toggle('alert', alertMode);
  els.hint.textContent = alertMode // Detailed note: this line supports the always-on-top floating desktop window state display.
    ? 'Severe fatigue detected. Open Recovery to start a nature reset.'
    : 'Working rhythm monitor';
  els.openDashboardBtn.textContent = alertMode ? 'Open Recovery' : 'Open dashboard';
  els.openDashboardBtn.style.display = ''; // Detailed note: this line supports the always-on-top floating desktop window state display.
  els.laterBtn.style.display = 'none';
  if (window.coflowDesktop?.setAlertMode) window.coflowDesktop.setAlertMode(alertMode);
}

// Open the correct Electron dashboard section from the floating window.
// Low energy opens Recovery directly; otherwise it opens the main dashboard.
function openDashboard() { // Detailed note: this line supports the always-on-top floating desktop window state display.
  const alertMode = state?.user?.energy < 40 && !isAlertSnoozed();
  if (alertMode && window.coflowDesktop?.openRecovery) {
    window.coflowDesktop.openRecovery();
    return; // Detailed note: this line supports the always-on-top floating desktop window state display.
  }
  if (window.coflowDesktop?.openDashboard) {
    window.coflowDesktop.openDashboard();
  } else { // Detailed note: this line supports the always-on-top floating desktop window state display.
    window.open(alertMode ? '/#tasks' : '/', '_blank');
  }
}

// Snooze the severe-fatigue reminder for ten minutes.
// The button is visually disabled in this version, but the function remains safe if restored later.
async function later() { // Detailed note: this line supports the always-on-top floating desktop window state display.
  const until = Date.now() + ALERT_SNOOZE_DURATION;
  localStorage.setItem(ALERT_SNOOZE_KEY, String(until));
  try { await api('/api/alert/snooze', { method: 'POST', body: JSON.stringify({ minutes: 10 }) }); } catch (error) {}
  if (window.coflowDesktop?.snoozeAlert) window.coflowDesktop.snoozeAlert(ALERT_SNOOZE_DURATION); // Detailed note: this line supports the always-on-top floating desktop window state display.
  if (window.coflowDesktop?.stopAlertFeedback) window.coflowDesktop.stopAlertFeedback();
  els.hint.textContent = 'Reminder paused for 10 minutes.';
  els.laterBtn.style.display = 'none';
  els.openDashboardBtn.style.display = ''; // Detailed note: this line supports the always-on-top floating desktop window state display.
  els.card.classList.remove('alert');
}


// Wire the small set of floating-window controls.
// A 5-second polling interval keeps the window updated while the user works.
els.refreshBtn.addEventListener('click', loadState);
els.openDashboardBtn.addEventListener('click', openDashboard); // Detailed note: this line supports the always-on-top floating desktop window state display.
els.laterBtn.addEventListener('click', later);

loadState();
setInterval(loadState, 5000);
