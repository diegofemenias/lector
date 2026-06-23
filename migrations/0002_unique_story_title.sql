-- Evitar cuentos duplicados por condiciones de carrera al sembrar
CREATE UNIQUE INDEX IF NOT EXISTS idx_stories_title_unique ON stories(title);
