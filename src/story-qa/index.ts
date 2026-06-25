import type { StoryInput } from "../types";
import { ALL_STORIES, storyKey } from "../all-stories";
import { checkStoryCoherence, type CoherenceIssue } from "./coherence";
import { checkGoldenFacts, type GoldenFactsIssue } from "./golden-facts";
import { checkStorySafety, type SafetyIssue } from "./safety";

export interface StoryValidationResult {
  key: string;
  coherence: CoherenceIssue[];
  goldenFacts: GoldenFactsIssue[];
  safety: SafetyIssue[];
}

export function validateStory(story: StoryInput): StoryValidationResult {
  return {
    key: storyKey(story),
    coherence: checkStoryCoherence(story),
    goldenFacts: checkGoldenFacts(story),
    safety: checkStorySafety(story),
  };
}

export function validateAllStories(stories: StoryInput[] = ALL_STORIES): StoryValidationResult[] {
  return stories.map(validateStory);
}

export function storiesWithIssues(results: StoryValidationResult[]): StoryValidationResult[] {
  return results.filter(
    (r) => r.coherence.length > 0 || r.goldenFacts.length > 0 || r.safety.length > 0
  );
}

export { ALL_STORIES, storyKey };
