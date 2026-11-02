ALTER TABLE load_updates ADD COLUMN version INTEGER NOT NULL DEFAULT 1;
ALTER TABLE load_updates ADD COLUMN updated_at TEXT;
ALTER TABLE load_updates ADD COLUMN last_operation TEXT;
ALTER TABLE load_updates ADD COLUMN deleted_at TEXT;
CREATE UNIQUE INDEX one_update_per_person_shift ON load_updates(service_date,shift,volunteer_id) WHERE volunteer_id IS NOT NULL AND deleted_at IS NULL;
