import { writeFileSync } from "node:fs";
import { join } from "node:path";
import type { QuestionInput, StoryInput } from "../src/types";
import { STORIES } from "../src/stories-data-1";
import { STORIES_PART2 } from "../src/stories-data-2";
import { STORIES_PART3 } from "../src/stories-data-3";
import { STORIES_PART4 } from "../src/stories-data-4";
import { STORIES_PART5 } from "../src/stories-data-5";
import { STORIES_PART6 } from "../src/stories-data-6";
import { STORIES_PART7 } from "../src/stories-data-7";
import { STORIES_PART8 } from "../src/stories-data-8";
import { STORIES_PART9 } from "../src/stories-data-9";

const LETTERS = ["a", "b", "c", "d"] as const;
type Letter = (typeof LETTERS)[number];

const FILES: { path: string; exportName: string; stories: StoryInput[] }[] = [
  { path: "src/stories-data-1.ts", exportName: "STORIES", stories: STORIES },
  { path: "src/stories-data-2.ts", exportName: "STORIES_PART2", stories: STORIES_PART2 },
  { path: "src/stories-data-3.ts", exportName: "STORIES_PART3", stories: STORIES_PART3 },
  { path: "src/stories-data-4.ts", exportName: "STORIES_PART4", stories: STORIES_PART4 },
  { path: "src/stories-data-5.ts", exportName: "STORIES_PART5", stories: STORIES_PART5 },
  { path: "src/stories-data-6.ts", exportName: "STORIES_PART6", stories: STORIES_PART6 },
  { path: "src/stories-data-7.ts", exportName: "STORIES_PART7", stories: STORIES_PART7 },
  { path: "src/stories-data-8.ts", exportName: "STORIES_PART8", stories: STORIES_PART8 },
  { path: "src/stories-data-9.ts", exportName: "STORIES_PART9", stories: STORIES_PART9 },
];

function shuffle<T>(items: T[]): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

function balancedTargets(count: number): Letter[] {
  const base = Math.floor(count / LETTERS.length);
  const remainder = count % LETTERS.length;
  const targets: Letter[] = [];
  for (let i = 0; i < LETTERS.length; i++) {
    const n = base + (i < remainder ? 1 : 0);
    for (let j = 0; j < n; j++) targets.push(LETTERS[i]);
  }
  return shuffle(targets);
}

function shuffleQuestionToLetter(q: QuestionInput, target: Letter): QuestionInput {
  const correctText = q.options[q.correct];
  const wrongTexts = LETTERS.filter((k) => k !== q.correct).map((k) => q.options[k]);
  const shuffledWrong = shuffle(wrongTexts);

  const options = { a: "", b: "", c: "", d: "" };
  let wrongIndex = 0;
  for (const letter of LETTERS) {
    if (letter === target) options[letter] = correctText;
    else options[letter] = shuffledWrong[wrongIndex++]!;
  }

  return { ...q, options, correct: target };
}

function escapeTsString(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

function formatQuestion(q: QuestionInput): string {
  const { a, b, c, d } = q.options;
  return `      {
        question: "${escapeTsString(q.question)}",
        options: { a: "${escapeTsString(a)}", b: "${escapeTsString(b)}", c: "${escapeTsString(c)}", d: "${escapeTsString(d)}" },
        correct: "${q.correct}",
      }`;
}

function formatStory(story: StoryInput): string {
  const paragraphs = story.paragraphs
    .map((p) => `      "${escapeTsString(p)}",`)
    .join("\n");
  const questions = story.questions.map((q) => formatQuestion(q)).join(",\n");

  return `  {
    title: "${escapeTsString(story.title)}",
    paragraphs: [
${paragraphs}
    ],
    questions: [
${questions}
    ],
  }`;
}

function formatFile(exportName: string, stories: StoryInput[]): string {
  const body = stories.map((s) => formatStory(s)).join(",\n");
  return `import type { StoryInput } from "./types";

export const ${exportName}: StoryInput[] = [
${body}
];
`;
}

function countCorrect(stories: StoryInput[]): Record<Letter, number> {
  const counts: Record<Letter, number> = { a: 0, b: 0, c: 0, d: 0 };
  for (const story of stories) {
    for (const q of story.questions) counts[q.correct]++;
  }
  return counts;
}

const root = join(import.meta.dirname, "..");
const totalQuestions = FILES.reduce((n, f) => n + f.stories.length * 3, 0);
const targets = balancedTargets(totalQuestions);
let targetIndex = 0;
const counts: Record<Letter, number> = { a: 0, b: 0, c: 0, d: 0 };

for (const file of FILES) {
  const randomized = file.stories.map((story) => ({
    ...story,
    questions: story.questions.map((q) => {
      const target = targets[targetIndex++]!;
      return shuffleQuestionToLetter(q, target);
    }) as StoryInput["questions"],
  }));

  writeFileSync(join(root, file.path), formatFile(file.exportName, randomized), "utf8");

  const c = countCorrect(randomized);
  for (const letter of LETTERS) counts[letter] += c[letter];
}

console.log(`Randomized ${totalQuestions} questions across ${FILES.length} files.`);
console.log("Distribution:", counts);
