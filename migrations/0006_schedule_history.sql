-- Immutable recurring-plan versions, including names, independent of volunteer lifecycle.
CREATE TABLE schedule_versions (
 id INTEGER PRIMARY KEY AUTOINCREMENT,
 recorded_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
 people_json TEXT NOT NULL CHECK(json_valid(people_json))
);
CREATE INDEX schedule_versions_time ON schedule_versions(recorded_at,id);
INSERT INTO schedule_versions(people_json) SELECT COALESCE(json_group_array(json_object('id',id,'name',name,'assignments',json(assignments_json))), '[]') FROM volunteers WHERE active=1;
CREATE TRIGGER record_schedule_insert AFTER INSERT ON volunteers BEGIN
 INSERT INTO schedule_versions(people_json) SELECT COALESCE(json_group_array(json_object('id',id,'name',name,'assignments',json(assignments_json))), '[]') FROM volunteers WHERE active=1;
END;
CREATE TRIGGER record_schedule_update AFTER UPDATE OF name,assignments_json,active ON volunteers BEGIN
 INSERT INTO schedule_versions(people_json) SELECT COALESCE(json_group_array(json_object('id',id,'name',name,'assignments',json(assignments_json))), '[]') FROM volunteers WHERE active=1;
END;
CREATE TRIGGER record_schedule_delete AFTER DELETE ON volunteers BEGIN
 INSERT INTO schedule_versions(people_json) SELECT COALESCE(json_group_array(json_object('id',id,'name',name,'assignments',json(assignments_json))), '[]') FROM volunteers WHERE active=1;
END;
