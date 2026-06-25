import { STORIES } from "./stories-data";
import { STORIES_L2 } from "./stories-data-l2";
import { STORIES_L3 } from "./stories-data-l3";
import type { StoryInput } from "./types";

export const ALL_STORIES: StoryInput[] = [...STORIES, ...STORIES_L2, ...STORIES_L3];

export function storyKey(story: StoryInput): string {
  return `${story.title}::${story.level ?? 1}`;
}
