import type { Env, RankingEntry, SessionUser, StoryPublic } from "./types";
import { buildVocabularyForStory } from "./vocabulary";
import { RANKING_SQLITE_OFFSET } from "./ranking-day";

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

export async function setDisplayName(
  db: D1Database,
  userId: string,
  displayName: string
): Promise<void> {
  const trimmed = displayName.trim().slice(0, 40);
  if (trimmed.length < 2) throw new Error("El nombre debe tener al menos 2 caracteres");
  await db
    .prepare("UPDATE users SET display_name = ? WHERE id = ?")
    .bind(trimmed, userId)
    .run();
}

export async function getUserStats(
  db: D1Database,
  userId: string
): Promise<{ points: number; storiesRead: number }> {
  const row = await db
    .prepare(
      "SELECT COALESCE(SUM(points), 0) as points, COUNT(*) as stories_read FROM story_attempts WHERE user_id = ?"
    )
    .bind(userId)
    .first<{ points: number; stories_read: number }>();
  return { points: row?.points ?? 0, storiesRead: row?.stories_read ?? 0 };
}

export async function getRanking(db: D1Database): Promise<RankingEntry[]> {
  const rows = await db
    .prepare(
      `SELECT
         u.display_name,
         COALESCE(SUM(a.points), 0) as points_total,
         COALESCE(SUM(
           CASE WHEN date(a.completed_at, ?) = date('now', ?) THEN a.points ELSE 0 END
         ), 0) as points_today
       FROM users u
       LEFT JOIN story_attempts a ON a.user_id = u.id
       WHERE u.display_name IS NOT NULL
       GROUP BY u.id
       ORDER BY points_total DESC, points_today DESC, u.display_name ASC`
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
} | null> {
  return db
    .prepare("SELECT id, title, paragraph1, paragraph2, paragraph3 FROM stories WHERE id = ?")
    .bind(storyId)
    .first();
}

async function fetchStoryQuestions(db: D1Database, storyId: number) {
  return db
    .prepare(
      "SELECT id, question_text, option_a, option_b, option_c, option_d FROM questions WHERE story_id = ? ORDER BY id"
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

export async function getStoryById(db: D1Database, storyId: number): Promise<StoryPublic | null> {
  const story = await fetchStoryRow(db, storyId);
  if (!story) return null;
  const questions = await fetchStoryQuestions(db, storyId);
  return assembleStory(story, questions.results ?? []);
}

export async function getRandomStory(db: D1Database): Promise<StoryPublic | null> {
  const story = await db
    .prepare("SELECT id, title, paragraph1, paragraph2, paragraph3 FROM stories ORDER BY RANDOM() LIMIT 1")
    .first<{
      id: number;
      title: string;
      paragraph1: string;
      paragraph2: string;
      paragraph3: string;
    }>();
  if (!story) return null;

  const questions = await fetchStoryQuestions(db, story.id);
  return assembleStory(story, questions.results ?? []);
}

export async function submitAnswers(
  db: D1Database,
  userId: string,
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
    .prepare("SELECT id, correct_option FROM questions WHERE story_id = ? ORDER BY id")
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
    .prepare("SELECT points FROM story_attempts WHERE user_id = ? AND story_id = ?")
    .bind(userId, storyId)
    .first<{ points: number }>();

  const previousPoints = existing?.points ?? 0;
  const keptBestScore = existing != null && points <= previousPoints;
  const pointsRecorded = keptBestScore ? previousPoints : points;
  const pointsAdded = keptBestScore ? 0 : points - previousPoints;

  if (!existing) {
    await db
      .prepare(
        `INSERT INTO story_attempts (user_id, story_id, points, read_point, correct_count, bonus_point, completed_at)
         VALUES (?, ?, ?, ?, ?, ?, datetime('now'))`
      )
      .bind(userId, storyId, points, readPoint, correctCount, bonusPoint)
      .run();
  } else if (!keptBestScore) {
    await db
      .prepare(
        `UPDATE story_attempts
         SET points = ?, read_point = ?, correct_count = ?, bonus_point = ?, completed_at = datetime('now')
         WHERE user_id = ? AND story_id = ?`
      )
      .bind(points, readPoint, correctCount, bonusPoint, userId, storyId)
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
  const users = await db.prepare("SELECT COUNT(*) as c FROM users").first<{ c: number }>();
  const stories = await db.prepare("SELECT COUNT(*) as c FROM stories").first<{ c: number }>();
  const attempts = await db.prepare("SELECT COUNT(*) as c FROM story_attempts").first<{ c: number }>();
  const totalPoints = await db
    .prepare("SELECT COALESCE(SUM(points), 0) as p FROM story_attempts")
    .first<{ p: number }>();

  const recent = await db
    .prepare(
      `SELECT u.display_name, u.email, a.points, s.title, a.completed_at
       FROM story_attempts a
       JOIN users u ON u.id = a.user_id
       JOIN stories s ON s.id = a.story_id
       ORDER BY a.completed_at DESC LIMIT 20`
    )
    .all();

  return {
    totalUsers: users?.c ?? 0,
    totalStories: stories?.c ?? 0,
    totalAttempts: attempts?.c ?? 0,
    totalPoints: totalPoints?.p ?? 0,
    recentActivity: recent.results ?? [],
  };
}

export async function verifyAdmin(db: D1Database, user: SessionUser, password: string, adminPassword: string): Promise<boolean> {
  if (password !== adminPassword) return false;
  await db.prepare("UPDATE users SET is_admin = 1 WHERE id = ?").bind(user.id).run();
  return true;
}

export interface AdminUserRow {
  id: string;
  email: string;
  displayName: string | null;
  isAdmin: boolean;
  pointsTotal: number;
  storiesRead: number;
}

export async function listAdminUsers(db: D1Database): Promise<AdminUserRow[]> {
  const rows = await db
    .prepare(
      `SELECT
         u.id,
         u.email,
         u.display_name,
         u.is_admin,
         COALESCE(SUM(a.points), 0) as points_total,
         COUNT(a.story_id) as stories_read
       FROM users u
       LEFT JOIN story_attempts a ON a.user_id = u.id
       GROUP BY u.id
       ORDER BY u.display_name COLLATE NOCASE ASC, u.email ASC`
    )
    .all<{
      id: string;
      email: string;
      display_name: string | null;
      is_admin: number;
      points_total: number;
      stories_read: number;
    }>();

  return (rows.results ?? []).map((row) => ({
    id: row.id,
    email: row.email,
    displayName: row.display_name,
    isAdmin: row.is_admin === 1,
    pointsTotal: row.points_total,
    storiesRead: row.stories_read,
  }));
}

export async function adminSetUserDisplayName(
  db: D1Database,
  userId: string,
  displayName: string
): Promise<string> {
  const exists = await db.prepare("SELECT id FROM users WHERE id = ?").bind(userId).first();
  if (!exists) throw new Error("Participante no encontrado");
  await setDisplayName(db, userId, displayName);
  return displayName.trim().slice(0, 40);
}

export async function adminDeleteUser(db: D1Database, userId: string): Promise<void> {
  const exists = await db.prepare("SELECT id FROM users WHERE id = ?").bind(userId).first();
  if (!exists) throw new Error("Participante no encontrado");
  await db.prepare("DELETE FROM story_attempts WHERE user_id = ?").bind(userId).run();
  await db.prepare("DELETE FROM users WHERE id = ?").bind(userId).run();
}
