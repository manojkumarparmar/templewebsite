ALTER TABLE volunteers ADD COLUMN phone TEXT;
CREATE UNIQUE INDEX volunteers_phone ON volunteers(phone) WHERE phone IS NOT NULL;
