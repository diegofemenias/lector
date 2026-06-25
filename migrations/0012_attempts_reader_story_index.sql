-- Acelera NOT EXISTS al buscar cuentos no leídos por lector
CREATE INDEX IF NOT EXISTS idx_attempts_reader_story ON story_attempts(reader_id, story_id);
