export interface QuestionInput {
  question: string;
  options: { a: string; b: string; c: string; d: string };
  correct: "a" | "b" | "c" | "d";
}

export interface StoryInput {
  title: string;
  paragraphs: [string, string, string];
  questions: [QuestionInput, QuestionInput, QuestionInput];
  /** Nivel de lectura (1, 2 o 3). Por defecto 1. */
  level?: 1 | 2 | 3;
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
  /** Cuenta Google (tabla users). */
  accountId: string;
  email: string;
  isAdmin: boolean;
  /** Sesión OAuth sin cuenta en DB todavía. */
  pending?: boolean;
  googleId?: string;
  /** Lector activo en esta sesión. */
  readerId?: string;
  displayName?: string | null;
  level?: ReaderLevel;
}

export type ReaderLevel = 1 | 2 | 3;

export interface ReaderPublic {
  id: string;
  accountId: string;
  displayName: string;
  level: ReaderLevel;
  createdAt: string;
  points: number;
  storiesRead: number;
  totalStories: number;
  unreadStories: number;
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
