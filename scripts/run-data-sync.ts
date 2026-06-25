/**
 * Sincroniza cuentos y preguntas contra la D1 remota.
 * Uso: npx tsx scripts/run-data-sync.ts
 */
import { getPlatformProxy } from "wrangler";
import {
  DATA_SYNC_VERSION,
  reconcileQuestions,
  syncQuestionOptions,
  syncStories,
} from "../src/seed.ts";

const META_DATA_SYNC = "data_sync_version";

async function setMeta(db: D1Database, key: string, value: string): Promise<void> {
  await db
    .prepare(
      "INSERT INTO app_meta (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value"
    )
    .bind(key, value)
    .run();
}

const { env, dispose } = await getPlatformProxy<{ DB: D1Database }>({
  configPath: "./wrangler.sync.jsonc",
  remoteBindings: true,
});

const db = env.DB;

console.log("Borrando marca de sync obsoleta…");
await db.prepare("DELETE FROM app_meta WHERE key = ?").bind(META_DATA_SYNC).run();

console.log("Insertando cuentos…");
const added = await syncStories(db);
console.log(`Cuentos nuevos: ${added}`);

console.log("Reconciliando preguntas…");
const removed = await reconcileQuestions(db);
console.log(`Preguntas duplicadas eliminadas: ${removed}`);

console.log("Actualizando opciones…");
await syncQuestionOptions(db);

await setMeta(db, META_DATA_SYNC, String(DATA_SYNC_VERSION));

const counts = await db
  .prepare("SELECT level, COUNT(*) as c FROM stories GROUP BY level ORDER BY level")
  .all<{ level: number; c: number }>();

console.log("Cuentos por nivel:", counts.results);
await dispose();
