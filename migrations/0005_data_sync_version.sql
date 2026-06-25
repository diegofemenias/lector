-- Marcar catálogo ya sincronizado en producción (evita sync masivo en cada arranque).
INSERT INTO app_meta (key, value) VALUES ('data_sync_version', '3')
ON CONFLICT(key) DO UPDATE SET value = excluded.value;
