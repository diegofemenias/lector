import type { StoryInput } from "../types";
import { storyKey } from "../all-stories";
import { extractDigitSequences, normalizeText } from "./normalize";
import { yearPresentInCorpus } from "./spanish-years";

/** Hechos explícitos que deben figurar en el texto (fechas, cifras, nombres propios). */
export interface GoldenFacts {
  /** Subcadenas normalizadas que deben aparecer en título + párrafos. */
  mustAppear: string[];
}

/**
 * Hechos derivados automáticamente de cada cuento.
 * Complementa reglas explícitas en GOLDEN_FACTS_OVERRIDES.
 */
export function deriveGoldenFacts(story: StoryInput): GoldenFacts {
  const mustAppear: string[] = [];

  for (const q of story.questions) {
    const correct = q.options[q.correct];
    const norm = normalizeText(correct);

    for (const num of extractDigitSequences(correct)) {
      if (num.length >= 4) mustAppear.push(num);
    }
  }

  return { mustAppear: [...new Set(mustAppear)] };
}

/**
 * Excepciones donde la respuesta correcta usa sinónimos o formulaciones
 * distintas al párrafo pero el hecho es correcto.
 */
export const GOLDEN_FACTS_OVERRIDES: Record<string, GoldenFacts> = {
  "Darwin en las Galápagos::2": {
    mustAppear: ["1835", "galapagos", "beagle"],
  },
  "Magallanes y el estrecho::2": {
    mustAppear: ["1519", "1520", "1522", "elcano"],
  },
};

export interface GoldenFactsIssue {
  fact: string;
  reason: string;
}

export function checkGoldenFacts(story: StoryInput): GoldenFactsIssue[] {
  const key = storyKey(story);
  const corpus = normalizeText([story.title, ...story.paragraphs].join(" "));
  const derived = deriveGoldenFacts(story);
  const explicit = GOLDEN_FACTS_OVERRIDES[key];
  const mustAppear = [...new Set([...derived.mustAppear, ...(explicit?.mustAppear ?? [])])];

  const issues: GoldenFactsIssue[] = [];

  for (const fact of mustAppear) {
    const norm = normalizeText(fact);
    if (!norm) continue;
    const isYear = /^\d{4}$/.test(fact);
    const found = isYear ? yearPresentInCorpus(fact, corpus) : corpus.includes(norm);
    if (!found) {
      issues.push({
        fact,
        reason: "Dato clave del cuento o de la respuesta correcta no figura en el texto",
      });
    }
  }

  return issues;
}
