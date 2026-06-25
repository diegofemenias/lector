/**
 * Merge WORD_DEFINITIONS with generated chunk JSON files.
 * Usage: npx tsx scripts/merge-definitions.ts
 */
import { readFileSync, writeFileSync, readdirSync, existsSync } from "fs";
import { join } from "path";
import { WORD_DEFINITIONS } from "../src/vocabulary/definitions.ts";

const CHUNKS_DIR = join(import.meta.dirname, "def-chunks");
const OUT_PATH = join(import.meta.dirname, "../src/vocabulary/definitions.ts");

const merged: Record<string, string> = { ...WORD_DEFINITIONS };

const chunkFiles = readdirSync(CHUNKS_DIR)
  .filter((f) => f.match(/^chunk-\d+\.json$/))
  .sort();

for (const file of chunkFiles) {
  const data = JSON.parse(readFileSync(join(CHUNKS_DIR, file), "utf8")) as Record<
    string,
    string
  >;
  for (const [k, v] of Object.entries(data)) {
    merged[k.toLowerCase()] = v;
  }
  console.log(`Merged ${file}: ${Object.keys(data).length} entries`);
}

const sorted = Object.keys(merged).sort((a, b) => a.localeCompare(b, "es"));
const lines = sorted.map(
  (k) => `  ${JSON.stringify(k)}: ${JSON.stringify(merged[k])},`
);

const content = `/** Definiciones cortas en español neutro latinoamericano para niños ~9 años. */
export const WORD_DEFINITIONS: Record<string, string> = {
${lines.join("\n")}
};

export function getDefinition(word: string): string | undefined {
  const key = word.toLowerCase().replace(/[^a-záéíóúüñ-]/g, "");
  return WORD_DEFINITIONS[key];
}
`;

writeFileSync(OUT_PATH, content, "utf8");
console.log(`\nWrote ${sorted.length} definitions to ${OUT_PATH}`);
