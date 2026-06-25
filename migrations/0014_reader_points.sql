-- Puntos precalculados por lector (ranking y perfil sin JOIN sobre story_attempts)
ALTER TABLE readers ADD COLUMN points_total INTEGER NOT NULL DEFAULT 0;
ALTER TABLE readers ADD COLUMN points_today INTEGER NOT NULL DEFAULT 0;
ALTER TABLE readers ADD COLUMN points_today_date TEXT;

UPDATE readers
SET points_total = (
  SELECT COALESCE(SUM(a.points), 0)
  FROM story_attempts a
  WHERE a.reader_id = readers.id
);

UPDATE readers
SET
  points_today = (
    SELECT COALESCE(SUM(a.points), 0)
    FROM story_attempts a
    WHERE a.reader_id = readers.id
      AND date(a.completed_at, '-3 hours') = date('now', '-3 hours')
  ),
  points_today_date = date('now', '-3 hours');
