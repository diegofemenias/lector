import { RANKING_SQLITE_OFFSET, todayDateInRankingTimezone } from "./ranking-day";

/** Expresión SQL: fecha de hoy en la zona del ranking. */
export const RANKING_TODAY_SQL = `date('now', '${RANKING_SQLITE_OFFSET}')`;

/** Suma puntos precalculados al lector tras un intento con puntos nuevos. */
export async function applyReaderPointsDelta(
  db: D1Database,
  readerId: string,
  pointsAdded: number
): Promise<void> {
  if (pointsAdded <= 0) return;

  const today = todayDateInRankingTimezone();
  await db
    .prepare(
      `UPDATE readers SET
         points_total = points_total + ?,
         points_today = CASE WHEN points_today_date = ? THEN points_today + ? ELSE ? END,
         points_today_date = ?
       WHERE id = ?`
    )
    .bind(pointsAdded, today, pointsAdded, pointsAdded, today, readerId)
    .run();
}
