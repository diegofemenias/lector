-- Eliminar preguntas duplicadas (mismo cuento + mismo texto)
DELETE FROM questions
WHERE id NOT IN (
  SELECT MIN(id) FROM questions GROUP BY story_id, question_text
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_questions_story_text ON questions(story_id, question_text);
