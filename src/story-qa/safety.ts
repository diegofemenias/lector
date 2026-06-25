import type { StoryInput } from "../types";
import { storyKey } from "../all-stories";
import { normalizeText } from "./normalize";

export type SafetyCategory =
  | "sexual"
  | "grooming"
  | "dangerous_advice"
  | "graphic_violence";

export interface SafetyIssue {
  category: SafetyCategory;
  excerpt: string;
  rule: string;
}

/** Términos sexuales o de doble sentido: no aptos para 6–12 años. */
const SEXUAL_TERMS = [
  "sexo oral",
  "porno",
  "pornografia",
  "desnud",
  "desnudo",
  "desnuda",
  "erotico",
  "erotica",
  "orgasmo",
  "pene",
  "vagina",
  "consolador",
  "prostit",
  "afrodisiac",
  "doble sentido",
  "coito",
  "masturb",
  "violacion",
  "abuso sexual",
  "pedofil",
];

/** Uso científico permitido (biología, reproducción animal). */
const SEXUAL_SCIENCE_ALLOWLIST = [
  "madurez sexual",
  "reproduccion sexual",
  "reproduccion asexual",
  "celulas sexuales",
  "organo sexual",
];

/** Violencia gráfica o morbosa (no hechos históricos sobrios). */
const GRAPHIC_VIOLENCE_TERMS = [
  "despedazar",
  "descuartiz",
  "mutil",
  "decapitar",
  "desangr",
  "sadismo",
  "carniceria",
  "tortur",
  "estrangular",
  "empalar",
  "masacre",
  "genocidio",
  "ejecutaron uno a uno",
  "bano de sangre",
];

/**
 * Patrones de conductas peligrosas o grooming.
 * Cubren invitaciones de extraños, secretos con adultos, etc.
 */
const DANGEROUS_PATTERNS: { pattern: RegExp; category: SafetyCategory; rule: string }[] = [
  {
    pattern:
      /\b(extra[nñ]o|desconocid[oa]|hombre|mujer|se[nñ]or|se[nñ]ora)\b[^.]{0,80}\b(invita|invit[oó]|llev|ofrec|acompa[nñ])\b[^.]{0,80}\b(casa|auto|coche|departamento|paseo|habitaci[oó]n)\b/gi,
    category: "grooming",
    rule: "Adulto o desconocido invita a un menor a casa o a un vehículo",
  },
  {
    pattern:
      /\b(sub[ií]|suban|entren|entra)\b[^.]{0,60}\b(auto|coche|camioneta|furgon|vehiculo)\b[^.]{0,40}\b(extra[nñ]o|desconocid|sin permiso)\b/gi,
    category: "grooming",
    rule: "Subir al auto de un desconocido",
  },
  {
    pattern:
      /\bno le (digas|cuentes|platiques) (a |)(mam[aá]|pap[aá]|padres|madre|padre)\b/gi,
    category: "grooming",
    rule: "Pedir guardar secreto frente a padres o madres",
  },
  {
    pattern: /\bes nuestro secreto\b/gi,
    category: "grooming",
    rule: "Secreto entre adulto y menor",
  },
  {
    pattern:
      /\b(paseo|dulces|caramelos|juguetes)\b[^.]{0,50}\b(si vienes|si me acompa[nñ]as|ven[ií] conmigo)\b/gi,
    category: "grooming",
    rule: "Enganche con premio para alejar al menor",
  },
  {
    pattern:
      /\b(tocar|tocame|toc[aá]ndote)\b[^.]{0,40}\b(partes íntimas|zonas privadas|sin ropa)\b/gi,
    category: "sexual",
    rule: "Contacto físico sexual inapropiado",
  },
  {
    pattern: /\bjueg(?:o|uemos) (?:al |)(?:doctor|adulto)\b/gi,
    category: "sexual",
    rule: "Juego sexual disfrazado",
  },
  {
    pattern:
      /\b(hazlo en casa|proba en casa|intenta en casa)\b[^.]{0,60}\b(fuego|veneno|navaja|cuchillo|arma|petardo|explosivo|cloro|gas|medicamento)\b/gi,
    category: "dangerous_advice",
    rule: "Animar a experimentar con algo peligroso",
  },
  {
    pattern:
      /\b(sin casco|sin cinturon|sin adulto)\b[^.]{0,50}\b(puedes|podes|debes|tenes que)\b/gi,
    category: "dangerous_advice",
    rule: "Recomendar conducta de riesgo sin supervisión",
  },
];

/** Contexto histórico/educativo: no marcar violencia documental sobria. */
const HISTORICAL_CONTEXT =
  /\b(guerra|batalla|revoluci[oó]n|ejercito|soldados|murió|muerte|muri[oó]|cay[oó] en combate|independencia|conquista|colonia|siglo|a[nñ]o[s]? \d{3,4})\b/i;

function excerptAround(text: string, index: number, len = 50): string {
  const start = Math.max(0, index - 20);
  const end = Math.min(text.length, index + len);
  return text.slice(start, end).replace(/\s+/g, " ").trim();
}

function isAllowlistedScience(norm: string, index: number, term: string): boolean {
  for (const phrase of SEXUAL_SCIENCE_ALLOWLIST) {
    const p = normalizeText(phrase);
    const idx = norm.indexOf(p);
    if (idx !== -1 && Math.abs(idx - index) <= 5) return true;
  }
  return false;
}

function scanTerms(
  text: string,
  terms: string[],
  category: SafetyCategory,
  rule: string
): SafetyIssue[] {
  const norm = normalizeText(text);
  const issues: SafetyIssue[] = [];

  for (const term of terms) {
    const t = normalizeText(term);
    let idx = norm.indexOf(t);
    while (idx !== -1) {
      if (category === "sexual" && isAllowlistedScience(norm, idx, term)) {
        idx = norm.indexOf(t, idx + 1);
        continue;
      }
      if (category === "graphic_violence" && HISTORICAL_CONTEXT.test(norm)) {
        idx = norm.indexOf(t, idx + 1);
        continue;
      }
      issues.push({
        category,
        excerpt: excerptAround(text, idx),
        rule: `${rule}: «${term}»`,
      });
      idx = norm.indexOf(t, idx + 1);
    }
  }
  return issues;
}

export function checkStorySafety(story: StoryInput): SafetyIssue[] {
  const fullText = [story.title, ...story.paragraphs, ...story.questions.flatMap((q) => [
    q.question,
    q.options.a,
    q.options.b,
    q.options.c,
    q.options.d,
  ])].join("\n");

  const issues: SafetyIssue[] = [
    ...scanTerms(fullText, SEXUAL_TERMS, "sexual", "Término sexual o inapropiado"),
    ...scanTerms(fullText, GRAPHIC_VIOLENCE_TERMS, "graphic_violence", "Violencia gráfica"),
  ];

  for (const { pattern, category, rule } of DANGEROUS_PATTERNS) {
    pattern.lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = pattern.exec(fullText)) !== null) {
      issues.push({
        category,
        excerpt: excerptAround(fullText, match.index, 80),
        rule,
      });
    }
  }

  return issues;
}

export function validateAllStoriesSafety(stories: StoryInput[]): Map<string, SafetyIssue[]> {
  const failures = new Map<string, SafetyIssue[]>();
  for (const story of stories) {
    const issues = checkStorySafety(story);
    if (issues.length) failures.set(storyKey(story), issues);
  }
  return failures;
}
