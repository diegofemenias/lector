import type { ReaderLevel, ReaderPublic } from "./types";

export const MAX_READERS_PER_ACCOUNT = 4;

const STORY_COUNTS_META = "story_counts_by_level";
const LEVELS: ReaderLevel[] = [1, 2, 3];

let storyCountByLevel: Map<ReaderLevel, number> | null = null;

export function invalidateStoryCountCache(): void {
  storyCountByLevel = null;
}

function countsFromJson(value: string): Map<ReaderLevel, number> | null {
  try {
    const data = JSON.parse(value) as Record<string, number>;
    return new Map(LEVELS.map((level) => [level, data[String(level)] ?? 0]));
  } catch {
    return null;
  }
}

function countsToJson(counts: Map<ReaderLevel, number>): string {
  return JSON.stringify(Object.fromEntries(LEVELS.map((level) => [String(level), counts.get(level) ?? 0])));
}

async function persistStoryCountsMeta(db: D1Database, counts: Map<ReaderLevel, number>): Promise<void> {
  await db
    .prepare(
      "INSERT INTO app_meta (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value"
    )
    .bind(STORY_COUNTS_META, countsToJson(counts))
    .run();
}

/** Recalcula conteos desde stories y los guarda en app_meta (solo tras sync de datos). */
export async function refreshStoryCountsMeta(db: D1Database): Promise<void> {
  const rows = await db
    .prepare("SELECT level, COUNT(*) as c FROM stories GROUP BY level")
    .all<{ level: number; c: number }>();

  const counts = new Map<ReaderLevel, number>(
    LEVELS.map((level) => {
      const row = (rows.results ?? []).find((r) => r.level === level);
      return [level, row?.c ?? 0];
    })
  );

  await persistStoryCountsMeta(db, counts);
  storyCountByLevel = counts;
}

async function loadStoryCounts(db: D1Database): Promise<Map<ReaderLevel, number>> {
  const meta = await db
    .prepare("SELECT value FROM app_meta WHERE key = ?")
    .bind(STORY_COUNTS_META)
    .first<{ value: string }>();

  if (meta?.value) {
    const counts = countsFromJson(meta.value);
    if (counts) return counts;
  }

  await refreshStoryCountsMeta(db);
  return storyCountByLevel ?? new Map(LEVELS.map((level) => [level, 0]));
}

export async function getStoryCountsByLevel(db: D1Database): Promise<Map<ReaderLevel, number>> {
  if (!storyCountByLevel) {
    storyCountByLevel = await loadStoryCounts(db);
  }
  return storyCountByLevel;
}

async function getStoryCountForLevel(db: D1Database, level: ReaderLevel): Promise<number> {
  const counts = await getStoryCountsByLevel(db);
  return counts.get(level) ?? 0;
}

function normalizeName(name: string): string {
  return name.trim().slice(0, 40);
}

export async function countReadersForAccount(db: D1Database, accountId: string): Promise<number> {
  const row = await db
    .prepare("SELECT COUNT(*) as c FROM readers WHERE account_id = ?")
    .bind(accountId)
    .first<{ c: number }>();
  return row?.c ?? 0;
}

export async function isDisplayNameTaken(
  db: D1Database,
  displayName: string,
  excludeReaderId?: string
): Promise<boolean> {
  const name = normalizeName(displayName);
  const row = excludeReaderId
    ? await db
        .prepare(
          "SELECT id FROM readers WHERE display_name = ? COLLATE NOCASE AND id != ? LIMIT 1"
        )
        .bind(name, excludeReaderId)
        .first()
    : await db
        .prepare("SELECT id FROM readers WHERE display_name = ? COLLATE NOCASE LIMIT 1")
        .bind(name)
        .first();
  return row != null;
}

export async function listReadersForAccount(
  db: D1Database,
  accountId: string
): Promise<ReaderPublic[]> {
  const rows = await db
    .prepare(
      `SELECT r.id, r.account_id, r.display_name, r.level, r.created_at,
              COALESCE(SUM(a.points), 0) as points_total,
              COALESCE(SUM(CASE WHEN s.level = r.level THEN 1 ELSE 0 END), 0) as stories_read_level
       FROM readers r
       LEFT JOIN story_attempts a ON a.reader_id = r.id
       LEFT JOIN stories s ON s.id = a.story_id
       WHERE r.account_id = ?
       GROUP BY r.id
       ORDER BY r.created_at ASC`
    )
    .bind(accountId)
    .all<{
      id: string;
      account_id: string;
      display_name: string;
      level: number;
      created_at: string;
      points_total: number;
      stories_read_level: number;
    }>();

  const readers: ReaderPublic[] = [];
  for (const row of rows.results ?? []) {
    const level = row.level as ReaderLevel;
    const totalStories = await getStoryCountForLevel(db, level);
    const storiesRead = row.stories_read_level ?? 0;
    readers.push({
      id: row.id,
      accountId: row.account_id,
      displayName: row.display_name,
      level,
      createdAt: row.created_at,
      points: row.points_total ?? 0,
      storiesRead,
      totalStories,
      unreadStories: Math.max(0, totalStories - storiesRead),
    });
  }
  return readers;
}

export async function getReaderById(
  db: D1Database,
  readerId: string,
  accountId?: string
): Promise<ReaderPublic | null> {
  const row = accountId
    ? await db
        .prepare(
          `SELECT r.id, r.account_id, r.display_name, r.level, r.created_at,
                  COALESCE(SUM(a.points), 0) as points_total,
                  COALESCE(SUM(CASE WHEN s.level = r.level THEN 1 ELSE 0 END), 0) as stories_read_level
           FROM readers r
           LEFT JOIN story_attempts a ON a.reader_id = r.id
           LEFT JOIN stories s ON s.id = a.story_id
           WHERE r.id = ? AND r.account_id = ?
           GROUP BY r.id`
        )
        .bind(readerId, accountId)
        .first<{
          id: string;
          account_id: string;
          display_name: string;
          level: number;
          created_at: string;
          points_total: number;
          stories_read_level: number;
        }>()
    : await db
        .prepare(
          `SELECT r.id, r.account_id, r.display_name, r.level, r.created_at,
                  COALESCE(SUM(a.points), 0) as points_total,
                  COALESCE(SUM(CASE WHEN s.level = r.level THEN 1 ELSE 0 END), 0) as stories_read_level
           FROM readers r
           LEFT JOIN story_attempts a ON a.reader_id = r.id
           LEFT JOIN stories s ON s.id = a.story_id
           WHERE r.id = ?
           GROUP BY r.id`
        )
        .bind(readerId)
        .first<{
          id: string;
          account_id: string;
          display_name: string;
          level: number;
          created_at: string;
          points_total: number;
          stories_read_level: number;
        }>();

  if (!row) return null;

  const level = row.level as ReaderLevel;
  const totalStories = await getStoryCountForLevel(db, level);
  const storiesRead = row.stories_read_level ?? 0;

  return {
    id: row.id,
    accountId: row.account_id,
    displayName: row.display_name,
    level,
    createdAt: row.created_at,
    points: row.points_total ?? 0,
    storiesRead,
    totalStories,
    unreadStories: Math.max(0, totalStories - storiesRead),
  };
}

export async function createReader(
  db: D1Database,
  accountId: string,
  displayName: string,
  level: ReaderLevel
): Promise<ReaderPublic> {
  const name = normalizeName(displayName);
  if (name.length < 2) throw new Error("El nombre debe tener al menos 2 caracteres");
  if (level < 1 || level > 3) throw new Error("Nivel inválido");

  const count = await countReadersForAccount(db, accountId);
  if (count >= MAX_READERS_PER_ACCOUNT) {
    throw new Error(`Podés tener hasta ${MAX_READERS_PER_ACCOUNT} lectores por cuenta`);
  }

  if (await isDisplayNameTaken(db, name)) {
    throw new Error("Ese nombre ya lo usa otro lector. Elegí otro.");
  }

  const id = crypto.randomUUID();
  await db
    .prepare(
      "INSERT INTO readers (id, account_id, display_name, level) VALUES (?, ?, ?, ?)"
    )
    .bind(id, accountId, name, level)
    .run();

  const reader = await getReaderById(db, id, accountId);
  if (!reader) throw new Error("No se pudo crear el lector");
  return reader;
}

export async function setReaderLevel(
  db: D1Database,
  readerId: string,
  accountId: string,
  level: ReaderLevel
): Promise<ReaderPublic> {
  if (level < 1 || level > 3) throw new Error("Nivel inválido");

  const result = await db
    .prepare("UPDATE readers SET level = ? WHERE id = ? AND account_id = ?")
    .bind(level, readerId, accountId)
    .run();

  if ((result.meta.changes ?? 0) === 0) throw new Error("Lector no encontrado");

  const reader = await getReaderById(db, readerId, accountId);
  if (!reader) throw new Error("Lector no encontrado");
  return reader;
}

export async function adminSetReaderDisplayName(
  db: D1Database,
  readerId: string,
  displayName: string
): Promise<string> {
  const name = normalizeName(displayName);
  if (name.length < 2) throw new Error("El nombre debe tener al menos 2 caracteres");
  if (await isDisplayNameTaken(db, name, readerId)) {
    throw new Error("Ese nombre ya lo usa otro lector");
  }

  const result = await db
    .prepare("UPDATE readers SET display_name = ? WHERE id = ?")
    .bind(name, readerId)
    .run();
  if ((result.meta.changes ?? 0) === 0) throw new Error("Lector no encontrado");
  return name;
}

export async function adminSetReaderLevel(
  db: D1Database,
  readerId: string,
  level: ReaderLevel
): Promise<void> {
  if (level < 1 || level > 3) throw new Error("Nivel inválido");
  const result = await db
    .prepare("UPDATE readers SET level = ? WHERE id = ?")
    .bind(level, readerId)
    .run();
  if ((result.meta.changes ?? 0) === 0) throw new Error("Lector no encontrado");
}

export async function adminDeleteReader(db: D1Database, readerId: string): Promise<void> {
  const exists = await db.prepare("SELECT id FROM readers WHERE id = ?").bind(readerId).first();
  if (!exists) throw new Error("Lector no encontrado");
  await db.prepare("DELETE FROM story_attempts WHERE reader_id = ?").bind(readerId).run();
  await db.prepare("DELETE FROM readers WHERE id = ?").bind(readerId).run();
}

export interface AdminReaderRow {
  id: string;
  displayName: string;
  level: ReaderLevel;
  email: string;
  accountId: string;
  pointsTotal: number;
  storiesRead: number;
}

export async function listAdminReaders(db: D1Database): Promise<AdminReaderRow[]> {
  const rows = await db
    .prepare(
      `SELECT
         r.id,
         r.display_name,
         r.level,
         r.account_id,
         u.email,
         COALESCE(SUM(a.points), 0) as points_total,
         COUNT(a.story_id) as stories_read
       FROM readers r
       JOIN users u ON u.id = r.account_id
       LEFT JOIN story_attempts a ON a.reader_id = r.id
       GROUP BY r.id
       ORDER BY r.display_name COLLATE NOCASE ASC`
    )
    .all<{
      id: string;
      display_name: string;
      level: number;
      account_id: string;
      email: string;
      points_total: number;
      stories_read: number;
    }>();

  return (rows.results ?? []).map((row) => ({
    id: row.id,
    displayName: row.display_name,
    level: row.level as ReaderLevel,
    email: row.email,
    accountId: row.account_id,
    pointsTotal: row.points_total,
    storiesRead: row.stories_read,
  }));
}

export async function getReaderStatsForLevel(
  db: D1Database,
  readerId: string,
  level: ReaderLevel
): Promise<{ points: number; storiesRead: number; totalStories: number; unreadStories: number }> {
  const pointsRow = await db
    .prepare(
      `SELECT COALESCE(SUM(a.points), 0) as points, COUNT(a.story_id) as stories_read
       FROM story_attempts a
       JOIN stories s ON s.id = a.story_id
       WHERE a.reader_id = ? AND s.level = ?`
    )
    .bind(readerId, level)
    .first<{ points: number; stories_read: number }>();

  const totalStories = await getStoryCountForLevel(db, level);
  const storiesRead = pointsRow?.stories_read ?? 0;

  const allPointsRow = await db
    .prepare("SELECT COALESCE(SUM(points), 0) as p FROM story_attempts WHERE reader_id = ?")
    .bind(readerId)
    .first<{ p: number }>();

  return {
    points: allPointsRow?.p ?? 0,
    storiesRead,
    totalStories,
    unreadStories: Math.max(0, totalStories - storiesRead),
  };
}
