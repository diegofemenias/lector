import type { StoryInput } from "./types";
import { STORIES } from "./stories-data";
import { STORIES_L2 } from "./stories-data-l2";
import { STORIES_L3 } from "./stories-data-l3";

const ALL_STORIES: StoryInput[] = [...STORIES, ...STORIES_L2, ...STORIES_L3];

/** Incrementar al agregar cuentos o cambiar preguntas en producción. */
export const DATA_SYNC_VERSION = 4;

const META_DATA_SYNC = "data_sync_version";

let dataSyncReady = false;

/** Comprueba si hace falta sincronizar. 1 consulta D1 como máximo por isolate. */
export async function touchDataSync(db: D1Database): Promise<void> {
  if (dataSyncReady) return;

  const stored = await getMeta(db, META_DATA_SYNC);
  if (stored === String(DATA_SYNC_VERSION)) {
    dataSyncReady = true;
    return;
  }

  await syncStories(db);
  await reconcileQuestions(db);
  await syncQuestionOptions(db);
  await setMeta(db, META_DATA_SYNC, String(DATA_SYNC_VERSION));
  dataSyncReady = true;
}

/** @deprecated Usar touchDataSync */
export async function ensureQuestionOptionsSynced(db: D1Database): Promise<void> {
  await touchDataSync(db);
}

async function getMeta(db: D1Database, key: string): Promise<string | null> {
  const row = await db
    .prepare("SELECT value FROM app_meta WHERE key = ?")
    .bind(key)
    .first<{ value: string }>();
  return row?.value ?? null;
}

async function setMeta(db: D1Database, key: string, value: string): Promise<void> {
  await db
    .prepare(
      "INSERT INTO app_meta (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value"
    )
    .bind(key, value)
    .run();
}

/** Inserta solo cuentos cuyo título aún no existe. No modifica intentos ni ranking. */
export async function syncStories(db: D1Database): Promise<number> {
  let added = 0;

  for (const story of ALL_STORIES) {
    const level = story.level ?? 1;
    const existing = await db
      .prepare("SELECT id FROM stories WHERE title = ? AND level = ?")
      .bind(story.title, level)
      .first<{ id: number }>();

    let storyId = existing?.id;

    if (!storyId) {
      await db
        .prepare(
          "INSERT OR IGNORE INTO stories (title, paragraph1, paragraph2, paragraph3, level) VALUES (?, ?, ?, ?, ?)"
        )
        .bind(story.title, story.paragraphs[0], story.paragraphs[1], story.paragraphs[2], level)
        .run();

      const row = await db
        .prepare("SELECT id FROM stories WHERE title = ? AND level = ?")
        .bind(story.title, level)
        .first<{ id: number }>();
      storyId = row?.id;
      if (storyId) added++;
    }

    if (!storyId) continue;

    for (const q of story.questions) {
      await db
        .prepare(
          `INSERT OR IGNORE INTO questions (story_id, question_text, option_a, option_b, option_c, option_d, correct_option)
           VALUES (?, ?, ?, ?, ?, ?, ?)`
        )
        .bind(
          storyId,
          q.question,
          q.options.a,
          q.options.b,
          q.options.c,
          q.options.d,
          q.correct
        )
        .run();
    }
  }

  return added;
}

/** Deja exactamente 3 preguntas por cuento, alineadas con los datos fuente. */
export async function reconcileQuestions(db: D1Database): Promise<number> {
  const storyRows = await db
    .prepare("SELECT id, title, level FROM stories")
    .all<{ id: number; title: string; level: number }>();
  const storyIdByTitleLevel = new Map(
    storyRows.results.map((r) => [`${r.title}::${r.level}`, r.id])
  );

  let removed = 0;

  for (const story of ALL_STORIES) {
    const level = story.level ?? 1;
    const storyId = storyIdByTitleLevel.get(`${story.title}::${level}`);
    if (!storyId) continue;

    const texts = story.questions.map((q) => q.question);

    const extra = await db
      .prepare(
        `DELETE FROM questions
         WHERE story_id = ? AND question_text NOT IN (?, ?, ?)`
      )
      .bind(storyId, texts[0], texts[1], texts[2])
      .run();
    removed += extra.meta.changes ?? 0;

    for (const q of story.questions) {
      const rows = await db
        .prepare(
          `SELECT id FROM questions WHERE story_id = ? AND question_text = ? ORDER BY id`
        )
        .bind(storyId, q.question)
        .all<{ id: number }>();

      const ids = (rows.results ?? []).map((r) => r.id);

      if (ids.length === 0) {
        await db
          .prepare(
            `INSERT INTO questions (story_id, question_text, option_a, option_b, option_c, option_d, correct_option)
             VALUES (?, ?, ?, ?, ?, ?, ?)`
          )
          .bind(
            storyId,
            q.question,
            q.options.a,
            q.options.b,
            q.options.c,
            q.options.d,
            q.correct
          )
          .run();
        continue;
      }

      const keepId = ids[0]!;
      await db
        .prepare(
          `UPDATE questions
           SET option_a = ?, option_b = ?, option_c = ?, option_d = ?, correct_option = ?
           WHERE id = ?`
        )
        .bind(q.options.a, q.options.b, q.options.c, q.options.d, q.correct, keepId)
        .run();

      for (const dupId of ids.slice(1)) {
        await db.prepare("DELETE FROM questions WHERE id = ?").bind(dupId).run();
        removed++;
      }
    }
  }

  return removed;
}

/** Actualiza opciones y respuesta correcta de preguntas ya existentes (por título + texto). */
export async function syncQuestionOptions(db: D1Database): Promise<number> {
  const storyRows = await db
    .prepare("SELECT id, title, level FROM stories")
    .all<{ id: number; title: string; level: number }>();
  const storyIdByTitleLevel = new Map(
    storyRows.results.map((r) => [`${r.title}::${r.level}`, r.id])
  );

  const statements: D1PreparedStatement[] = [];

  for (const story of ALL_STORIES) {
    const level = story.level ?? 1;
    const storyId = storyIdByTitleLevel.get(`${story.title}::${level}`);
    if (!storyId) continue;

    for (const q of story.questions) {
      statements.push(
        db
          .prepare(
            `UPDATE questions
             SET option_a = ?, option_b = ?, option_c = ?, option_d = ?, correct_option = ?
             WHERE story_id = ? AND question_text = ?`
          )
          .bind(
            q.options.a,
            q.options.b,
            q.options.c,
            q.options.d,
            q.correct,
            storyId,
            q.question
          )
      );
    }
  }

  const batchSize = 100;
  for (let i = 0; i < statements.length; i += batchSize) {
    await db.batch(statements.slice(i, i + batchSize));
  }

  return statements.length;
}

/** @deprecated Usar syncStories */
export async function seedStoriesIfEmpty(db: D1Database): Promise<boolean> {
  const added = await syncStories(db);
  return added > 0;
}

export { STORIES, STORIES_L2, STORIES_L3, ALL_STORIES };
export type { StoryInput };
