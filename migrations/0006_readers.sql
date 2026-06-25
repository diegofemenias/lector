-- Fase 1: lectores por cuenta Google (migración aditiva + backfill)

CREATE TABLE IF NOT EXISTS readers (
  id TEXT PRIMARY KEY,
  account_id TEXT NOT NULL,
  display_name TEXT NOT NULL,
  level INTEGER NOT NULL DEFAULT 1 CHECK (level IN (1, 2, 3)),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (account_id) REFERENCES users(id)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_readers_display_name_unique ON readers(display_name COLLATE NOCASE);
CREATE INDEX IF NOT EXISTS idx_readers_account ON readers(account_id);

ALTER TABLE stories ADD COLUMN level INTEGER NOT NULL DEFAULT 1;

ALTER TABLE story_attempts ADD COLUMN reader_id TEXT REFERENCES readers(id);

-- Un lector por cada usuario con nombre (mapeo estable r-{user_id})
INSERT OR IGNORE INTO readers (id, account_id, display_name, level)
SELECT
  'r-' || u.id,
  u.id,
  u.display_name,
  CASE WHEN lower(trim(u.display_name)) = 'claribella' THEN 1 ELSE 2 END
FROM users u
WHERE u.display_name IS NOT NULL;

UPDATE story_attempts
SET reader_id = 'r-' || user_id
WHERE reader_id IS NULL AND user_id IN (SELECT account_id FROM readers);

-- Nueva tabla de intentos keyed por lector (conserva datos)
CREATE TABLE IF NOT EXISTS story_attempts_v2 (
  reader_id TEXT NOT NULL,
  story_id INTEGER NOT NULL,
  points INTEGER NOT NULL DEFAULT 0,
  read_point INTEGER NOT NULL DEFAULT 0,
  correct_count INTEGER NOT NULL DEFAULT 0,
  bonus_point INTEGER NOT NULL DEFAULT 0,
  completed_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (reader_id, story_id),
  FOREIGN KEY (reader_id) REFERENCES readers(id),
  FOREIGN KEY (story_id) REFERENCES stories(id)
);

INSERT OR IGNORE INTO story_attempts_v2 (
  reader_id, story_id, points, read_point, correct_count, bonus_point, completed_at
)
SELECT reader_id, story_id, points, read_point, correct_count, bonus_point, completed_at
FROM story_attempts
WHERE reader_id IS NOT NULL;

DROP TABLE story_attempts;
ALTER TABLE story_attempts_v2 RENAME TO story_attempts;

CREATE INDEX IF NOT EXISTS idx_attempts_reader ON story_attempts(reader_id);

UPDATE stories SET level = 1 WHERE level IS NULL OR level = 0;
