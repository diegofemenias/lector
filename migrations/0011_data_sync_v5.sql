-- Forzar re-sync de preguntas/opciones tras correcciones de coherencia.
DELETE FROM app_meta WHERE key = 'data_sync_version';
