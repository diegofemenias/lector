-- Materializa conteos por nivel para evitar GROUP BY en cada request
INSERT INTO app_meta (key, value)
VALUES (
  'story_counts_by_level',
  (
    SELECT printf(
      '{"1":%d,"2":%d,"3":%d}',
      (SELECT COUNT(*) FROM stories WHERE level = 1),
      (SELECT COUNT(*) FROM stories WHERE level = 2),
      (SELECT COUNT(*) FROM stories WHERE level = 3)
    )
  )
)
ON CONFLICT(key) DO UPDATE SET value = excluded.value;
