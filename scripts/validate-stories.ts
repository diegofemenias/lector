#!/usr/bin/env npx tsx
/**
 * Valida coherencia, golden facts y seguridad de todos los cuentos.
 * Uso: npm run validate:stories
 */
import { storiesWithIssues, validateAllStories } from "../src/story-qa/index.ts";

const results = validateAllStories();
const bad = storiesWithIssues(results);

if (bad.length === 0) {
  console.log(`✓ ${results.length} cuentos OK (coherencia, hechos y seguridad)`);
  process.exit(0);
}

console.error(`✗ ${bad.length} cuento(s) con problemas:\n`);

for (const r of bad) {
  console.error(`— ${r.key}`);
  for (const c of r.coherence) {
    console.error(`  [coherencia] P${c.questionIndex}: «${c.correctAnswer}» — ${c.reason}`);
  }
  for (const g of r.goldenFacts) {
    console.error(`  [hecho] «${g.fact}» — ${g.reason}`);
  }
  for (const s of r.safety) {
    console.error(`  [${s.category}] ${s.rule} — «${s.excerpt}»`);
  }
  console.error("");
}

process.exit(1);
