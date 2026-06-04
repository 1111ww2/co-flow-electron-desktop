// Local server for the Co-Flow Electron desktop prototype.
// Electron starts this server so both the main dashboard window and the floating window can share one local API.
// The server also owns the SQLite connection, which keeps prototype state persistent between renderer updates.
// No external network service is required for the core demo flow.

import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { initDb, row, all, run } from './db.js';

const __filename = fileURLToPath(import.meta.url); // Detailed note: this line supports the local Node server that stores and returns Co-Flow state.
const __dirname = path.dirname(__filename);
const root = path.join(__dirname, '..');
const publicDir = path.join(root, 'public');
const db = initDb(); // Detailed note: this line supports the local Node server that stores and returns Co-Flow state.
const port = process.env.PORT || 3000;

// Lightweight migration helper for older local databases.
// It keeps existing prototype databases compatible when new settings columns are added.
function ensureMigrations() {
  try { run(db, 'ALTER TABLE settings ADD COLUMN alert_snoozed_until INTEGER NOT NULL DEFAULT 0'); } catch (error) { /* already exists */ }
} // Detailed note: this line supports the local Node server that stores and returns Co-Flow state.

ensureMigrations();

// Static file MIME map for the local dashboard renderer.
// These files are served only from the local public folder used by Electron.
const mimeTypes = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8', // Detailed note: this line supports the local Node server that stores and returns Co-Flow state.
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png', // Detailed note: this line supports the local Node server that stores and returns Co-Flow state.
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.ico': 'image/x-icon',
  '.webp': 'image/webp' // Detailed note: this line supports the local Node server that stores and returns Co-Flow state.
};

// Send a JSON or text response from the local API.
// Most desktop renderer actions expect JSON so objects are stringified by default.
function send(res, status, body, type = 'application/json; charset=utf-8') {
  res.writeHead(status, { 'Content-Type': type });
  res.end(typeof body === 'string' ? body : JSON.stringify(body)); // Detailed note: this line supports the local Node server that stores and returns Co-Flow state.
}

// Parse JSON request bodies from dashboard interactions.
// The limit protects the prototype from very large desk photo uploads.
function parseBody(req) {
  return new Promise((resolve, reject) => {
    let data = ''; // Detailed note: this line supports the local Node server that stores and returns Co-Flow state.
    req.on('data', chunk => {
      data += chunk;
      if (data.length > 16 * 1024 * 1024) {
        reject(new Error('Upload too large. Please use an image under 10MB.')); // Detailed note: this line supports the local Node server that stores and returns Co-Flow state.
        req.destroy();
      }
    });
    req.on('end', () => { // Detailed note: this line supports the local Node server that stores and returns Co-Flow state.
      if (!data) return resolve({});
      try { resolve(JSON.parse(data)); } catch (error) { reject(error); }
    });
  }); // Detailed note: this line supports the local Node server that stores and returns Co-Flow state.
}

// Convert the numeric energy value into the status labels shown in the UI.
// This keeps dashboard, floating window, and history records consistent.
function getStatus(energy) {
  if (energy >= 70) return 'Normal';
  if (energy >= 40) return 'Mild Fatigue'; // Detailed note: this line supports the local Node server that stores and returns Co-Flow state.
  return 'Severe Fatigue';
}

// Apply an energy decrease and immediately update the stored status.
// Work simulation and camera inactivity both reuse this helper.
function decreaseEnergy(loss) {
  const current = row(db, 'SELECT energy FROM users WHERE id = ?', [1]).energy; // Detailed note: this line supports the local Node server that stores and returns Co-Flow state.
  const next = Math.max(0, current - loss);
  run(db, 'UPDATE users SET energy = ?, status = ? WHERE id = ?', [next, getStatus(next), 1]);
  return { energy: next, status: getStatus(next), loss };
} // Detailed note: this line supports the local Node server that stores and returns Co-Flow state.

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

// Reset daily Nature Points and garden ownership once per calendar day.
// This supports the prototype idea that users rebuild a daily restorative desk environment.
function applyDailyResetIfNeeded() { // Detailed note: this line supports the local Node server that stores and returns Co-Flow state.
  const settings = row(db, 'SELECT * FROM settings WHERE user_id = ?', [1]);
  if (!settings) return;
  const today = todayKey();
  if (settings.last_daily_reset === today) return; // Detailed note: this line supports the local Node server that stores and returns Co-Flow state.
  run(db, 'UPDATE users SET nature_points = ? WHERE id = ?', [140, 1]);
  run(db, 'DELETE FROM owned_plants WHERE user_id = ?', [1]);
  run(db, 'UPDATE settings SET last_daily_reset = ? WHERE user_id = ?', [today, 1]);
} // Detailed note: this line supports the local Node server that stores and returns Co-Flow state.

// Build the complete local state package consumed by both renderer windows.
// This combines user data, tasks, team status, garden elements, history, and settings.
function getState() {
  applyDailyResetIfNeeded();
  const user = row(db, 'SELECT * FROM users WHERE id = ?', [1]);
  const team = row(db, 'SELECT * FROM team_status ORDER BY id DESC LIMIT 1'); // Detailed note: this line supports the local Node server that stores and returns Co-Flow state.
  const tasks = all(db, 'SELECT * FROM recovery_tasks WHERE id != ? ORDER BY duration_minutes, name', ['cobreak']);
  const plants = all(db, 'SELECT * FROM plants ORDER BY cost');
  const ownedPlants = all(db, `
    SELECT owned_plants.*, plants.name, plants.type, plants.meaning, plants.visual, plants.cost
    FROM owned_plants
    JOIN plants ON owned_plants.plant_id = plants.id
    WHERE owned_plants.user_id = ?
    ORDER BY owned_plants.id
  `, [1]);
  const history = all(db, `
    SELECT task_history.*, recovery_tasks.name, recovery_tasks.category, recovery_tasks.points_gain
    FROM task_history
    JOIN recovery_tasks ON task_history.task_id = recovery_tasks.id
    WHERE task_history.user_id = ?
    ORDER BY task_history.id DESC
    LIMIT 12
  `, [1]);
  const settings = row(db, 'SELECT * FROM settings WHERE user_id = ?', [1]);
  if (user.energy >= 40 && settings?.alert_snoozed_until) { // Detailed note: this line supports the local Node server that stores and returns Co-Flow state.
    run(db, 'UPDATE settings SET alert_snoozed_until = 0 WHERE user_id = ?', [1]);
    settings.alert_snoozed_until = 0;
  }
  return { user, team, tasks, plants, ownedPlants, history, settings }; // Detailed note: this line supports the local Node server that stores and returns Co-Flow state.
}

// Handle all JSON API routes used by the Electron renderer windows.
// Routes are intentionally small and explicit so the prototype logic is easy to explain.
async function handleApi(req, res, url) {
  if (req.method === 'GET' && url.pathname === '/api/state') {
    return send(res, 200, getState()); // Detailed note: this line supports the local Node server that stores and returns Co-Flow state.
  }

  if (req.method === 'POST' && url.pathname === '/api/work') {
    const body = await parseBody(req);
    const minutes = Number(body.minutes || 30); // Detailed note: this line supports the local Node server that stores and returns Co-Flow state.
    const loss = minutes >= 120 ? 20 : minutes >= 60 ? 10 : 5;
    const result = decreaseEnergy(loss);
    return send(res, 200, { ok: true, ...result });
  } // Detailed note: this line supports the local Node server that stores and returns Co-Flow state.

  if (req.method === 'POST' && url.pathname === '/api/tasks/complete') {
    const body = await parseBody(req);
    const task = row(db, 'SELECT * FROM recovery_tasks WHERE id = ?', [body.taskId]);
    if (!task) return send(res, 404, { error: 'Task not found' }); // Detailed note: this line supports the local Node server that stores and returns Co-Flow state.
    const user = row(db, 'SELECT * FROM users WHERE id = ?', [1]);
    const nextEnergy = Math.min(100, user.energy + task.energy_gain);
    const nextPoints = user.nature_points + task.points_gain;
    run(db, 'UPDATE users SET energy = ?, nature_points = ?, status = ? WHERE id = ?', [nextEnergy, nextPoints, getStatus(nextEnergy), 1]); // Detailed note: this line supports the local Node server that stores and returns Co-Flow state.
    run(db, 'INSERT INTO task_history (user_id, task_id, energy_after, points_after) VALUES (?, ?, ?, ?)', [1, task.id, nextEnergy, nextPoints]);
    return send(res, 200, { ok: true, task, energy: nextEnergy, points: nextPoints, status: getStatus(nextEnergy) });
  }

  if (req.method === 'POST' && url.pathname === '/api/plants/redeem') { // Detailed note: this line supports the local Node server that stores and returns Co-Flow state.
    const body = await parseBody(req);
    const plant = row(db, 'SELECT * FROM plants WHERE id = ?', [body.plantId]);
    if (!plant) return send(res, 404, { error: 'Plant not found' });
    const user = row(db, 'SELECT * FROM users WHERE id = ?', [1]); // Detailed note: this line supports the local Node server that stores and returns Co-Flow state.
    if (user.nature_points < plant.cost) return send(res, 400, { error: 'Not enough Nature Points' });
    const nextPoints = user.nature_points - plant.cost;
    run(db, 'UPDATE users SET nature_points = ? WHERE id = ?', [nextPoints, 1]);
    run(db, 'INSERT INTO owned_plants (user_id, plant_id, x, y, scale, placed) VALUES (?, ?, ?, ?, ?, ?)', [1, plant.id, 50, 50, 1, 0]); // Detailed note: this line supports the local Node server that stores and returns Co-Flow state.
    return send(res, 200, { ok: true, plant, points: nextPoints });
  }

  if (req.method === 'POST' && url.pathname === '/api/plants/move') {
    const body = await parseBody(req); // Detailed note: this line supports the local Node server that stores and returns Co-Flow state.
    const id = Number(body.id);
    const x = Math.max(3, Math.min(94, Number(body.x)));
    const y = Math.max(8, Math.min(86, Number(body.y)));
    const scale = Math.max(0.45, Math.min(2.6, Number(body.scale || 1)));
    run(db, 'UPDATE owned_plants SET x = ?, y = ?, scale = ?, placed = 1 WHERE id = ? AND user_id = ?', [x, y, scale, id, 1]); // Detailed note: this line supports the local Node server that stores and returns Co-Flow state.
    return send(res, 200, { ok: true, id, x, y, scale });
  }

  if (req.method === 'POST' && url.pathname === '/api/plants/unplace') {
    const body = await parseBody(req); // Detailed note: this line supports the local Node server that stores and returns Co-Flow state.
    const id = Number(body.id);
    run(db, 'UPDATE owned_plants SET placed = 0 WHERE id = ? AND user_id = ?', [id, 1]);
    return send(res, 200, { ok: true, id });
  } // Detailed note: this line supports the local Node server that stores and returns Co-Flow state.


  if (req.method === 'POST' && url.pathname === '/api/desk/delete') {
    run(db, 'UPDATE settings SET desk_photo = NULL, desk_scan_ready = ? WHERE user_id = ?', [0, 1]);
    run(db, 'UPDATE owned_plants SET placed = 0 WHERE user_id = ?', [1]);
    return send(res, 200, { ok: true, desk_scan_ready: 0 }); // Detailed note: this line supports the local Node server that stores and returns Co-Flow state.
  }

  if (req.method === 'POST' && url.pathname === '/api/desk/photo') {
    const body = await parseBody(req);
    const photo = String(body.photo || ''); // Detailed note: this line supports the local Node server that stores and returns Co-Flow state.
    if (!photo.startsWith('data:image/')) return send(res, 400, { error: 'Please upload a valid image file.' });
    run(db, 'UPDATE settings SET desk_photo = ?, desk_scan_ready = ? WHERE user_id = ?', [photo, 1, 1]);
    return send(res, 200, { ok: true, desk_scan_ready: 1 });
  } // Detailed note: this line supports the local Node server that stores and returns Co-Flow state.


  if (req.method === 'POST' && url.pathname === '/api/alert/snooze') {
    const body = await parseBody(req);
    const minutes = Math.max(1, Math.min(120, Number(body.minutes || 10)));
    const until = Date.now() + minutes * 60 * 1000; // Detailed note: this line supports the local Node server that stores and returns Co-Flow state.
    run(db, 'UPDATE settings SET alert_snoozed_until = ? WHERE user_id = ?', [until, 1]);
    return send(res, 200, { ok: true, until, minutes });
  }

  if (req.method === 'POST' && url.pathname === '/api/alert/clear') { // Detailed note: this line supports the local Node server that stores and returns Co-Flow state.
    run(db, 'UPDATE settings SET alert_snoozed_until = 0 WHERE user_id = ?', [1]);
    return send(res, 200, { ok: true });
  }

  if (req.method === 'POST' && url.pathname === '/api/profile') { // Detailed note: this line supports the local Node server that stores and returns Co-Flow state.
    const body = await parseBody(req);
    const userCode = String(body.userCode || 'CF-001').trim().slice(0, 40) || 'CF-001';
    const companyRole = String(body.companyRole || '').trim().slice(0, 80);
    const avatar = String(body.avatar || ''); // Detailed note: this line supports the local Node server that stores and returns Co-Flow state.
    if (avatar && !avatar.startsWith('data:image/')) return send(res, 400, { error: 'Please upload a valid avatar image.' });
    run(db, 'UPDATE users SET user_code = ?, company_role = ?, avatar = ? WHERE id = ?', [userCode, companyRole, avatar || null, 1]);
    return send(res, 200, { ok: true, userCode, companyRole, hasAvatar: Boolean(avatar) });
  } // Detailed note: this line supports the local Node server that stores and returns Co-Flow state.

  if (req.method === 'POST' && url.pathname === '/api/camera/status') {
    const body = await parseBody(req);
    const movement = Math.max(0, Math.min(100, Number(body.movement || 0)));
    const inactiveMinutes = Math.max(0, Math.floor(Number(body.inactiveMinutes || 0))); // Detailed note: this line supports the local Node server that stores and returns Co-Flow state.
    const enabled = body.enabled ? 1 : 0;
    run(db, 'UPDATE settings SET camera_enabled = ?, camera_movement = ?, camera_inactive_minutes = ? WHERE user_id = ?', [enabled, movement, inactiveMinutes, 1]);
    return send(res, 200, { ok: true, movement, inactiveMinutes, enabled });
  }

  if (req.method === 'POST' && url.pathname === '/api/camera/energy-impact') { // Detailed note: this line supports the local Node server that stores and returns Co-Flow state.
    const body = await parseBody(req);
    const loss = Math.max(1, Math.min(20, Number(body.loss || 5)));
    const result = decreaseEnergy(loss);
    return send(res, 200, { ok: true, source: 'camera', ...result }); // Detailed note: this line supports the local Node server that stores and returns Co-Flow state.
  }

  if (req.method === 'POST' && url.pathname === '/api/cobreak/join') {
    const user = row(db, 'SELECT * FROM users WHERE id = ?', [1]);
    const nextEnergy = Math.min(100, user.energy + 14); // Detailed note: this line supports the local Node server that stores and returns Co-Flow state.
    const nextPoints = user.nature_points + 36;
    run(db, 'UPDATE users SET energy = ?, nature_points = ?, status = ? WHERE id = ?', [nextEnergy, nextPoints, getStatus(nextEnergy), 1]);
    run(db, 'INSERT OR IGNORE INTO recovery_tasks VALUES (?, ?, ?, ?, ?, ?, ?, ?)', ['cobreak', 'Team Co-Break', 'Team Recovery', 6, 14, 36, 'Join a voluntary shared nature break when team fatigue is high.', 'Shared recovery']);
    run(db, 'INSERT INTO task_history (user_id, task_id, energy_after, points_after) VALUES (?, ?, ?, ?)', [1, 'cobreak', nextEnergy, nextPoints]);
    return send(res, 200, { ok: true, energy: nextEnergy, points: nextPoints, status: getStatus(nextEnergy) }); // Detailed note: this line supports the local Node server that stores and returns Co-Flow state.
  }

  return send(res, 404, { error: 'API route not found' });
}

// Serve dashboard and floating-window files from the local public directory.
// Path normalization prevents requests from escaping the project folder.
function serveStatic(req, res, url) { // Detailed note: this line supports the local Node server that stores and returns Co-Flow state.
  let pathname = decodeURIComponent(url.pathname);
  if (pathname === '/') pathname = '/index.html';
  const filePath = path.normalize(path.join(publicDir, pathname));
  if (!filePath.startsWith(publicDir)) return send(res, 403, 'Forbidden', 'text/plain'); // Detailed note: this line supports the local Node server that stores and returns Co-Flow state.
  if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
    return send(res, 404, 'Not found', 'text/plain');
  }
  const ext = path.extname(filePath).toLowerCase(); // Detailed note: this line supports the local Node server that stores and returns Co-Flow state.
  res.writeHead(200, { 'Content-Type': mimeTypes[ext] || 'application/octet-stream' });
  fs.createReadStream(filePath).pipe(res);
}

// Main local HTTP server used by Electron and optional browser debugging.
// API requests are handled first; everything else is treated as a local renderer asset.
const server = http.createServer(async (req, res) => { // Detailed note: this line supports the local Node server that stores and returns Co-Flow state.
  const url = new URL(req.url, `http://${req.headers.host}`);
  try {
    if (url.pathname.startsWith('/api/')) return await handleApi(req, res, url);
    return serveStatic(req, res, url);
  } catch (error) { // Detailed note: this line supports the local Node server that stores and returns Co-Flow state.
    console.error(error);
    return send(res, 500, { error: error.message });
  }
}); // Detailed note: this line supports the local Node server that stores and returns Co-Flow state.

server.listen(port, () => {
  console.log(`Co-Flow local desktop prototype server running at http://localhost:${port}`);
  console.log('Use npm run desktop for the full Electron experience. npm start is only for local renderer debugging.');
});
