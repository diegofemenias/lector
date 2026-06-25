INSERT INTO app_meta (key, value) VALUES ('data_sync_version', '4')
ON CONFLICT(key) DO UPDATE SET value = excluded.value;
