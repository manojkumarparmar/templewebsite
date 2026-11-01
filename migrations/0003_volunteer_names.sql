-- Preserve record IDs, sign-in details, roles, and assignments.
UPDATE volunteers
SET name = rtrim(name) || ' Mtj', version = version + 1,
    updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
WHERE id IN ('hema-sirasha', 'swetha', 'sangeeta-patel', 'shilpa',
             'divya-rupini', 'sulakshna', 'vishaka', 'hema', 'renuka',
             'kalyani', 'sreeja', 'padma-sakhi', 'roopal')
  AND rtrim(name) NOT LIKE '% Mtj';

UPDATE volunteers
SET name = 'Ajinkya Pr', version = version + 1,
    updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
WHERE id = 'ajinkya' AND name <> 'Ajinkya Pr';

INSERT INTO volunteers(id, name, roles_json)
VALUES ('vaidehi', 'Vaidehi Mtj', '["volunteer"]')
ON CONFLICT(id) DO NOTHING;
