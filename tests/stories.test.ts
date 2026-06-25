import { describe, expect, it } from "vitest";
import { ALL_STORIES } from "../src/all-stories";
import { checkStoryCoherence } from "../src/story-qa/coherence";
import { checkGoldenFacts } from "../src/story-qa/golden-facts";
import { checkStorySafety } from "../src/story-qa/safety";
import { storiesWithIssues, validateAllStories } from "../src/story-qa/index";

describe("cuentos: coherencia pregunta ↔ texto", () => {
  it("cada respuesta correcta está respaldada por el relato", () => {
    const failures: string[] = [];

    for (const story of ALL_STORIES) {
      const issues = checkStoryCoherence(story);
      for (const issue of issues) {
        failures.push(
          `${story.title} (nivel ${story.level ?? 1}), pregunta ${issue.questionIndex}: «${issue.correctAnswer}» — ${issue.reason}`
        );
      }
    }

    expect(failures, failures.join("\n")).toEqual([]);
  });
});

describe("cuentos: golden facts", () => {
  it("fechas, cifras y respuestas clave figuran en el texto", () => {
    const failures: string[] = [];

    for (const story of ALL_STORIES) {
      const issues = checkGoldenFacts(story);
      for (const issue of issues) {
        failures.push(
          `${story.title} (nivel ${story.level ?? 1}): «${issue.fact}» — ${issue.reason}`
        );
      }
    }

    expect(failures, failures.join("\n")).toEqual([]);
  });
});

describe("cuentos: contenido seguro", () => {
  it("sin lenguaje sexual, grooming ni violencia gráfica", () => {
    const failures: string[] = [];

    for (const story of ALL_STORIES) {
      const issues = checkStorySafety(story);
      for (const issue of issues) {
        failures.push(
          `${story.title} (nivel ${story.level ?? 1}) [${issue.category}]: ${issue.rule} — «…${issue.excerpt}…»`
        );
      }
    }

    expect(failures, failures.join("\n")).toEqual([]);
  });
});

describe("resumen de validación", () => {
  it("270 cuentos sin problemas", () => {
    expect(ALL_STORIES).toHaveLength(270);
    const bad = storiesWithIssues(validateAllStories());
    expect(bad.map((b) => b.key)).toEqual([]);
  });
});
