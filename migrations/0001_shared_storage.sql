-- Shared laundry updates. Photos are stored in R2; only their keys live in D1.
CREATE TABLE IF NOT EXISTS load_updates (
  id TEXT PRIMARY KEY,
  service_date TEXT NOT NULL,
  shift TEXT NOT NULL CHECK (shift IN ('am', 'pm')),
  volunteer_name TEXT NOT NULL,
  loads_json TEXT NOT NULL CHECK (json_valid(loads_json)),
  notes TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS load_updates_date_shift
  ON load_updates(service_date, shift, created_at);

CREATE TABLE IF NOT EXISTS update_photos (
  object_key TEXT PRIMARY KEY,
  update_id TEXT NOT NULL REFERENCES load_updates(id) ON DELETE CASCADE,
  content_type TEXT NOT NULL DEFAULT 'image/jpeg',
  byte_size INTEGER NOT NULL CHECK (byte_size > 0),
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS update_photos_update_id ON update_photos(update_id);

-- Version supports conditional updates when volunteers offer backup at once.
-- state_json retains the current request, cover, and previous backup history.
CREATE TABLE IF NOT EXISTS shift_backups (
  service_date TEXT NOT NULL,
  shift TEXT NOT NULL CHECK (shift IN ('am', 'pm')),
  state_json TEXT NOT NULL CHECK (json_valid(state_json)),
  version INTEGER NOT NULL DEFAULT 1 CHECK (version > 0),
  updated_at TEXT NOT NULL,
  PRIMARY KEY (service_date, shift)
);
