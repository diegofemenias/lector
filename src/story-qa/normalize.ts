const STOPWORDS = new Set([
  "el",
  "la",
  "los",
  "las",
  "un",
  "una",
  "unos",
  "unas",
  "de",
  "del",
  "al",
  "en",
  "y",
  "o",
  "que",
  "por",
  "para",
  "con",
  "sin",
  "su",
  "sus",
  "es",
  "son",
  "fue",
  "era",
  "como",
  "más",
  "menos",
  "muy",
  "hay",
  "fueron",
  "ser",
  "the",
]);

/** Minúsculas, sin tildes ni puntuación. */
export function normalizeText(raw: string): string {
  return raw
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function significantTokens(text: string): string[] {
  return normalizeText(text)
    .split(" ")
    .filter((t) => t.length >= 3 && !STOPWORDS.has(t));
}

export function stripArticles(text: string): string {
  return text.replace(/^(el|la|los|las|un|una|unos|unas)\s+/, "");
}

export function extractDigitSequences(text: string): string[] {
  return [...normalizeText(text).matchAll(/\d+/g)].map((m) => m[0]);
}
