PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  role TEXT NOT NULL,
  user_code TEXT NOT NULL DEFAULT '',
  company_role TEXT NOT NULL DEFAULT '',
  avatar TEXT,
  energy INTEGER NOT NULL DEFAULT 76,
  nature_points INTEGER NOT NULL DEFAULT 120,
  status TEXT NOT NULL DEFAULT 'Normal',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS recovery_tasks (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  duration_minutes INTEGER NOT NULL,
  energy_gain INTEGER NOT NULL,
  points_gain INTEGER NOT NULL,
  description TEXT NOT NULL,
  sensory_focus TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS task_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  task_id TEXT NOT NULL,
  completed_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  energy_after INTEGER NOT NULL,
  points_after INTEGER NOT NULL,
  FOREIGN KEY(user_id) REFERENCES users(id),
  FOREIGN KEY(task_id) REFERENCES recovery_tasks(id)
);

CREATE TABLE IF NOT EXISTS team_status (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  team_name TEXT NOT NULL,
  average_energy INTEGER NOT NULL,
  fatigued_members INTEGER NOT NULL,
  total_members INTEGER NOT NULL,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS plants (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  cost INTEGER NOT NULL,
  meaning TEXT NOT NULL,
  visual TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS owned_plants (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  plant_id TEXT NOT NULL,
  x REAL NOT NULL DEFAULT 50,
  y REAL NOT NULL DEFAULT 50,
  scale REAL NOT NULL DEFAULT 1,
  placed INTEGER NOT NULL DEFAULT 0,
  acquired_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(user_id) REFERENCES users(id),
  FOREIGN KEY(plant_id) REFERENCES plants(id)
);

CREATE TABLE IF NOT EXISTS settings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  wristband_connected INTEGER NOT NULL DEFAULT 1,
  phone_connected INTEGER NOT NULL DEFAULT 1,
  desk_scan_ready INTEGER NOT NULL DEFAULT 0,
  desk_photo TEXT,
  camera_enabled INTEGER NOT NULL DEFAULT 0,
  camera_movement REAL NOT NULL DEFAULT 0,
  camera_inactive_minutes INTEGER NOT NULL DEFAULT 0,
  last_daily_reset TEXT NOT NULL DEFAULT '',
  privacy_mode TEXT NOT NULL DEFAULT 'Local camera motion only',
  reminder_mode TEXT NOT NULL DEFAULT 'Low interruption',
  alert_snoozed_until INTEGER NOT NULL DEFAULT 0,
  FOREIGN KEY(user_id) REFERENCES users(id)
);
