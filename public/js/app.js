// Co-Flow main dashboard script.
// This file powers the Electron dashboard renderer that is served by the local Node server.
// It is still part of the desktop prototype: Electron opens this interface and the floating window talks to it through the same local API.
// The code keeps all prototype state local so the experience can run without an external backend.

const stateUrl = '/api/state';
let appState = null;
let draggedPlant = null;
let dragMode = null; // Detailed note: this line supports the Electron dashboard renderer and keeps the prototype interaction traceable.
let selectedOwnedId = null;
let resizingPlant = null;
let resizeStart = null;
let deskPhotoDraft = null;
let cameraStream = null;
let cameraTimer = null; // Detailed note: this line supports the Electron dashboard renderer and keeps the prototype interaction traceable.
let previousFrame = null;
let inactivePrototypeMinutes = 0;
let activeStoreCategory = 'All';
let coBreakInviteTimer = null; // Detailed note: this line supports the Electron dashboard renderer and keeps the prototype interaction traceable.
let coBreakCountdownTimer = null;
let coBreakSelectedIds = new Set();
let coBreakAcceptedMembers = [];


// v12 migration: Co-Break should start with no company selected and preferences unchecked.
// This also clears older prototype defaults that may remain in localStorage from previous versions.
const COFLOW_CLIENT_VERSION = 'v12-cobreak-profile-gate'; // Detailed note: this line supports the Electron dashboard renderer and keeps the prototype interaction traceable.
if (localStorage.getItem('coflowClientVersion') !== COFLOW_CLIENT_VERSION) {
  localStorage.removeItem('coflowNoInvite');
  localStorage.removeItem('coflowHiddenFromTeam');
  localStorage.removeItem('coflowCompanyName'); // Detailed note: this line supports the Electron dashboard renderer and keeps the prototype interaction traceable.
  sessionStorage.removeItem('coflowCompanyName');
  localStorage.setItem('coflowClientVersion', COFLOW_CLIENT_VERSION);
}

// Simulated team data for the Co-Break prototype.
// These members are intentionally local mock data, not a real company directory.
// The list allows the invitation flow to be demonstrated inside the desktop prototype.
const demoTeamMembers = [ // Detailed note: this line supports the Electron dashboard renderer and keeps the prototype interaction traceable.
  { id: 'm01', name: 'Mia Chen', role: 'Product designer', energy: 22, avatar: 'https://i.pravatar.cc/96?img=1' },
  { id: 'm02', name: 'Leo Wang', role: 'Frontend developer', energy: 26, avatar: 'https://i.pravatar.cc/96?img=3' },
  { id: 'm03', name: 'Ava Lin', role: 'UX researcher', energy: 31, avatar: 'https://i.pravatar.cc/96?img=5' },
  { id: 'm04', name: 'Noah Kim', role: 'Project manager', energy: 35, avatar: 'https://i.pravatar.cc/96?img=8' },
  { id: 'm05', name: 'Emily Zhou', role: 'Service designer', energy: 38, avatar: 'https://i.pravatar.cc/96?img=9' },
  { id: 'm06', name: 'Lucas Li', role: 'Data analyst', energy: 41, avatar: 'https://i.pravatar.cc/96?img=11' },
  { id: 'm07', name: 'Sophie Yu', role: 'Content strategist', energy: 44, avatar: 'https://i.pravatar.cc/96?img=16' },
  { id: 'm08', name: 'Ethan Park', role: 'Visual designer', energy: 47, avatar: 'https://i.pravatar.cc/96?img=20' },
  { id: 'm09', name: 'Grace Liu', role: 'HR wellbeing lead', energy: 50, avatar: 'https://i.pravatar.cc/96?img=23' },
  { id: 'm10', name: 'Henry Zhao', role: 'Backend developer', energy: 53, avatar: 'https://i.pravatar.cc/96?img=26' },
  { id: 'm11', name: 'Olivia Sun', role: 'Marketing specialist', energy: 56, avatar: 'https://i.pravatar.cc/96?img=29' },
  { id: 'm12', name: 'Daniel Wu', role: 'Design lead', energy: 58, avatar: 'https://i.pravatar.cc/96?img=31' },
  { id: 'm13', name: 'Chloe Tang', role: 'Interaction designer', energy: 61, avatar: 'https://i.pravatar.cc/96?img=32' },
  { id: 'm14', name: 'Ryan Guo', role: 'QA engineer', energy: 64, avatar: 'https://i.pravatar.cc/96?img=34' },
  { id: 'm15', name: 'Nina Hu', role: 'Operations manager', energy: 67, avatar: 'https://i.pravatar.cc/96?img=36' },
  { id: 'm16', name: 'Jack Ma', role: 'Product owner', energy: 70, avatar: 'https://i.pravatar.cc/96?img=40' },
  { id: 'm17', name: 'Lily Qian', role: 'UX writer', energy: 73, avatar: 'https://i.pravatar.cc/96?img=44' },
  { id: 'm18', name: 'Oscar Ren', role: 'Team coordinator', energy: 77, avatar: 'https://i.pravatar.cc/96?img=48' },
  { id: 'm19', name: 'Ivy Jiang', role: 'Research assistant', energy: 82, avatar: 'https://i.pravatar.cc/96?img=49' },
  { id: 'm20', name: 'Max Xu', role: 'Engineering lead', energy: 88, avatar: 'https://i.pravatar.cc/96?img=52' }
];
const cameraTriggered = { t30: false, t60: false, t120: false };
const ALERT_SNOOZE_KEY = 'coflowAlertSnoozedUntil';
const ALERT_SNOOZE_DURATION = 10 * 60 * 1000; // Detailed note: this line supports the Electron dashboard renderer and keeps the prototype interaction traceable.

// Hero copy changes with the active section.
// Keeping these strings in one object makes page switching simple and consistent.
// Each entry controls the eyebrow, heading, and explanatory text in the dashboard header.
const heroContent = {
  dashboard: { eyebrow: 'Spatial Nature Recovery System', title: 'Work rhythm, restored by visible nature.', copy: 'Co-Flow connects fatigue detection, nature-based recovery, team breaks, Nature Points and desk projection into one continuous recovery experience.' },
  tasks: { eyebrow: 'Recovery', title: 'Complete a short individual nature recovery task.', copy: 'Individual tasks restore energy and generate Nature Points through low-effort nature-based actions.' },
  cobreak: { eyebrow: 'Co-Break', title: 'Shared recovery with low-energy team members.', copy: 'Invite suitable teammates, wait for consent, and begin a shared recovery break when at least two people are ready.' },
  camera: { eyebrow: 'Camera Monitor', title: 'Local low-movement detection, without recording.', copy: 'Camera Monitor estimates inactivity from movement level only. Video is not recorded, stored or uploaded.' },
  garden: { eyebrow: 'Restorative Garden', title: 'Turn recovery into a desk micro-landscape.', copy: 'Upload your desk photo, redeem natural elements with Nature Points, and arrange them on a simulated 3D desk plane.' }
};

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => document.querySelectorAll(selector); // Detailed note: this line supports the Electron dashboard renderer and keeps the prototype interaction traceable.

const taskVisuals = {
  sunlight: 'Sunlight reset',
  walking: 'Short walk',
  wind: 'Wind break', // Detailed note: this line supports the Electron dashboard renderer and keeps the prototype interaction traceable.
  water: 'Water touch',
  sound: 'Sound reset',
  plantbreath: 'Plant breathing'
}; // Detailed note: this line supports the Electron dashboard renderer and keeps the prototype interaction traceable.

const taskImageMap = {
  water: '/assets/recovery/water-touch.png',
  wind: '/assets/recovery/feel-the-wind.png',
  plantbreath: '/assets/recovery/plant-breathing.png',
  sunlight: '/assets/recovery/sunlight-reset.png',
  sound: '/assets/recovery/nature-sound.png',
  walking: '/assets/recovery/short-walk.png'
};

const plantImageMap = {
  moss_patch: '/assets/garden/moss-patch.png',
  grass_field: '/assets/garden/wind-grass-field.png',
  mini_tree: '/assets/garden/miniature-tree.png',
  sunbeam: '/assets/garden/morning-sunbeam.png',
  sunset_light: '/assets/garden/golden-sunset-light.png',
  window_light: '/assets/garden/window-light-panel.png',
  leaf_shadow: '/assets/garden/leaf-shadow-layer.png',
  river_line: '/assets/garden/small-river-stream.png',
  ocean_wave: '/assets/garden/ocean-surface.png',
  creek_flow: '/assets/garden/creek-flow.png',
  sea_glow: '/assets/garden/sea-glow-pool.png',
  wind_lines: '/assets/garden/moving-air-lines.png',
  soft_fog: '/assets/garden/light-mist.png',
  sound_wave: '/assets/garden/forest-sound-wave.png',
  birdsong_arc: '/assets/garden/birdsong-arc.png'
};

// Alert snoozing is stored both locally and in SQLite.
// The local value gives immediate feedback, while the server value keeps the desktop window in sync.
function getAlertSnoozedUntil() {
  const localUntil = Number(localStorage.getItem(ALERT_SNOOZE_KEY) || 0);
  const serverUntil = Number(appState?.settings?.alert_snoozed_until || 0);
  return Math.max(localUntil, serverUntil); // Detailed note: this line supports the Electron dashboard renderer and keeps the prototype interaction traceable.
}

function isAlertSnoozed() {
  const until = getAlertSnoozedUntil();
  if (until && Date.now() >= until) { // Detailed note: this line supports the Electron dashboard renderer and keeps the prototype interaction traceable.
    localStorage.removeItem(ALERT_SNOOZE_KEY);
    return false;
  }
  return Date.now() < until; // Detailed note: this line supports the Electron dashboard renderer and keeps the prototype interaction traceable.
}

async function snoozeAlertForTenMinutes() {
  const until = Date.now() + ALERT_SNOOZE_DURATION;
  localStorage.setItem(ALERT_SNOOZE_KEY, String(until)); // Detailed note: this line supports the Electron dashboard renderer and keeps the prototype interaction traceable.
  try {
    await api('/api/alert/snooze', { method: 'POST', body: JSON.stringify({ minutes: 10 }) });
  } catch (error) { /* keep local snooze if server is temporarily unavailable */ }
  if (window.coflowDesktop?.snoozeAlert) window.coflowDesktop.snoozeAlert(ALERT_SNOOZE_DURATION); // Detailed note: this line supports the Electron dashboard renderer and keeps the prototype interaction traceable.
  stopDesktopAlertFeedback();
  updateDesktopAlertState();
  toast('Reminder paused for 10 minutes');
} // Detailed note: this line supports the Electron dashboard renderer and keeps the prototype interaction traceable.

function toast(message) {
  const el = $('#toast');
  if (!el) return;
  el.textContent = message; // Detailed note: this line supports the Electron dashboard renderer and keeps the prototype interaction traceable.
  el.classList.add('show');
  window.setTimeout(() => el.classList.remove('show'), 2600);
}

// Small JSON API helper used by all dashboard interactions.
// Every request goes to the local server started by Node/Electron, not to an external service.
async function api(path, options = {}) { // Detailed note: this line supports the Electron dashboard renderer and keeps the prototype interaction traceable.
  const response = await fetch(path, {
    headers: { 'Content-Type': 'application/json' },
    ...options
  }); // Detailed note: this line supports the Electron dashboard renderer and keeps the prototype interaction traceable.
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Request failed');
  return data;
} // Detailed note: this line supports the Electron dashboard renderer and keeps the prototype interaction traceable.

async function loadState() {
  appState = await api(stateUrl);
  renderAll();
} // Detailed note: this line supports the Electron dashboard renderer and keeps the prototype interaction traceable.

// Re-render all visible prototype sections after state changes.
// This keeps dashboard cards, recovery tasks, Co-Break, camera status, and garden state aligned.
function renderAll() {
  renderDashboard();
  renderTasks();
  renderCoBreakPage(); // Detailed note: this line supports the Electron dashboard renderer and keeps the prototype interaction traceable.
  renderGardenPage();
  renderDeskSurfaces();
  renderCameraStatus();
  renderProfile(); // Detailed note: this line supports the Electron dashboard renderer and keeps the prototype interaction traceable.
  updateDesktopAlertState();
}

function taskVisual(task) {
  const image = taskImageMap[task.id];
  const label = taskVisuals[task.id] || task.category;
  if (image) {
    return `<div class="task-visual task-visual-image ${task.id}"><img src="${image}" alt="${label}" draggable="false" /></div>`;
  }
  return `<div class="task-visual ${task.id}">${label}</div>`;
}

function getPlantVisualPath(plantId) {
  return plantImageMap[plantId] || '';
}

function elementVisual(kind = 'forest', plantId = '') {
  const image = getPlantVisualPath(plantId);
  if (image) {
    return `<div class="nature-visual nature-visual-image ${kind}"><img src="${image}" alt="" draggable="false" /></div>`;
  }
  return `<div class="nature-visual ${kind}"><span></span><i></i><b></b></div>`;
} // Detailed note: this line supports the Electron dashboard renderer and keeps the prototype interaction traceable.

// Dashboard renderer for the central energy and device status overview.
// It also controls the severe-fatigue alert banner and recent recovery history.
function renderDashboard() {
  const { user, team, settings, history } = appState;
  if (user.energy >= 40) {
    localStorage.removeItem(ALERT_SNOOZE_KEY); // Detailed note: this line supports the Electron dashboard renderer and keeps the prototype interaction traceable.
    api('/api/alert/clear', { method: 'POST', body: '{}' }).catch(() => {});
  }
  $('#energyValue').textContent = user.energy;
  $('#heroEnergy').textContent = user.energy; // Detailed note: this line supports the Electron dashboard renderer and keeps the prototype interaction traceable.
  $('#heroPoints').textContent = `${user.nature_points} Nature Points`;
  $('#energyStatus').textContent = user.status;
  $('#pointsValue').textContent = user.nature_points;
  const storeBadge = $('#storePointsBadge');
  if (storeBadge) storeBadge.textContent = `${user.nature_points} Nature Points`;
  $('#teamEnergy').textContent = team.average_energy; // Detailed note: this line supports the Electron dashboard renderer and keeps the prototype interaction traceable.
  $('#teamStatus').textContent = `${team.fatigued_members}/${team.total_members} members need recovery`;
  $('#scanStatus').textContent = settings.desk_scan_ready ? 'Ready' : 'Need Scan';
  $('#wristbandStatus').textContent = settings.wristband_connected ? 'Bluetooth connected · projection ready' : 'Disconnected';
  $('#sidebarDeviceStatus').textContent = settings.wristband_connected ? 'Bluetooth linked · Projection ready' : 'Bluetooth disconnected';
  $('#phoneStatus').textContent = settings.desk_scan_ready ? 'Desk photo synced · model ready' : 'Ready for desk photo upload'; // Detailed note: this line supports the Electron dashboard renderer and keeps the prototype interaction traceable.
  $('#dashboardCameraStatus').textContent = settings.camera_enabled
    ? `Monitoring locally · movement ${Math.round(settings.camera_movement || 0)}% · inactive ${settings.camera_inactive_minutes || 0} min`
    : 'Off · enable in Camera Monitor';
  $('#cameraStatusDot').classList.toggle('on', Boolean(settings.camera_enabled));

  const sidebarCamera = $('#sidebarCameraCard'); // Detailed note: this line supports the Electron dashboard renderer and keeps the prototype interaction traceable.
  const sidebarPhone = $('#sidebarPhoneCard');
  sidebarCamera.classList.toggle('hidden', !settings.camera_enabled);
  sidebarPhone.classList.toggle('hidden', !settings.desk_scan_ready);
  $('#sidebarCameraStatus').textContent = `Monitoring locally · movement ${Math.round(settings.camera_movement || 0)}% · inactive ${settings.camera_inactive_minutes || 0} min`;
  $('#sidebarPhoneStatus').textContent = 'Desk photo synced · model ready'; // Detailed note: this line supports the Electron dashboard renderer and keeps the prototype interaction traceable.

  const noInvite = localStorage.getItem('coflowNoInvite') === '1';
  const hiddenFromTeam = localStorage.getItem('coflowHiddenFromTeam') === '1';
  const prefs = $('#dashboardCoBreakPrefs');
  const prefsPanel = $('#dashboardCoBreakPrefsPanel'); // Detailed note: this line supports the Electron dashboard renderer and keeps the prototype interaction traceable.
  if (prefs && prefsPanel) {
    prefsPanel.classList.toggle('hidden', !(noInvite || hiddenFromTeam));
    prefs.innerHTML = [
      noInvite ? '<span class="pref-badge active">Not accepting Co-Break invitations</span>' : '', // Detailed note: this line supports the Electron dashboard renderer and keeps the prototype interaction traceable.
      hiddenFromTeam ? '<span class="pref-badge active">Hidden from team recovery list</span>' : ''
    ].join('');
  }

  const webAlert = $('#webRecoveryAlert'); // Detailed note: this line supports the Electron dashboard renderer and keeps the prototype interaction traceable.
  const showRecoveryAlert = user.energy < 40 && !isAlertSnoozed();
  if (webAlert) webAlert.classList.toggle('hidden', !showRecoveryAlert);

  $('#dashboardHistory').innerHTML = history.length
    ? history.slice(0, 5).map(item => `
      <div class="history-item">
        <strong>${item.name}</strong>
        <p class="muted">${new Date(item.completed_at).toLocaleString()} · Energy ${item.energy_after} · Points ${item.points_after}</p>
      </div>
    `).join('')
    : '<p class="muted">No recovery history yet.</p>'; // Detailed note: this line supports the Electron dashboard renderer and keeps the prototype interaction traceable.
}

// Recovery task renderer.
// Tasks come from SQLite through /api/state and are displayed as interactive cards.
function renderTasks() {
  $('#tasksGrid').innerHTML = appState.tasks.map(task => `
    <article class="task-card glass">
      ${taskVisual(task)}
      <p class="eyebrow">${task.category}</p>
      <h3>${task.name}</h3>
      <p class="muted">${task.description}</p>
      <div class="card-meta">
        <span class="chip">${task.duration_minutes} min</span>
        <span class="chip">Energy +${task.energy_gain}</span>
        <span class="chip">Points +${task.points_gain}</span>
      </div>
      <button class="button primary" data-complete-task="${task.id}">Mark complete</button>
    </article>
  `).join('');
}

function getCompanyName() { // Detailed note: this line supports the Electron dashboard renderer and keeps the prototype interaction traceable.
  return sessionStorage.getItem('coflowCompanyName') || '';
}

// Co-Break renderer for the voluntary team recovery flow.
// The company gate, privacy preferences, profile check, selection, countdown, and accepted members are all handled here.
function renderCoBreakPage() {
  const company = getCompanyName(); // Detailed note: this line supports the Electron dashboard renderer and keeps the prototype interaction traceable.
  const companyPanel = $('#coBreakCompanyPanel');
  const panel = $('#coBreakPanel');
  if (!company || !panel || !companyPanel) {
    companyPanel?.classList.remove('hidden'); // Detailed note: this line supports the Electron dashboard renderer and keeps the prototype interaction traceable.
    panel?.classList.add('hidden');
    return;
  }
  companyPanel.classList.add('hidden'); // Detailed note: this line supports the Electron dashboard renderer and keeps the prototype interaction traceable.
  panel.classList.remove('hidden');
  $('#companyTitle').textContent = `${company} members ranked by energy`;
  $('#prefNoInvite').checked = localStorage.getItem('coflowNoInvite') === '1';
  $('#prefHidden').checked = localStorage.getItem('coflowHiddenFromTeam') === '1';

  const list = demoTeamMembers.slice().sort((a, b) => a.energy - b.energy); // Detailed note: this line supports the Electron dashboard renderer and keeps the prototype interaction traceable.
  $('#teamMemberList').innerHTML = list.map(member => {
    const selected = coBreakSelectedIds.has(member.id);
    const accepted = coBreakAcceptedMembers.some(item => item.id === member.id);
    return `
      <button class="team-member-card ${selected ? 'selected' : ''} ${accepted ? 'accepted' : ''}" data-team-member="${member.id}" type="button">
        <img src="${member.avatar}" alt="${member.name} avatar" loading="lazy" />
        <div>
          <strong>${member.name}</strong>
          <span>${member.role}</span>
        </div>
        <em>${member.energy}</em>
      </button>
    `;
  }).join(''); // Detailed note: this line supports the Electron dashboard renderer and keeps the prototype interaction traceable.
}

function setCoBreakStatus(title, message, mode = '') {
  const card = $('#coBreakStatusCard');
  if (!card) return; // Detailed note: this line supports the Electron dashboard renderer and keeps the prototype interaction traceable.
  card.className = `cobreak-status-card ${mode}`.trim();
  card.innerHTML = `<strong>${title}</strong><p class="muted">${message}</p>`;
}

function confirmCompany() {
  const value = $('#companyInput').value.trim();
  if (!value) return toast('Please enter your company name first.'); // Detailed note: this line supports the Electron dashboard renderer and keeps the prototype interaction traceable.
  sessionStorage.setItem('coflowCompanyName', value);
  coBreakSelectedIds.clear();
  coBreakAcceptedMembers = [];
  setCoBreakStatus('Waiting for invitation', 'Choose low-energy members to begin a shared recovery request.'); // Detailed note: this line supports the Electron dashboard renderer and keeps the prototype interaction traceable.
  renderCoBreakPage();
}

function toggleTeamMember(id) {
  if (coBreakSelectedIds.has(id)) coBreakSelectedIds.delete(id); // Detailed note: this line supports the Electron dashboard renderer and keeps the prototype interaction traceable.
  else coBreakSelectedIds.add(id);
  renderCoBreakPage();
}


function isProfileReadyForCoBreak() { // Detailed note: this line supports the Electron dashboard renderer and keeps the prototype interaction traceable.
  const user = appState?.user || {};
  const hasAvatar = Boolean(user.avatar || profileAvatarDraft);
  const hasUserId = Boolean((user.user_code || '').trim());
  return hasAvatar && hasUserId; // Detailed note: this line supports the Electron dashboard renderer and keeps the prototype interaction traceable.
}

function showCoBreakProfileRequired() {
  setCoBreakStatus(
    'Profile required', // Detailed note: this line supports the Electron dashboard renderer and keeps the prototype interaction traceable.
    'Please click the grey avatar area to upload your avatar and complete your user ID before inviting team members for Co-Break.',
    'profile-required'
  );
  toast('Please complete your avatar and user ID first.'); // Detailed note: this line supports the Electron dashboard renderer and keeps the prototype interaction traceable.
}

// Start the 30-second invitation simulation.
// The flow requires a saved avatar/user ID and at least two selected low-energy members.
function startCoBreakInvitation() {
  if (!isProfileReadyForCoBreak()) {
    showCoBreakProfileRequired(); // Detailed note: this line supports the Electron dashboard renderer and keeps the prototype interaction traceable.
    return;
  }
  const selected = demoTeamMembers.filter(member => coBreakSelectedIds.has(member.id)).sort((a, b) => a.energy - b.energy);
  if (selected.length < 2) return toast('Please select at least two low-energy members.'); // Detailed note: this line supports the Electron dashboard renderer and keeps the prototype interaction traceable.
  coBreakAcceptedMembers = [];
  if (coBreakInviteTimer) clearTimeout(coBreakInviteTimer);
  if (coBreakCountdownTimer) clearInterval(coBreakCountdownTimer);

  let seconds = 30; // Detailed note: this line supports the Electron dashboard renderer and keeps the prototype interaction traceable.
  setCoBreakStatus(
    'Invitation sent',
    `Notified ${selected.length} selected members. Waiting for responses · ${seconds}s remaining.`,
    'waiting'
  ); // Detailed note: this line supports the Electron dashboard renderer and keeps the prototype interaction traceable.

  coBreakCountdownTimer = setInterval(() => {
    seconds -= 1;
    setCoBreakStatus(
      'Waiting for responses', // Detailed note: this line supports the Electron dashboard renderer and keeps the prototype interaction traceable.
      `Co-Flow is waiting for selected teammates to respond · ${Math.max(0, seconds)}s remaining.`,
      'waiting'
    );
    if (seconds <= 0) clearInterval(coBreakCountdownTimer);
  }, 1000); // Detailed note: this line supports the Electron dashboard renderer and keeps the prototype interaction traceable.

  coBreakInviteTimer = setTimeout(() => {
    if (coBreakCountdownTimer) clearInterval(coBreakCountdownTimer);

    // Prototype response simulation: after the full 30 seconds, some lower-energy
    // selected members accept. If no selected member accepts, Co-Flow auto-matches
    // one low-energy partner so the user is never left resting alone.
    const accepted = selected.filter(member => member.energy <= 55).slice(0, Math.min(3, selected.length));
    coBreakAcceptedMembers = accepted.length ? accepted : []; // Detailed note: this line supports the Electron dashboard renderer and keeps the prototype interaction traceable.

    if (!coBreakAcceptedMembers.length) {
      const fallback = demoTeamMembers
        .filter(m => !coBreakSelectedIds.has(m.id))
        .sort((a, b) => a.energy - b.energy)[0]; // Detailed note: this line supports the Electron dashboard renderer and keeps the prototype interaction traceable.
      coBreakAcceptedMembers = fallback ? [fallback] : [selected[0]];
      renderCoBreakPage();
      setCoBreakStatus(
        'Auto-matched recovery partner', // Detailed note: this line supports the Electron dashboard renderer and keeps the prototype interaction traceable.
        `${coBreakAcceptedMembers[0].name} was matched automatically so at least two people can take a shared break. <button class="button primary inline-action" id="startMatchedCoBreakBtn">Join Co-Break</button>`,
        'ready'
      );
    } else {
      renderCoBreakPage(); // Detailed note: this line supports the Electron dashboard renderer and keeps the prototype interaction traceable.
      setCoBreakStatus(
        'Co-Break ready',
        `${coBreakAcceptedMembers.map(m => m.name).join(', ')} accepted after the 30-second response window. Start the shared recovery break when ready. <button class="button primary inline-action" id="startMatchedCoBreakBtn">Join Co-Break</button>`,
        'ready'
      ); // Detailed note: this line supports the Electron dashboard renderer and keeps the prototype interaction traceable.
    }
  }, 30000);
}

function categories() { // Detailed note: this line supports the Electron dashboard renderer and keeps the prototype interaction traceable.
  return ['All', ...new Set(appState.plants.map(plant => plant.type))];
}

// Restorative Garden renderer.
// It shows the desk surface, purchased natural elements, and the Nature Points store.
function renderGardenPage() {
  $('#storeFilters').innerHTML = categories().map(category => `
    <button class="filter-chip ${activeStoreCategory === category ? 'active' : ''}" data-filter-category="${category}">${category}</button>
  `).join('');

  const plants = activeStoreCategory === 'All' // Detailed note: this line supports the Electron dashboard renderer and keeps the prototype interaction traceable.
    ? appState.plants
    : appState.plants.filter(plant => plant.type === activeStoreCategory);

  $('#natureStore').innerHTML = plants.map(plant => `
    <article class="element-card glass">
      ${elementVisual(plant.visual, plant.id)}
      <p class="eyebrow">${plant.type}</p>
      <h3>${plant.name}</h3>
      <p class="muted">${plant.meaning}</p>
      <div class="card-meta"><span class="chip">${plant.cost} Nature Points</span></div>
      <button class="button primary" data-redeem-plant="${plant.id}">Redeem element</button>
    </article>
  `).join('');

  const plantLayer = $('#plantLayer');
  const placedPlants = appState.ownedPlants.filter(plant => Number(plant.placed) === 1); // Detailed note: this line supports the Electron dashboard renderer and keeps the prototype interaction traceable.
  plantLayer.innerHTML = placedPlants.map(plant => `
    <div class="plant-dot" title="${plant.name}" data-owned-id="${plant.id}" data-scale="${plant.scale || 1}" style="left:${plant.x}%; top:${plant.y}%; transform:translate(-50%, -50%) scale(${plant.scale || 1});">
      ${elementVisual(plant.visual, plant.plant_id || plant.id)}
      <button class="plant-resize-handle" type="button" aria-label="Resize ${plant.name}"></button>
    </div>
  `).join('');

  const unplacedPlants = appState.ownedPlants.filter(plant => Number(plant.placed) !== 1);
  const groupedUnplaced = Object.values(unplacedPlants.reduce((groups, plant) => {
    const key = plant.plant_id || plant.id;
    if (!groups[key]) groups[key] = { ...plant, count: 0, sourceIds: [] };
    groups[key].count += 1;
    groups[key].sourceIds.push(plant.id);
    return groups;
  }, {}));
  $('#ownedElementList').innerHTML = groupedUnplaced.length
    ? groupedUnplaced.map(plant => `
      <div class="owned-item ${selectedOwnedId === String(plant.sourceIds[0]) ? 'selected' : ''}" data-owned-source="${plant.sourceIds[0]}" data-name="${plant.name}" data-plant-id="${plant.plant_id || ''}" data-visual="${plant.visual}">
        ${plant.count > 1 ? `<span class="owned-quantity">×${plant.count}</span>` : ''}
        ${elementVisual(plant.visual, plant.plant_id || plant.id)}
        <div><strong>${plant.name}</strong><br><span class="muted">${plant.type} · drag to desk</span></div>
      </div>
    `).join('')
    : '<p class="muted">No available elements. Redeem new elements or drag placed elements back here.</p>';
} // Detailed note: this line supports the Electron dashboard renderer and keeps the prototype interaction traceable.

// Render the projected natural elements on the uploaded desk photo.
// Placed elements can be dragged and saved back to SQLite through the local API.
function renderDeskSurfaces() {
  const photo = appState?.settings?.desk_photo;
  const surface = $('#gardenDeskSurface');
  if (!surface) return; // Detailed note: this line supports the Electron dashboard renderer and keeps the prototype interaction traceable.
  if (photo) {
    surface.style.backgroundImage = `linear-gradient(120deg, rgba(255,255,255,0.12), rgba(255,255,255,0.02)), url(${photo})`;
    surface.classList.add('has-photo');
    $('#gardenPhotoPlaceholder').style.display = 'none';
    $('#deleteDeskPhotoBtn')?.classList.remove('hidden'); // Detailed note: this line supports the Electron dashboard renderer and keeps the prototype interaction traceable.
  } else {
    surface.style.backgroundImage = '';
    surface.classList.remove('has-photo');
    $('#gardenPhotoPlaceholder').style.display = 'grid'; // Detailed note: this line supports the Electron dashboard renderer and keeps the prototype interaction traceable.
    $('#deleteDeskPhotoBtn')?.classList.add('hidden');
  }
}

function renderCameraStatus() { // Detailed note: this line supports the Electron dashboard renderer and keeps the prototype interaction traceable.
  const s = appState?.settings;
  if (!s) return;
  $('#movementLevel').textContent = `${Math.round(s.camera_movement || 0)}%`;
  $('#inactiveMinutes').textContent = s.camera_inactive_minutes || 0;
  $('#cameraImpact').textContent = s.camera_enabled ? 'Monitoring locally' : 'Off'; // Detailed note: this line supports the Electron dashboard renderer and keeps the prototype interaction traceable.
}

function resizeImageToDataUrl(file, maxWidth = 1600, quality = 0.86) {
  return new Promise((resolve, reject) => {
    const img = new Image(); // Detailed note: this line supports the Electron dashboard renderer and keeps the prototype interaction traceable.
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Could not read image.'));
    reader.onload = () => { img.src = reader.result; };
    img.onload = () => { // Detailed note: this line supports the Electron dashboard renderer and keeps the prototype interaction traceable.
      const scale = Math.min(1, maxWidth / img.width);
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.round(img.width * scale));
      canvas.height = Math.max(1, Math.round(img.height * scale)); // Detailed note: this line supports the Electron dashboard renderer and keeps the prototype interaction traceable.
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL('image/jpeg', quality));
    }; // Detailed note: this line supports the Electron dashboard renderer and keeps the prototype interaction traceable.
    img.onerror = () => reject(new Error('Unsupported image file.'));
    reader.readAsDataURL(file);
  });
} // Detailed note: this line supports the Electron dashboard renderer and keeps the prototype interaction traceable.

async function saveDeskPhoto() {
  if (!deskPhotoDraft) return toast('Please upload a desk photo first.');
  await api('/api/desk/photo', {
    method: 'POST', // Detailed note: this line supports the Electron dashboard renderer and keeps the prototype interaction traceable.
    body: JSON.stringify({ photo: deskPhotoDraft })
  });
  toast('Desk photo synced · simulated 3D desk ready');
  await // Initial state load starts the full dashboard render.
// A short polling interval keeps the Electron dashboard and floating window aligned during the demo.
loadState(); // Detailed note: this line supports the Electron dashboard renderer and keeps the prototype interaction traceable.
}

async function deleteDeskPhoto() {
  await api('/api/desk/delete', { method: 'POST', body: '{}' });
  deskPhotoDraft = null; // Detailed note: this line supports the Electron dashboard renderer and keeps the prototype interaction traceable.
  const input = $('#deskPhotoInput');
  if (input) input.value = '';
  toast('Desk photo removed');
  await loadState(); // Detailed note: this line supports the Electron dashboard renderer and keeps the prototype interaction traceable.
}

// Start local camera movement detection.
// The prototype compares video frames locally and only sends numeric movement/inactivity values to the server.
async function startCameraDetection() {
  const video = $('#cameraVideo');
  const canvas = $('#cameraCanvas'); // Detailed note: this line supports the Electron dashboard renderer and keeps the prototype interaction traceable.
  if (!video || !canvas) return;
  try {
    cameraStream = await navigator.mediaDevices.getUserMedia({ video: { width: 320, height: 240 }, audio: false });
    video.srcObject = cameraStream; // Detailed note: this line supports the Electron dashboard renderer and keeps the prototype interaction traceable.
    await video.play();
    previousFrame = null;
    inactivePrototypeMinutes = appState?.settings?.camera_inactive_minutes || 0;
    await api('/api/camera/status', { method: 'POST', body: JSON.stringify({ enabled: true, movement: 0, inactiveMinutes: inactivePrototypeMinutes }) });
    toast('Camera detection enabled · local motion only'); // Detailed note: this line supports the Electron dashboard renderer and keeps the prototype interaction traceable.
    if (cameraTimer) clearInterval(cameraTimer);
    cameraTimer = setInterval(analyseCameraFrame, 2000);
    await loadState();
  } catch (error) { // Detailed note: this line supports the Electron dashboard renderer and keeps the prototype interaction traceable.
    toast('Camera permission was blocked or unavailable.');
  }
}

async function stopCameraDetection() { // Detailed note: this line supports the Electron dashboard renderer and keeps the prototype interaction traceable.
  if (cameraTimer) clearInterval(cameraTimer);
  cameraTimer = null;
  if (cameraStream) cameraStream.getTracks().forEach(track => track.stop());
  cameraStream = null; // Detailed note: this line supports the Electron dashboard renderer and keeps the prototype interaction traceable.
  previousFrame = null;
  await api('/api/camera/status', { method: 'POST', body: JSON.stringify({ enabled: false, movement: 0, inactiveMinutes: inactivePrototypeMinutes }) });
  toast('Camera detection stopped');
  await loadState();
} // Detailed note: this line supports the Electron dashboard renderer and keeps the prototype interaction traceable.

// Analyse one camera frame against the previous frame.
// This is a motion-difference simulation, not facial recognition or real medical fatigue detection.
async function analyseCameraFrame() {
  const video = $('#cameraVideo');
  const canvas = $('#cameraCanvas');
  if (!video || !canvas || !cameraStream || video.readyState < 2) return; // Detailed note: this line supports the Electron dashboard renderer and keeps the prototype interaction traceable.
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
  const current = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
  let movement = 0; // Detailed note: this line supports the Electron dashboard renderer and keeps the prototype interaction traceable.
  if (previousFrame) {
    let diff = 0;
    for (let i = 0; i < current.length; i += 16) diff += Math.abs(current[i] - previousFrame[i]);
    movement = Math.min(100, (diff / (current.length / 16)) * 1.25); // Detailed note: this line supports the Electron dashboard renderer and keeps the prototype interaction traceable.
  }
  previousFrame = new Uint8ClampedArray(current);
  if (movement < 6) inactivePrototypeMinutes += 2;
  else if (movement > 18) { // Detailed note: this line supports the Electron dashboard renderer and keeps the prototype interaction traceable.
    inactivePrototypeMinutes = Math.max(0, inactivePrototypeMinutes - 8);
    cameraTriggered.t30 = false;
    cameraTriggered.t60 = false;
    cameraTriggered.t120 = false; // Detailed note: this line supports the Electron dashboard renderer and keeps the prototype interaction traceable.
  }
  $('#movementLevel').textContent = `${Math.round(movement)}%`;
  $('#inactiveMinutes').textContent = inactivePrototypeMinutes;
  $('#cameraImpact').textContent = movement < 6 ? 'Low movement detected' : 'Movement detected';
  await api('/api/camera/status', { // Detailed note: this line supports the Electron dashboard renderer and keeps the prototype interaction traceable.
    method: 'POST',
    body: JSON.stringify({ enabled: true, movement, inactiveMinutes: inactivePrototypeMinutes })
  });
  await checkCameraEnergyThresholds(); // Detailed note: this line supports the Electron dashboard renderer and keeps the prototype interaction traceable.
}

async function checkCameraEnergyThresholds() {
  let loss = 0;
  let label = ''; // Detailed note: this line supports the Electron dashboard renderer and keeps the prototype interaction traceable.
  if (inactivePrototypeMinutes >= 120 && !cameraTriggered.t120) { loss = 20; label = '120 min low movement'; cameraTriggered.t120 = true; }
  else if (inactivePrototypeMinutes >= 60 && !cameraTriggered.t60) { loss = 10; label = '60 min low movement'; cameraTriggered.t60 = true; }
  else if (inactivePrototypeMinutes >= 30 && !cameraTriggered.t30) { loss = 5; label = '30 min low movement'; cameraTriggered.t30 = true; }
  if (!loss) return; // Detailed note: this line supports the Electron dashboard renderer and keeps the prototype interaction traceable.
  const result = await api('/api/camera/energy-impact', { method: 'POST', body: JSON.stringify({ loss }) });
  toast(`${label} · Camera energy impact -${result.loss}`);
  await loadState();
}

function switchPage(sectionId) { // Detailed note: this line supports the Electron dashboard renderer and keeps the prototype interaction traceable.
  const normalized = sectionId;
  const exists = $(`#${normalized}`);
  const target = exists ? normalized : 'dashboard';
  $$('.nav-link').forEach(link => link.classList.toggle('active', link.dataset.section === target));
  $$('.page').forEach(page => page.classList.toggle('active', page.id === target)); // Detailed note: this line supports the Electron dashboard renderer and keeps the prototype interaction traceable.
  const content = heroContent[target] || heroContent.dashboard;
  $('#heroEyebrow').textContent = content.eyebrow;
  $('#heroTitle').textContent = content.title;
  $('#heroCopy').textContent = content.copy; // Detailed note: this line supports the Electron dashboard renderer and keeps the prototype interaction traceable.
  $('#heroPoints').classList.toggle('hidden', target !== 'garden');
}

async function completeTask(taskId) {
  const result = await api('/api/tasks/complete', { // Detailed note: this line supports the Electron dashboard renderer and keeps the prototype interaction traceable.
    method: 'POST',
    body: JSON.stringify({ taskId })
  });
  toast(`${result.task.name} completed · Energy +${result.task.energy_gain} · Points +${result.task.points_gain}`);
  await loadState(); // Detailed note: this line supports the Electron dashboard renderer and keeps the prototype interaction traceable.
}

async function redeemPlant(plantId) {
  try {
    const result = await api('/api/plants/redeem', { // Detailed note: this line supports the Electron dashboard renderer and keeps the prototype interaction traceable.
      method: 'POST',
      body: JSON.stringify({ plantId })
    });
    toast(`${result.plant.name} redeemed and added to Restorative Garden`);
    await loadState(); // Detailed note: this line supports the Electron dashboard renderer and keeps the prototype interaction traceable.
    switchPage('garden');
  } catch (error) {
    toast(error.message);
  } // Detailed note: this line supports the Electron dashboard renderer and keeps the prototype interaction traceable.
}

async function simulateWork() {
  const result = await api('/api/work', {
    method: 'POST', // Detailed note: this line supports the Electron dashboard renderer and keeps the prototype interaction traceable.
    body: JSON.stringify({ minutes: 30 })
  });
  toast(`30 min work simulated · Energy -${result.loss}`);
  await loadState();
} // Detailed note: this line supports the Electron dashboard renderer and keeps the prototype interaction traceable.

// Complete the shared recovery break.
// The server applies the Co-Break energy and Nature Points reward, then the local selection is reset.
async function joinCoBreak() {
  const result = await api('/api/cobreak/join', { method: 'POST', body: '{}' });
  toast(`Co-Break complete · Energy ${result.energy} · Points ${result.points}`);
  coBreakSelectedIds.clear();
  coBreakAcceptedMembers = []; // Detailed note: this line supports the Electron dashboard renderer and keeps the prototype interaction traceable.
  if (coBreakInviteTimer) clearTimeout(coBreakInviteTimer);
  if (coBreakCountdownTimer) clearInterval(coBreakCountdownTimer);
  setCoBreakStatus('Waiting for invitation', 'Choose low-energy members to begin a shared recovery request.');
  await loadState(); // Detailed note: this line supports the Electron dashboard renderer and keeps the prototype interaction traceable.
  renderCoBreakPage();
}

async function savePlantByCoordinates(id, x, y, scale = null) {
  const payload = { id, x, y };
  if (scale !== null) payload.scale = scale;
  await api('/api/plants/move', { // Detailed note: this line supports the Electron dashboard renderer and keeps the prototype interaction traceable.
    method: 'POST',
    body: JSON.stringify(payload)
  });
} // Detailed note: this line supports the Electron dashboard renderer and keeps the prototype interaction traceable.

async function unplacePlant(id) {
  await api('/api/plants/unplace', {
    method: 'POST',
    body: JSON.stringify({ id }) // Detailed note: this line supports the Electron dashboard renderer and keeps the prototype interaction traceable.
  });
}

async function savePlantPosition(element, event) {
  const stage = $('#deskStage .desk-surface').getBoundingClientRect(); // Detailed note: this line supports the Electron dashboard renderer and keeps the prototype interaction traceable.
  const x = Math.max(3, Math.min(94, ((event.clientX - stage.left) / stage.width) * 100));
  const y = Math.max(8, Math.min(86, ((event.clientY - stage.top) / stage.height) * 100));
  const scale = Number(element.dataset.scale || 1);
  await savePlantByCoordinates(element.dataset.ownedId, x, y, scale);
} // Detailed note: this line supports the Electron dashboard renderer and keeps the prototype interaction traceable.

function isPointerInsideDesk(event) {
  const stage = $('#deskStage .desk-surface').getBoundingClientRect();
  return event.clientX >= stage.left && event.clientX <= stage.right && event.clientY >= stage.top && event.clientY <= stage.bottom;
} // Detailed note: this line supports the Electron dashboard renderer and keeps the prototype interaction traceable.

function isPointerInsideOwnedList(event) {
  const target = $('#ownedElementList') || $('.garden-side-panel');
  const panel = $('.garden-side-panel');
  const boxes = [target, panel].filter(Boolean).map(el => el.getBoundingClientRect()); // Detailed note: this line supports the Electron dashboard renderer and keeps the prototype interaction traceable.
  return boxes.some(box => event.clientX >= box.left - 24 && event.clientX <= box.right + 24 && event.clientY >= box.top - 24 && event.clientY <= box.bottom + 24);
}


function renderProfile() {
  const user = appState?.user;
  if (!user) return; // Detailed note: this line supports the Electron dashboard renderer and keeps the prototype interaction traceable.
  const img = $('#brandAvatarImage');
  const avatarButton = $('#profileAvatarBtn');
  if (user.avatar) {
    img.src = user.avatar; // Detailed note: this line supports the Electron dashboard renderer and keeps the prototype interaction traceable.
    img.hidden = false;
    avatarButton.classList.add('has-avatar');
    $('#brandAvatarInitial').style.display = 'none';
  } else { // Detailed note: this line supports the Electron dashboard renderer and keeps the prototype interaction traceable.
    img.removeAttribute('src');
    img.hidden = true;
    avatarButton.classList.remove('has-avatar');
    $('#brandAvatarInitial').style.display = 'none'; // Detailed note: this line supports the Electron dashboard renderer and keeps the prototype interaction traceable.
  }
  if ($('#profileIdInput')) $('#profileIdInput').value = user.user_code || '';
  if ($('#profileRoleInput')) $('#profileRoleInput').value = user.company_role || '';
} // Detailed note: this line supports the Electron dashboard renderer and keeps the prototype interaction traceable.

async function saveProfile() {
  const payload = {
    userCode: $('#profileIdInput').value.trim(),
    companyRole: $('#profileRoleInput').value.trim(), // Detailed note: this line supports the Electron dashboard renderer and keeps the prototype interaction traceable.
    avatar: profileAvatarDraft || appState.user.avatar || ''
  };
  await api('/api/profile', { method: 'POST', body: JSON.stringify(payload) });
  profileAvatarDraft = null; // Detailed note: this line supports the Electron dashboard renderer and keeps the prototype interaction traceable.
  closeProfileModal();
  toast('Profile updated');
  await loadState();
} // Detailed note: this line supports the Electron dashboard renderer and keeps the prototype interaction traceable.

let profileAvatarDraft = null;

function openProfileModal() {
  renderProfile();
  $('#profileModal').classList.remove('hidden'); // Detailed note: this line supports the Electron dashboard renderer and keeps the prototype interaction traceable.
}

function closeProfileModal() {
  $('#profileModal').classList.add('hidden');
} // Detailed note: this line supports the Electron dashboard renderer and keeps the prototype interaction traceable.

function updateDesktopAlertState() {
  const shouldAlert = appState?.user?.energy < 40 && !isAlertSnoozed();
  if (window.coflowDesktop?.setAlertMode) window.coflowDesktop.setAlertMode(shouldAlert);
} // Detailed note: this line supports the Electron dashboard renderer and keeps the prototype interaction traceable.

function stopDesktopAlertFeedback() {
  if (window.coflowDesktop?.stopAlertFeedback) window.coflowDesktop.stopAlertFeedback();
}

// Central click delegation for dynamic cards and controls.
// Using one listener keeps generated task, store, and Co-Break elements easy to manage.
document.addEventListener('click', async (event) => { // Detailed note: this line supports the Electron dashboard renderer and keeps the prototype interaction traceable.
  const nav = event.target.closest('.nav-link');
  if (nav) {
    event.preventDefault();
    switchPage(nav.dataset.section); // Detailed note: this line supports the Electron dashboard renderer and keeps the prototype interaction traceable.
    history.replaceState(null, '', `#${nav.dataset.section}`);
  }

  const complete = event.target.closest('[data-complete-task]');
  if (complete) completeTask(complete.dataset.completeTask);

  const redeem = event.target.closest('[data-redeem-plant]'); // Detailed note: this line supports the Electron dashboard renderer and keeps the prototype interaction traceable.
  if (redeem) redeemPlant(redeem.dataset.redeemPlant);

  const filter = event.target.closest('[data-filter-category]');
  if (filter) {
    activeStoreCategory = filter.dataset.filterCategory; // Detailed note: this line supports the Electron dashboard renderer and keeps the prototype interaction traceable.
    renderGardenPage();
  }

  const teamMember = event.target.closest('[data-team-member]');
  if (teamMember) toggleTeamMember(teamMember.dataset.teamMember); // Detailed note: this line supports the Electron dashboard renderer and keeps the prototype interaction traceable.

  const matchedCoBreak = event.target.closest('#startMatchedCoBreakBtn');
  if (matchedCoBreak) joinCoBreak();
});

$('#simulateWorkBtn').addEventListener('click', simulateWork); // Detailed note: this line supports the Electron dashboard renderer and keeps the prototype interaction traceable.
$('#startCameraBtn').addEventListener('click', startCameraDetection);
$('#stopCameraBtn').addEventListener('click', stopCameraDetection);
$('#deleteDeskPhotoBtn')?.addEventListener('click', deleteDeskPhoto);
$('#deskPhotoInput').addEventListener('change', async (event) => { // Detailed note: this line supports the Electron dashboard renderer and keeps the prototype interaction traceable.
  const file = event.target.files?.[0];
  if (!file) return;
  if (!file.type.startsWith('image/')) return toast('Please choose an image file.');
  deskPhotoDraft = await resizeImageToDataUrl(file); // Detailed note: this line supports the Electron dashboard renderer and keeps the prototype interaction traceable.
  const surface = $('#gardenDeskSurface');
  surface.style.backgroundImage = `linear-gradient(120deg, rgba(255,255,255,0.12), rgba(255,255,255,0.02)), url(${deskPhotoDraft})`;
  surface.classList.add('has-photo');
  $('#gardenPhotoPlaceholder').style.display = 'none';
  await saveDeskPhoto(); // Detailed note: this line supports the Electron dashboard renderer and keeps the prototype interaction traceable.
});
$('#confirmCompanyBtn')?.addEventListener('click', confirmCompany);
$('#sendInviteBtn')?.addEventListener('click', startCoBreakInvitation);
$('#prefNoInvite')?.addEventListener('change', (event) => { localStorage.setItem('coflowNoInvite', event.target.checked ? '1' : '0'); toast(event.target.checked ? 'You will not receive Co-Break invitations.' : 'Co-Break invitations enabled.'); renderDashboard(); });
$('#prefHidden')?.addEventListener('change', (event) => { localStorage.setItem('coflowHiddenFromTeam', event.target.checked ? '1' : '0'); toast(event.target.checked ? 'You are hidden from the team recovery list.' : 'You are visible in the team recovery list.'); renderDashboard(); });
$('#webAlertLaterBtn').addEventListener('click', () => { $('#webRecoveryAlert').classList.add('hidden'); snoozeAlertForTenMinutes(); }); // Detailed note: this line supports the Electron dashboard renderer and keeps the prototype interaction traceable.
$('#profileAvatarBtn').addEventListener('click', openProfileModal);
$('#profileCloseBtn').addEventListener('click', closeProfileModal);
$('#cancelProfileBtn').addEventListener('click', closeProfileModal);
$('#profileBackdrop').addEventListener('click', closeProfileModal); // Detailed note: this line supports the Electron dashboard renderer and keeps the prototype interaction traceable.
$('#saveProfileBtn').addEventListener('click', saveProfile);
$('#profileAvatarInput').addEventListener('change', async (event) => {
  const file = event.target.files?.[0];
  if (!file) return; // Detailed note: this line supports the Electron dashboard renderer and keeps the prototype interaction traceable.
  if (!file.type.startsWith('image/')) return toast('Please choose an image file.');
  profileAvatarDraft = await resizeImageToDataUrl(file, 512, 0.9);
  $('#brandAvatarImage').src = profileAvatarDraft;
  $('#brandAvatarImage').hidden = false; // Detailed note: this line supports the Electron dashboard renderer and keeps the prototype interaction traceable.
  $('#profileAvatarBtn').classList.add('has-avatar');
  $('#brandAvatarInitial').style.display = 'none';
});

// Pointer interaction for dragging garden elements.
// Purchased items can be selected, placed on the desk, moved, or returned to the inventory area.
document.addEventListener('pointerdown', (event) => { // Detailed note: this line supports the Electron dashboard renderer and keeps the prototype interaction traceable.
  const resizeHandle = event.target.closest('.plant-resize-handle');
  const plant = event.target.closest('.plant-dot');
  const owned = event.target.closest('.owned-item');
  if (resizeHandle && plant) {
    event.preventDefault();
    event.stopPropagation();
    resizingPlant = plant;
    resizeStart = {
      x: event.clientX,
      y: event.clientY,
      scale: Number(plant.dataset.scale || 1)
    };
    plant.setPointerCapture(event.pointerId);
    return;
  }
  if (plant) {
    draggedPlant = plant; // Detailed note: this line supports the Electron dashboard renderer and keeps the prototype interaction traceable.
    dragMode = 'placed';
    plant.setPointerCapture(event.pointerId);
    return;
  } // Detailed note: this line supports the Electron dashboard renderer and keeps the prototype interaction traceable.
  if (owned) {
    if (selectedOwnedId !== owned.dataset.ownedSource) {
      selectedOwnedId = owned.dataset.ownedSource;
      renderGardenPage(); // Detailed note: this line supports the Electron dashboard renderer and keeps the prototype interaction traceable.
      toast('Element selected. Drag it onto the desk.');
      return;
    }
    owned.classList.add('dragging-active'); // Detailed note: this line supports the Electron dashboard renderer and keeps the prototype interaction traceable.
    draggedPlant = document.createElement('div');
    draggedPlant.className = 'plant-dot dragging-from-list';
    draggedPlant.dataset.ownedId = owned.dataset.ownedSource;
    draggedPlant.innerHTML = `${elementVisual(owned.dataset.visual, owned.dataset.plantId)}<small>${owned.dataset.name}</small>`;
    document.body.appendChild(draggedPlant); // Detailed note: this line supports the Electron dashboard renderer and keeps the prototype interaction traceable.
    dragMode = 'new';
  }
});

document.addEventListener('pointermove', (event) => { // Detailed note: this line supports the Electron dashboard renderer and keeps the prototype interaction traceable.
  if (resizingPlant && resizeStart) {
    const delta = Math.max(event.clientX - resizeStart.x, event.clientY - resizeStart.y);
    const nextScale = Math.max(0.45, Math.min(2.6, resizeStart.scale + delta / 180));
    resizingPlant.dataset.scale = nextScale.toFixed(2);
    resizingPlant.style.transform = `translate(-50%, -50%) scale(${nextScale.toFixed(2)})`;
    return;
  }
  if (!draggedPlant) return;
  if (dragMode === 'new') {
    draggedPlant.style.left = `${event.clientX}px`;
    draggedPlant.style.top = `${event.clientY}px`;
    return;
  } // Detailed note: this line supports the Electron dashboard renderer and keeps the prototype interaction traceable.
  const surface = $('#deskStage .desk-surface').getBoundingClientRect();
  const x = Math.max(3, Math.min(94, ((event.clientX - surface.left) / surface.width) * 100));
  const y = Math.max(8, Math.min(86, ((event.clientY - surface.top) / surface.height) * 100));
  draggedPlant.style.left = `${x}%`;
  draggedPlant.style.top = `${y}%`;
}); // Detailed note: this line supports the Electron dashboard renderer and keeps the prototype interaction traceable.

document.addEventListener('pointerup', async (event) => {
  if (resizingPlant) {
    const surface = $('#deskStage .desk-surface').getBoundingClientRect();
    const box = resizingPlant.getBoundingClientRect();
    const x = Math.max(3, Math.min(94, ((box.left + box.width / 2 - surface.left) / surface.width) * 100));
    const y = Math.max(8, Math.min(86, ((box.top + box.height / 2 - surface.top) / surface.height) * 100));
    const scale = Number(resizingPlant.dataset.scale || 1);
    await savePlantByCoordinates(resizingPlant.dataset.ownedId, x, y, scale);
    resizingPlant = null;
    resizeStart = null;
    await loadState();
    return;
  }
  if (!draggedPlant) return;
  if (dragMode === 'new') {
    const id = draggedPlant.dataset.ownedId; // Detailed note: this line supports the Electron dashboard renderer and keeps the prototype interaction traceable.
    const inside = isPointerInsideDesk(event);
    draggedPlant.remove();
    draggedPlant = null;
    dragMode = null; // Detailed note: this line supports the Electron dashboard renderer and keeps the prototype interaction traceable.
    if (inside) {
      const surface = $('#deskStage .desk-surface').getBoundingClientRect();
      const x = Math.max(3, Math.min(94, ((event.clientX - surface.left) / surface.width) * 100));
      const y = Math.max(8, Math.min(86, ((event.clientY - surface.top) / surface.height) * 100)); // Detailed note: this line supports the Electron dashboard renderer and keeps the prototype interaction traceable.
      await savePlantByCoordinates(id, x, y);
      selectedOwnedId = null;
      await loadState();
    } // Detailed note: this line supports the Electron dashboard renderer and keeps the prototype interaction traceable.
    return;
  }
  const placedId = draggedPlant.dataset.ownedId;
  if (isPointerInsideOwnedList(event)) { // Detailed note: this line supports the Electron dashboard renderer and keeps the prototype interaction traceable.
    await unplacePlant(placedId);
    selectedOwnedId = null;
  } else if (isPointerInsideDesk(event)) {
    await savePlantPosition(draggedPlant, event); // Detailed note: this line supports the Electron dashboard renderer and keeps the prototype interaction traceable.
  }
  draggedPlant = null;
  dragMode = null;
  await loadState(); // Detailed note: this line supports the Electron dashboard renderer and keeps the prototype interaction traceable.
});

const initialSection = location.hash ? location.hash.slice(1) : 'dashboard';
switchPage(initialSection);
loadState(); // Detailed note: this line supports the Electron dashboard renderer and keeps the prototype interaction traceable.
setInterval(loadState, 5000);
