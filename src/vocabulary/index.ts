import { getDefinition } from "./definitions";
import { GLOBAL_PROPER_NOUNS } from "./proper-nouns";
import { countSpanishSyllables, isComplexWord } from "./syllables";

const WORD_RE = /[a-záéíóúüñA-ZÁÉÍÓÚÜÑ]+(?:['-][a-záéíóúüñA-ZÁÉÍÓÚÜÑ]+)*/gu;

function isProperNoun(word: string, text: string, index: number): boolean {
  const lower = word.toLowerCase();
  if (GLOBAL_PROPER_NOUNS.has(lower)) return true;

  // Mayúscula en medio de oración → probable nombre propio
  if (/^[A-ZÁÉÍÓÚÑ]/.test(word) && index > 0) {
    const before = text.slice(Math.max(0, index - 3), index);
    if (/[.!?…]\s*$/.test(before) || index === 0) {
      return false;
    }
    return true;
  }
  return false;
}

export function extractVocabularyFromTexts(
  texts: string[]
): Record<string, string> {
  const terms: Record<string, string> = {};

  for (const text of texts) {
    for (const match of text.matchAll(WORD_RE)) {
      const word = match[0];
      const index = match.index ?? 0;
      if (isProperNoun(word, text, index)) continue;
      if (!isComplexWord(word)) continue;

      const key = word.toLowerCase();
      if (terms[key]) continue;

      const definition = getDefinition(key);
      if (definition) {
        terms[key] = definition;
      } else {
        terms[key] = `Palabra con ${countSpanishSyllables(word)} sílabas. Preguntale a un adulto qué significa en esta oración.`;
      }
    }
  }

  return terms;
}

export function buildVocabularyForStory(
  _storyId: number,
  title: string,
  paragraphs: string[],
  questions: { question: string; options: Record<string, string> }[]
): Record<string, string> {
  const texts = [
    title,
    ...paragraphs,
    ...questions.flatMap((q) => [q.question, ...Object.values(q.options)]),
  ];

  return extractVocabularyFromTexts(texts);
}
