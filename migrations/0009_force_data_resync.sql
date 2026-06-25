-- La migración 0008 marcó data_sync_version=4 sin insertar cuentos L2/L3.
-- Borrar la clave para que touchDataSync vuelva a sincronizar.
DELETE FROM app_meta WHERE key = 'data_sync_version';
