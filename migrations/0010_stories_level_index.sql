-- Acelera búsqueda de cuentos por nivel
CREATE INDEX IF NOT EXISTS idx_stories_level ON stories(level);
