/** Zona horaria para calcular «puntos de hoy» (español latinoamericano). */
export const RANKING_TIMEZONE = "America/Argentina/Buenos_Aires";

/** Modificador SQLite equivalente a la zona anterior (UTC−3, sin horario de verano). */
export const RANKING_SQLITE_OFFSET = "-3 hours";

export function todayDateInRankingTimezone(): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: RANKING_TIMEZONE });
}
