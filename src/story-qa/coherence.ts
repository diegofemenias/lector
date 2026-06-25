import type { QuestionInput, StoryInput } from "../types";
import { extractDigitSequences, normalizeText, significantTokens, stripArticles } from "./normalize";
import { extractYearsFromCorpus, parseRomanNumeral, romanPresentInCorpus, yearPresentInCorpus } from "./spanish-years";

const SPANISH_NUMBERS: Record<string, string> = {
  cero: "0",
  dos: "2",
  tres: "3",
  cuatro: "4",
  cinco: "5",
  seis: "6",
  siete: "7",
  ocho: "8",
  nueve: "9",
  diez: "10",
  once: "11",
  doce: "12",
  trece: "13",
  catorce: "14",
  quince: "15",
  dieciseis: "16",
  diecisiete: "17",
  dieciocho: "18",
  diecinueve: "19",
  veinte: "20",
  treinta: "30",
  cuarenta: "40",
  cincuenta: "50",
  sesenta: "60",
  setenta: "70",
  ochenta: "80",
  noventa: "90",
  cien: "100",
  ciento: "100",
  doscientos: "200",
  doscientas: "200",
  trescientos: "300",
  cuatrocientos: "400",
  quinientos: "500",
  seiscientos: "600",
  setecientos: "700",
  ochocientos: "800",
  novecientos: "900",
  mil: "1000",
};

export interface CoherenceIssue {
  questionIndex: number;
  correctAnswer: string;
  reason: string;
}

function storyCorpus(story: StoryInput): string {
  return [story.title, ...story.paragraphs].join(" ");
}

function extractNumberWords(text: string): string[] {
  const norm = normalizeText(text);
  const found: string[] = [];
  for (const [word, digit] of Object.entries(SPANISH_NUMBERS)) {
    if (new RegExp(`\\b${word}\\b`).test(norm)) found.push(digit);
  }
  return found;
}

function numbersInText(answer: string, corpus: string): boolean {
  const answerDigits = new Set([
    ...extractDigitSequences(answer),
    ...extractNumberWords(answer),
  ]);
  if (answerDigits.size === 0) return true;

  const corpusDigits = new Set([
    ...extractDigitSequences(corpus),
    ...extractNumberWords(corpus),
  ]);

  for (const n of answerDigits) {
    if (!corpusDigits.has(n)) return false;
  }
  return true;
}

/** Quita prefijos típicos de opciones para comparar con el relato. */
function softenAnswer(answer: string): string {
  return answer
    .replace(/^(s[ií],?\s*|no,?\s*|solo\s+|en\s+|porque\s+|para\s+|us[oó]\s+|la\s+|los\s+|las\s+|c[oó]mo\s+)/i, "")
    .replace(/\s*°\s*c\b/gi, " grados celsius")
    .trim();
}

function tokenInCorpus(token: string, nCorpus: string): boolean {
  if (nCorpus.includes(token)) return true;
  if (token.length > 4 && token.endsWith("s") && nCorpus.includes(token.slice(0, -1))) return true;
  if (token.length > 4 && token.endsWith("es") && nCorpus.includes(token.slice(0, -2))) return true;
  for (const w of nCorpus.split(/\s+/)) {
    if (w.length < 4 || token.length < 4) continue;
    if (w.startsWith(token) || token.startsWith(w)) return true;
  }
  return false;
}

function conjunctPartsSupported(answer: string, corpus: string): boolean {
  const parts = softenAnswer(answer)
    .split(/\s+y\s+/)
    .map((p) => p.trim())
    .filter(Boolean);
  if (parts.length < 2) return false;
  return parts.every((part) => isAnswerSupportedByText(part, corpus));
}

function yearOnlyAnswer(answer: string, corpus: string): boolean {
  const m = normalizeText(answer).match(/^en\s+(\d{3,4})$/);
  if (!m) return false;
  return yearPresentInCorpus(m[1]!, corpus);
}

function centuryAnswer(answer: string, corpus: string): boolean {
  const m = normalizeText(answer).match(/^siglo\s+([ivxlcdm]+)$/);
  if (!m) return false;
  if (romanPresentInCorpus(m[1]!, corpus)) return true;
  const n = parseRomanNumeral(m[1]!);
  if (n == null) return false;
  if (normalizeText(corpus).includes(`siglo ${n}`) || normalizeText(corpus).includes(`siglo ${m[1]}`)) {
    return true;
  }
  for (const y of extractYearsFromCorpus(corpus)) {
    const century = Math.floor((parseInt(y, 10) - 1) / 100) + 1;
    if (century === n) return true;
  }
  return false;
}

function numberedPhotoAnswer(answer: string, corpus: string): boolean {
  const m = normalizeText(answer).match(/numero\s+(\d+)/);
  if (!m) return false;
  return normalizeText(corpus).includes(m[1]!);
}

/** ¿La opción correcta está respaldada por el texto del cuento? */
export function isAnswerSupportedByText(answer: string, corpus: string): boolean {
  if (yearOnlyAnswer(answer, corpus)) return true;
  if (centuryAnswer(answer, corpus)) return true;
  if (numberedPhotoAnswer(answer, corpus)) return true;
  if (normalizeText(answer).includes(" y ") && conjunctPartsSupported(answer, corpus)) return true;

  const softened = softenAnswer(answer);
  const nAnswer = normalizeText(softened);
  const nCorpus = normalizeText(corpus);
  if (!nAnswer) return true;

  if (nCorpus.includes(nAnswer)) return true;

  const stripped = normalizeText(stripArticles(softened));
  if (stripped.length >= 3 && nCorpus.includes(stripped)) return true;

  if (!numbersInText(answer, corpus)) return false;

  const tokens = significantTokens(softened);
  if (tokens.length === 0) return true;

  const matched = tokens.filter((t) => tokenInCorpus(t, nCorpus));
  const ratio = matched.length / tokens.length;

  if (ratio >= 0.65) return true;

  const strong = matched.filter((t) => t.length >= 4);
  if (strong.length >= 1 && ratio >= 0.4) return true;

  if (tokens.length === 1 && matched.length === 1) return true;

  if (tokens.length === 2 && matched.length === 1) {
    const hit = matched[0]!;
    if (hit.length >= 4) return true;
  }

  return false;
}

export function checkQuestionCoherence(
  question: QuestionInput,
  questionIndex: number,
  corpus: string
): CoherenceIssue | null {
  const correctAnswer = question.options[question.correct];
  if (!isAnswerSupportedByText(correctAnswer, corpus)) {
    return {
      questionIndex,
      correctAnswer,
      reason: "La respuesta correcta no aparece ni se deduce claramente del texto del cuento",
    };
  }
  return null;
}

export function checkStoryCoherence(story: StoryInput): CoherenceIssue[] {
  const corpus = storyCorpus(story);
  const issues: CoherenceIssue[] = [];

  story.questions.forEach((q, i) => {
    const issue = checkQuestionCoherence(q, i + 1, corpus);
    if (issue) issues.push(issue);
  });

  return issues;
}
