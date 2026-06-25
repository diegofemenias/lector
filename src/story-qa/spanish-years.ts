import { normalizeText } from "./normalize";

const HUNDREDS: Record<string, number> = {
  cien: 100,
  ciento: 100,
  doscientos: 200,
  doscientas: 200,
  trescientos: 300,
  trescientas: 300,
  cuatrocientos: 400,
  cuatrocientas: 400,
  quinientos: 500,
  quinientas: 500,
  seiscientos: 600,
  seiscientas: 600,
  setecientos: 700,
  setecientas: 700,
  ochocientos: 800,
  ochocientas: 800,
  novecientos: 900,
  novecientas: 900,
};

const TENS: Record<string, number> = {
  diez: 10,
  once: 11,
  doce: 12,
  trece: 13,
  catorce: 14,
  quince: 15,
  dieciseis: 16,
  diecisiete: 17,
  dieciocho: 18,
  diecinueve: 19,
  veinte: 20,
  treinta: 30,
  cuarenta: 40,
  cincuenta: 50,
  sesenta: 60,
  setenta: 70,
  ochenta: 80,
  noventa: 90,
};

const ONES: Record<string, number> = {
  uno: 1,
  dos: 2,
  tres: 3,
  cuatro: 4,
  cinco: 5,
  seis: 6,
  siete: 7,
  ocho: 8,
  nueve: 9,
};

const NUMBER_WORDS = new Set([
  ...Object.keys(HUNDREDS),
  ...Object.keys(TENS),
  ...Object.keys(ONES),
  "y",
]);

function parseSpanishNumberWords(words: string[]): number {
  let total = 0;
  for (const w of words) {
    if (w === "y") continue;
    if (HUNDREDS[w] != null) total += HUNDREDS[w]!;
    else if (TENS[w] != null) total += TENS[w]!;
    else if (ONES[w] != null) total += ONES[w]!;
  }
  return total;
}

function collectFollowingNumberWords(text: string): string[] {
  const words = text.trim().split(/\s+/);
  const collected: string[] = [];
  for (const w of words) {
    if (w === "y" || NUMBER_WORDS.has(w)) collected.push(w);
    else break;
  }
  return collected;
}

/** Extrae años (1400–2099) escritos con cifras o con «mil …» / «dos mil …». */
export function extractYearsFromCorpus(corpus: string): Set<string> {
  const years = new Set<string>();
  const norm = normalizeText(corpus);

  for (const m of norm.matchAll(/\b(1[4-9]\d{2}|20\d{2})\b/g)) {
    years.add(m[1]!);
  }

  for (const m of norm.matchAll(/\bdos mil\b/g)) {
    const words = collectFollowingNumberWords(norm.slice(m.index! + 7));
    const n = 2000 + parseSpanishNumberWords(words);
    if (n >= 2000 && n <= 2099) years.add(String(n));
    else if (words.length === 0) years.add("2000");
  }

  for (const m of norm.matchAll(/\bmil\b/g)) {
    const before = norm.slice(Math.max(0, m.index! - 4), m.index!);
    if (before.endsWith("dos ")) continue;
    const words = collectFollowingNumberWords(norm.slice(m.index! + 3));
    const n = 1000 + parseSpanishNumberWords(words);
    if (n >= 1000 && n <= 1999) years.add(String(n));
  }

  return years;
}

export function yearPresentInCorpus(year: string, corpus: string): boolean {
  return extractYearsFromCorpus(corpus).has(year);
}

const ROMAN_VALUES: Record<string, number> = {
  i: 1,
  v: 5,
  x: 10,
  l: 50,
  c: 100,
  d: 500,
  m: 1000,
};

export function romanPresentInCorpus(roman: string, corpus: string): boolean {
  const r = normalizeText(roman);
  const norm = normalizeText(corpus);
  if (norm.includes(r)) return true;
  return norm.includes(r.replace(/\s+/g, ""));
}

export function parseRomanNumeral(roman: string): number | null {
  const s = normalizeText(roman).replace(/\s+/g, "");
  if (!/^[ivxlcdm]+$/.test(s)) return null;
  let total = 0;
  let prev = 0;
  for (let i = s.length - 1; i >= 0; i--) {
    const val = ROMAN_VALUES[s[i]!] ?? 0;
    if (val < prev) total -= val;
    else total += val;
    prev = val;
  }
  return total || null;
}
