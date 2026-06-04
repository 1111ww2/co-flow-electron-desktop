// Demo data seed file for the Co-Flow Electron desktop prototype.
// Running npm run seed resets the local SQLite database to a clean presentation state.
// The data below supports the dashboard, recovery tasks, Co-Break history, and garden store.

import { resetDb, run } from './db.js';
// The daily reset system needs a stored date key.
// The seed uses today so the first run does not immediately reset the points again.
const today = new Date().toISOString().slice(0, 10);

// Start from a fresh database every time the seed command runs.
// This avoids old demo interactions affecting the next presentation.
const db = resetDb();

// Insert the single demo user used throughout the local prototype.
// User profile details can later be edited from the Co-Break profile modal.
run(db, `INSERT INTO users (id, name, role, user_code, company_role, energy, nature_points, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
  [1, 'Yuxi', 'Office worker', '', '', 72, 140, 'Normal']); // Detailed note: this line prepares predictable demo data for assessment and testing.

// Recovery task data shown on the Recovery page.
// Each task defines category, duration, energy gain, points gain, and explanation.
const tasks = [
  ['sunlight', 'Sunlight Reset', 'Sunlight', 3, 10, 24, 'Move near a window or outside and receive natural light for a short reset.', 'Light exposure'],
  ['walking', 'Short Walk', 'Walking', 5, 12, 28, 'Leave the desk briefly and complete a low-effort walk to restore rhythm.', 'Body movement'],
  ['wind', 'Feel the Wind', 'Wind', 3, 10, 22, 'Step to a balcony, doorway, or outdoor edge and feel natural air movement.', 'Airflow'],
  ['water', 'Water Touch', 'Water', 2, 8, 18, 'Wash hands slowly or touch cool water as a sensory reset.', 'Water contact'], // Detailed note: this line prepares predictable demo data for assessment and testing.
  ['sound', 'Nature Sound', 'Sound', 4, 9, 20, 'Listen to a short natural soundscape or real outdoor sound.', 'Auditory recovery'],
  ['plantbreath', 'Plant Breathing', 'Plant / Forest', 3, 10, 22, 'Move close to a plant or green view and complete a slow breathing reset.', 'Visual nature and breathing'],
  ['cobreak', 'Team Co-Break', 'Team Recovery', 6, 14, 36, 'Join a voluntary shared nature break when team fatigue is high.', 'Shared recovery']
];
// Save all recovery tasks into SQLite so the renderer loads them from /api/state.
// This makes the prototype feel data-driven rather than hard-coded in the interface.
for (const task of tasks) { // Detailed note: this line prepares predictable demo data for assessment and testing.
  run(db, `INSERT INTO recovery_tasks VALUES (?, ?, ?, ?, ?, ?, ?, ?)`, task);
}

// Insert one snapshot of simulated team wellbeing data.
// The dashboard uses this to show team average and fatigued member count.
run(db, `INSERT INTO team_status (team_name, average_energy, fatigued_members, total_members) VALUES (?, ?, ?, ?)`,
  ['Design Studio Team', 54, 4, 7]);

// Store items for the Restorative Garden.
// Users redeem these with Nature Points and place them on the desk projection surface.
const plants = [
  ['sunbeam', 'Morning Sunbeam', 'Sunlight', 45, 'A soft light patch that represents short sunlight recovery.', 'sunbeam'], // Detailed note: this line prepares predictable demo data for assessment and testing.
  ['sunset_light', 'Golden Sunset Light', 'Sunlight', 70, 'A warmer light layer for deeper emotional recovery.', 'sunset'],
  ['window_light', 'Window Light Panel', 'Sunlight', 55, 'A calm indoor light texture for window-side breaks.', 'window-light'],
  ['river_line', 'Small River Stream', 'Water', 65, 'A flowing water element for sensory reset and calm focus.', 'river'],
  ['ocean_wave', 'Ocean Surface', 'Water', 85, 'A wide blue water layer representing expansive recovery.', 'ocean'], // Detailed note: this line prepares predictable demo data for assessment and testing.
  ['creek_flow', 'Creek Flow', 'Water', 50, 'A small creek element for low-effort micro-restoration.', 'creek'],
  ['moss_patch', 'Moss Patch', 'Plant / Forest', 40, 'A soft green ground element for desk-based nature presence.', 'moss'],
  ['mini_tree', 'Miniature Tree', 'Plant / Forest', 95, 'A larger planted element that marks repeated recovery behavior.', 'mini-tree'],
  ['grass_field', 'Wind Grass Field', 'Plant / Forest', 60, 'A small field of grass that can sit beside the keyboard or screen.', 'grass'], // Detailed note: this line prepares predictable demo data for assessment and testing.
  ['wind_lines', 'Moving Air Lines', 'Wind', 45, 'A subtle airflow element that represents fresh air and release.', 'wind-lines'],
  ['soft_fog', 'Light Mist', 'Wind', 55, 'A calm atmospheric layer for creating depth on the digital desk.', 'fog'],
  ['sound_wave', 'Forest Sound Wave', 'Sound', 50, 'A visual soundscape element linked to nature listening tasks.', 'sound-wave'],
  ['birdsong_arc', 'Birdsong Arc', 'Sound', 60, 'A quiet auditory recovery element represented through soft wave arcs.', 'birdsong'], // Detailed note: this line prepares predictable demo data for assessment and testing.
  ['sea_glow', 'Sea Glow Pool', 'Water', 75, 'A glowing water pool that turns water-contact recovery into a calm desk element.', 'ocean'],
  ['leaf_shadow', 'Leaf Shadow Layer', 'Sunlight', 48, 'A soft leaf-shadow light texture that brings outdoor sunlight onto the desk.', 'window-light']
];
// Save every garden item into SQLite.
// The renderer later joins owned_plants with this table for display.
for (const plant of plants) {
  run(db, `INSERT INTO plants VALUES (?, ?, ?, ?, ?, ?)`, plant);
} // Detailed note: this line prepares predictable demo data for assessment and testing.

// Give the user two starting unplaced elements for demonstration.
// They remain in the purchased list until dragged onto the desk.
run(db, `INSERT INTO owned_plants (user_id, plant_id, x, y, scale, placed) VALUES (?, ?, ?, ?, ?, ?)`, [1, 'sunbeam', 50, 50, 1, 0]);
run(db, `INSERT INTO owned_plants (user_id, plant_id, x, y, scale, placed) VALUES (?, ?, ?, ?, ?, ?)`, [1, 'moss_patch', 50, 50, 1, 0]);
// Initial device and alert settings for the local desktop prototype.
// Camera and desk scan start disabled so the user can activate them during the demo.
run(db, `INSERT INTO settings (user_id, desk_scan_ready, camera_enabled, camera_movement, camera_inactive_minutes, last_daily_reset, alert_snoozed_until) VALUES (?, ?, ?, ?, ?, ?, ?)`, [1, 0, 0, 0, 0, today, 0]);

// Close the database connection after the seed data is written.
// The server will open its own connection when the desktop app starts.
db.close();
console.log('Seed complete. SQLite database created at db/coflow.db');
