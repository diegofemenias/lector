import type { StoryInput } from "./types";
import { STORIES } from "./stories-data";

export async function seedStoriesIfEmpty(db: D1Database): Promise<boolean> {
  const count = await db.prepare("SELECT COUNT(*) as c FROM stories").first<{ c: number }>();
  if ((count?.c ?? 0) > 0) return false;

  for (const story of STORIES) {
    const result = await db
      .prepare(
        "INSERT OR IGNORE INTO stories (title, paragraph1, paragraph2, paragraph3) VALUES (?, ?, ?, ?)"
      )
      .bind(story.title, story.paragraphs[0], story.paragraphs[1], story.paragraphs[2])
      .run();
    const storyId = result.meta.last_row_id;
    if (!storyId) continue;

    for (const q of story.questions) {
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
    }
  }
  return true;
}

export { STORIES };
export type { StoryInput };
