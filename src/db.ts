import type { RankingEntry, ReaderLevel, StoryPublic } from "./types";
import { buildVocabularyForStory } from "./vocabulary";
import { RANKING_SQLITE_OFFSET } from "./ranking-day";
import { getReaderById } from "./readers";

export async function findUserByGoogleId(
  db: D1Database,
  googleId: string
): Promise<{ id: string; email: string; is_admin: number } | null> {
  return db
    .prepare("SELECT id, email, is_admin FROM users WHERE google_id = ?")
    .bind(googleId)
    .first();
}

export async function findOrCreateUser(
  db: D1Database,
  googleId: string,
  email: string
): Promise<string> {
  const existing = await db
    .prepare("SELECT id FROM users WHERE google_id = ? OR email = ?")
    .bind(googleId, email)
    .first<{ id: string }>();
  if (existing) return existing.id;

  const id = crypto.randomUUID();
  await db
    .prepare("INSERT INTO users (id, email, google_id) VALUES (?, ?, ?)")
    .bind(id, email, googleId)
    .run();
  return id;
}

export async function getRanking(db: D1Database): Promise<RankingEntry[]> {
  const rows = await db
    .prepare(
      `SELECT
         r.display_name,
         COALESCE(SUM(a.points), 0) as points_total,
         COALESCE(SUM(
           CASE WHEN date(a.completed_at, ?) = date('now', ?) THEN a.points ELSE 0 END
         ), 0) as points_today
       FROM readers r
       LEFT JOIN story_attempts a ON a.reader_id = r.id
       GROUP BY r.id
       ORDER BY points_total DESC, points_today DESC, r.display_name ASC`
    )
    .bind(RANKING_SQLITE_OFFSET, RANKING_SQLITE_OFFSET)
    .all<{ display_name: string; points_total: number; points_today: number }>();

  return (rows.results ?? []).map((row, i) => ({
    displayName: row.display_name,
    pointsToday: row.points_today,
    pointsTotal: row.points_total,
    rank: i + 1,
  }));
}

async function fetchStoryRow(
  db: D1Database,
  storyId: number
): Promise<{
  id: number;
  title: string;
  paragraph1: string;
  paragraph2: string;
  paragraph3: string;
  level: number;
} | null> {
  return db
    .prepare(
      "SELECT id, title, paragraph1, paragraph2, paragraph3, level FROM stories WHERE id = ?"
    )
    .bind(storyId)
    .first();
}

async function fetchStoryQuestions(db: D1Database, storyId: number) {
  return db
    .prepare(
      "SELECT id, question_text, option_a, option_b, option_c, option_d FROM questions WHERE story_id = ? ORDER BY id LIMIT 3"
    )
    .bind(storyId)
    .all<{
      id: number;
      question_text: string;
      option_a: string;
      option_b: string;
      option_c: string;
      option_d: string;
    }>();
}

function assembleStory(
  story: {
    id: number;
    title: string;
    paragraph1: string;
    paragraph2: string;
    paragraph3: string;
  },
  questions: {
    id: number;
    question_text: string;
    option_a: string;
    option_b: string;
    option_c: string;
    option_d: string;
  }[]
): StoryPublic {
  const paragraphs = [story.paragraph1, story.paragraph2, story.paragraph3];
  const questionList = questions.map((q) => ({
    id: q.id,
    question: q.question_text,
    options: { a: q.option_a, b: q.option_b, c: q.option_c, d: q.option_d },
  }));

  const vocabulary = buildVocabularyForStory(story.id, story.title, paragraphs, questionList);

  return {
    id: story.id,
    title: story.title,
    paragraphs,
    questions: questionList,
    vocabulary,
  };
}

export async function getStoryById(
  db: D1Database,
  storyId: number,
  level?: ReaderLevel
): Promise<StoryPublic | null> {
  const story = await fetchStoryRow(db, storyId);
  if (!story) return null;
  if (level != null && story.level !== level) return null;
  const questions = await fetchStoryQuestions(db, storyId);
  return assembleStory(story, questions.results ?? []);
}

export async function getRandomStory(
  db: D1Database,
  readerId: string,
  level: ReaderLevel
): Promise<{ story: StoryPublic; isRepeat: boolean; unreadRemaining: number } | null> {
  const totalRow = await db
    .prepare("SELECT COUNT(*) as c FROM stories WHERE level = ?")
    .bind(level)
    .first<{ c: number }>();
  const totalStories = totalRow?.c ?? 0;
  if (totalStories === 0) return null;

  const readRow = await db
    .prepare(
      `SELECT COUNT(*) as c FROM story_attempts a
       JOIN stories s ON s.id = a.story_id
       WHERE a.reader_id = ? AND s.level = ?`
    )
    .bind(readerId, level)
    .first<{ c: number }>();
  const readCount = readRow?.c ?? 0;
  const unreadCount = totalStories - readCount;

  let story = await db
    .prepare(
      `SELECT id, title, paragraph1, paragraph2, paragraph3 FROM stories
       WHERE level = ?
         AND id NOT IN (
           SELECT a.story_id FROM story_attempts a
           JOIN stories s ON s.id = a.story_id
           WHERE a.reader_id = ? AND s.level = ?
         )
       ORDER BY RANDOM() LIMIT 1`
    )
    .bind(level, readerId, level)
    .first<{
      id: number;
      title: string;
      paragraph1: string;
      paragraph2: string;
      paragraph3: string;
    }>();

  const isRepeat = story == null;

  if (!story) {
    story = await db
      .prepare(
        "SELECT id, title, paragraph1, paragraph2, paragraph3 FROM stories WHERE level = ? ORDER BY RANDOM() LIMIT 1"
      )
      .bind(level)
      .first<{
        id: number;
        title: string;
        paragraph1: string;
        paragraph2: string;
        paragraph3: string;
      }>();
  }

  if (!story) return null;

  const questions = await fetchStoryQuestions(db, story.id);

  return {
    story: assembleStory(story, questions.results ?? []),
    isRepeat,
    unreadRemaining: isRepeat ? 0 : unreadCount,
  };
}

export async function submitAnswers(
  db: D1Database,
  readerId: string,
  storyId: number,
  answers: Record<number, string>
): Promise<{
  points: number;
  pointsRecorded: number;
  pointsAdded: number;
  keptBestScore: boolean;
  correctCount: number;
  totalQuestions: number;
  breakdown: { read: number; correct: number; bonus: number };
}> {
  const questions = await db
    .prepare("SELECT id, correct_option FROM questions WHERE story_id = ? ORDER BY id LIMIT 3")
    .bind(storyId)
    .all<{ id: number; correct_option: string }>();

  const qs = questions.results ?? [];
  if (qs.length !== 3) throw new Error("Cuento inválido");

  let correctCount = 0;
  for (const q of qs) {
    const ans = answers[q.id]?.toLowerCase();
    if (ans === q.correct_option) correctCount++;
  }

  const readPoint = 1;
  const correctPoints = correctCount;
  const bonusPoint = correctCount === qs.length ? 1 : 0;
  const points = readPoint + correctPoints + bonusPoint;

  const existing = await db
    .prepare("SELECT points FROM story_attempts WHERE reader_id = ? AND story_id = ?")
    .bind(readerId, storyId)
    .first<{ points: number }>();

  const previousPoints = existing?.points ?? 0;
  const keptBestScore = existing != null && points <= previousPoints;
  const pointsRecorded = keptBestScore ? previousPoints : points;
  const pointsAdded = keptBestScore ? 0 : points - previousPoints;

  if (!existing) {
    await db
      .prepare(
        `INSERT INTO story_attempts (reader_id, story_id, points, read_point, correct_count, bonus_point, completed_at)
         VALUES (?, ?, ?, ?, ?, ?, datetime('now'))`
      )
      .bind(readerId, storyId, points, readPoint, correctCount, bonusPoint)
      .run();
  } else if (!keptBestScore) {
    await db
      .prepare(
        `UPDATE story_attempts
         SET points = ?, read_point = ?, correct_count = ?, bonus_point = ?, completed_at = datetime('now')
         WHERE reader_id = ? AND story_id = ?`
      )
      .bind(points, readPoint, correctCount, bonusPoint, readerId, storyId)
      .run();
  }

  return {
    points,
    pointsRecorded,
    pointsAdded,
    keptBestScore,
    correctCount,
    totalQuestions: qs.length,
    breakdown: { read: readPoint, correct: correctPoints, bonus: bonusPoint },
  };
}

export async function getAdminStats(db: D1Database) {
  const readers = await db.prepare("SELECT COUNT(*) as c FROM readers").first<{ c: number }>();
  const stories = await db.prepare("SELECT COUNT(*) as c FROM stories").first<{ c: number }>();
  const attempts = await db.prepare("SELECT COUNT(*) as c FROM story_attempts").first<{ c: number }>();
  const totalPoints = await db
    .prepare("SELECT COALESCE(SUM(points), 0) as p FROM story_attempts")
    .first<{ p: number }>();

  const recent = await db
    .prepare(
      `SELECT r.display_name, u.email, a.points, s.title, a.completed_at
       FROM story_attempts a
       JOIN readers r ON r.id = a.reader_id
       JOIN users u ON u.id = r.account_id
       JOIN stories s ON s.id = a.story_id
       ORDER BY a.completed_at DESC LIMIT 20`
    )
    .all();

  return {
    totalReaders: readers?.c ?? 0,
    totalStories: stories?.c ?? 0,
    totalAttempts: attempts?.c ?? 0,
    totalPoints: totalPoints?.p ?? 0,
    recentActivity: recent.results ?? [],
  };
}

export async function verifyAdmin(
  db: D1Database,
  accountId: string,
  password: string,
  adminPassword: string
): Promise<boolean> {
  if (password !== adminPassword) return false;
  await db.prepare("UPDATE users SET is_admin = 1 WHERE id = ?").bind(accountId).run();
  return true;
}

/** Elimina cuenta sin lectores (registro huérfano tras OAuth). */
export async function deleteIncompleteAccount(db: D1Database, accountId: string): Promise<void> {
  const count = await db
    .prepare("SELECT COUNT(*) as c FROM readers WHERE account_id = ?")
    .bind(accountId)
    .first<{ c: number }>();
  if ((count?.c ?? 0) > 0) return;
  await db.prepare("DELETE FROM users WHERE id = ?").bind(accountId).run();
}

export async function getReaderStatsAfterSubmit(
  db: D1Database,
  readerId: string,
  accountId: string
): Promise<{
  points: number;
  storiesRead: number;
  totalStories: number;
  unreadStories: number;
  level: ReaderLevel;
}> {
  const reader = await getReaderById(db, readerId, accountId);
  if (!reader) throw new Error("Lector no encontrado");
  return {
    points: reader.points,
    storiesRead: reader.storiesRead,
    totalStories: reader.totalStories,
    unreadStories: reader.unreadStories,
    level: reader.level,
  };
}
