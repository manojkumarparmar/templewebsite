CREATE TABLE IF NOT EXISTS volunteers (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT COLLATE NOCASE UNIQUE,
  availability_notes TEXT NOT NULL DEFAULT '',
  assignments_json TEXT NOT NULL DEFAULT '[]' CHECK(json_valid(assignments_json)),
  roles_json TEXT NOT NULL DEFAULT '["volunteer"]' CHECK(json_valid(roles_json)),
  is_super_admin INTEGER NOT NULL DEFAULT 0 CHECK(is_super_admin IN (0,1)),
  active INTEGER NOT NULL DEFAULT 1 CHECK(active IN (0,1)),
  version INTEGER NOT NULL DEFAULT 1,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX IF NOT EXISTS one_super_admin ON volunteers(is_super_admin) WHERE is_super_admin = 1;
CREATE TABLE IF NOT EXISTS auth_sessions (
  token_hash TEXT PRIMARY KEY,
  volunteer_id TEXT NOT NULL REFERENCES volunteers(id) ON DELETE CASCADE,
  expires_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS auth_sessions_volunteer ON auth_sessions(volunteer_id);
CREATE TABLE IF NOT EXISTS auth_identities (
  provider TEXT NOT NULL,
  subject TEXT NOT NULL,
  volunteer_id TEXT NOT NULL REFERENCES volunteers(id) ON DELETE CASCADE,
  PRIMARY KEY(provider, subject)
);
CREATE TABLE IF NOT EXISTS email_codes (
  email TEXT COLLATE NOCASE PRIMARY KEY,
  salt TEXT NOT NULL,
  code_hash TEXT NOT NULL,
  expires_at INTEGER NOT NULL,
  attempts INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS auth_rate_limits (
  key TEXT PRIMARY KEY,
  count INTEGER NOT NULL,
  expires_at INTEGER NOT NULL
);
ALTER TABLE load_updates ADD COLUMN volunteer_id TEXT REFERENCES volunteers(id);
CREATE TRIGGER IF NOT EXISTS protect_super_admin_delete BEFORE DELETE ON volunteers
WHEN OLD.is_super_admin = 1 BEGIN SELECT RAISE(ABORT, 'Super-admin cannot be removed'); END;
CREATE TRIGGER IF NOT EXISTS protect_super_admin_status BEFORE UPDATE OF is_super_admin ON volunteers
WHEN NEW.is_super_admin != OLD.is_super_admin BEGIN SELECT RAISE(ABORT, 'Super-admin status is protected'); END;
CREATE TRIGGER IF NOT EXISTS protect_super_admin_role BEFORE UPDATE ON volunteers
WHEN OLD.is_super_admin = 1 AND (NEW.active != 1 OR NOT EXISTS (SELECT 1 FROM json_each(NEW.roles_json) WHERE value = 'super-admin'))
BEGIN SELECT RAISE(ABORT, 'Super-admin must remain active with the protected role'); END;
CREATE TRIGGER IF NOT EXISTS forbid_super_admin_role_insert BEFORE INSERT ON volunteers
WHEN NEW.is_super_admin = 0 AND EXISTS (SELECT 1 FROM json_each(NEW.roles_json) WHERE value = 'super-admin')
BEGIN SELECT RAISE(ABORT, 'Super-admin role is protected'); END;
CREATE TRIGGER IF NOT EXISTS forbid_super_admin_role_update BEFORE UPDATE ON volunteers
WHEN NEW.is_super_admin = 0 AND EXISTS (SELECT 1 FROM json_each(NEW.roles_json) WHERE value = 'super-admin')
BEGIN SELECT RAISE(ABORT, 'Super-admin role is protected'); END;
INSERT INTO volunteers(id,name,email,roles_json,is_super_admin)
VALUES ('nanda-kumar-das','Nanda Kumar Das',NULL,'["super-admin"]',1);
INSERT INTO volunteers(id,name,roles_json) VALUES ('hema-sirasha','Hema Sirasha','["volunteer"]');
INSERT INTO volunteers(id,name,roles_json) VALUES ('swetha','Swetha','["volunteer"]');
INSERT INTO volunteers(id,name,roles_json) VALUES ('sangeeta-patel','Sangeeta Patel','["volunteer"]');
INSERT INTO volunteers(id,name,roles_json) VALUES ('shilpa','Shilpa','["volunteer"]');
INSERT INTO volunteers(id,name,roles_json) VALUES ('divya-rupini','Divya Rupini','["volunteer"]');
INSERT INTO volunteers(id,name,roles_json) VALUES ('ajinkya','Ajinkya','["volunteer"]');
INSERT INTO volunteers(id,name,roles_json) VALUES ('sulakshna','Sulakshna','["volunteer"]');
INSERT INTO volunteers(id,name,roles_json) VALUES ('vishaka','Vishaka','["volunteer"]');
INSERT INTO volunteers(id,name,roles_json) VALUES ('hema','Hema','["volunteer"]');
INSERT INTO volunteers(id,name,roles_json) VALUES ('renuka','Renuka','["volunteer"]');
INSERT INTO volunteers(id,name,roles_json) VALUES ('kalyani','Kalyani','["volunteer"]');
INSERT INTO volunteers(id,name,roles_json) VALUES ('sreeja','Sreeja','["volunteer"]');
INSERT INTO volunteers(id,name,roles_json) VALUES ('padma-sakhi','Padma Sakhi','["volunteer"]');
INSERT INTO volunteers(id,name,roles_json) VALUES ('roopal','Roopal','["volunteer"]');
UPDATE volunteers SET assignments_json = '[{"weekday":0,"shift":"am"}]' WHERE id = 'hema-sirasha';
UPDATE volunteers SET assignments_json = '[{"weekday":0,"shift":"pm"}]' WHERE id = 'swetha';
UPDATE volunteers SET assignments_json = '[{"weekday":1,"shift":"am"}]' WHERE id = 'sangeeta-patel';
UPDATE volunteers SET assignments_json = '[{"weekday":1,"shift":"pm"}]' WHERE id = 'shilpa';
UPDATE volunteers SET assignments_json = '[{"weekday":2,"shift":"am"}]' WHERE id = 'divya-rupini';
UPDATE volunteers SET assignments_json = '[{"weekday":2,"shift":"pm"}]' WHERE id = 'ajinkya';
UPDATE volunteers SET assignments_json = '[{"weekday":3,"shift":"am"},{"weekday":6,"shift":"pm"}]' WHERE id = 'sulakshna';
UPDATE volunteers SET assignments_json = '[{"weekday":3,"shift":"pm"}]' WHERE id = 'vishaka';
UPDATE volunteers SET assignments_json = '[{"weekday":4,"shift":"am"}]' WHERE id = 'hema';
UPDATE volunteers SET assignments_json = '[{"weekday":5,"shift":"am"}]' WHERE id = 'renuka';
UPDATE volunteers SET assignments_json = '[{"weekday":5,"shift":"pm"}]' WHERE id = 'kalyani';
UPDATE volunteers SET assignments_json = '[{"weekday":6,"shift":"am"}]' WHERE id = 'sreeja';
UPDATE volunteers SET assignments_json = '[{"weekday":6,"shift":"am"}]' WHERE id = 'padma-sakhi';
UPDATE volunteers SET assignments_json = '[{"weekday":6,"shift":"pm"}]' WHERE id = 'roopal';
