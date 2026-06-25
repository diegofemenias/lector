-- Permitir el mismo título en distintos niveles
DROP INDEX IF EXISTS idx_stories_title_unique;
CREATE UNIQUE INDEX IF NOT EXISTS idx_stories_title_level_unique ON stories(title, level);
