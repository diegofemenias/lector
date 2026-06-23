export interface QuestionInput {
  question: string;
  options: { a: string; b: string; c: string; d: string };
  correct: "a" | "b" | "c" | "d";
}

export interface StoryInput {
  title: string;
  paragraphs: [string, string, string];
  questions: [QuestionInput, QuestionInput, QuestionInput];
}

export interface Env {
  DB: D1Database;
  ASSETS: Fetcher;
  GOOGLE_CLIENT_ID: string;
  GOOGLE_CLIENT_SECRET: string;
  SESSION_SECRET: string;
  ADMIN_PASSWORD: string;
}

export interface SessionUser {
  id: string;
  email: string;
  displayName: string | null;
  isAdmin: boolean;
}

export interface StoryPublic {
  id: number;
  title: string;
  paragraphs: string[];
  questions: {
    id: number;
    question: string;
    options: { a: string; b: string; c: string; d: string };
  }[];
  /** Palabra (minúsculas) → definición corta. Solo en cuentos con ayuda activa. */
  vocabulary?: Record<string, string>;
}

export interface RankingEntry {
  displayName: string;
  pointsToday: number;
  pointsTotal: number;
  rank: number;
}
