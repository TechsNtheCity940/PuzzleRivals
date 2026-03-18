import { z } from "zod";
import { getPuzzleCatalog } from "../../services/puzzle-seed-service.js";
import type { AutomationAgent } from "../types.js";

const projectSearchInputSchema = z.object({
  documents: z.array(z.object({
    id: z.string().min(1),
    tags: z.array(z.string()).default([]),
    text: z.string().min(1),
    title: z.string().min(1),
  })).optional(),
  limit: z.number().int().min(1).max(20).default(5),
  query: z.string().trim().min(1),
});

type ProjectSearchInput = z.infer<typeof projectSearchInputSchema>;

type SearchDocument = {
  id: string;
  tags: string[];
  text: string;
  title: string;
};

const MODE_DOCUMENTS: SearchDocument[] = [
  {
    id: "mode-ranked",
    title: "Ranked mode",
    tags: ["mode", "ranked", "competitive"],
    text: "Ranked mode raises pressure, uses adaptive difficulty, and is meant for competitive progression.",
  },
  {
    id: "mode-casual",
    title: "Casual mode",
    tags: ["mode", "casual", "practice"],
    text: "Casual mode relaxes difficulty and fits no-stakes generated runs or warm-up play.",
  },
  {
    id: "mode-royale",
    title: "Royale mode",
    tags: ["mode", "royale", "elimination"],
    text: "Royale mode supports larger competitive sessions built around survival and leaderboard pressure.",
  },
  {
    id: "mode-revenge",
    title: "Revenge mode",
    tags: ["mode", "revenge", "rematch"],
    text: "Revenge mode leans into rematch dynamics and puzzle selections that play against rival strengths and weaknesses.",
  },
  {
    id: "mode-challenge",
    title: "Challenge mode",
    tags: ["mode", "challenge", "objective"],
    text: "Challenge mode is suited for curated tasks, event rules, and bespoke scenario generation.",
  },
  {
    id: "mode-daily",
    title: "Daily mode",
    tags: ["mode", "daily", "seeded"],
    text: "Daily mode fits fresh daily puzzle runs with consistent seeds and repeatable challenge conditions.",
  },
];

function tokenize(value: string) {
  return value
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter(Boolean);
}

function buildDefaultDocuments(): SearchDocument[] {
  const puzzleDocuments = getPuzzleCatalog().map((entry) => ({
    id: `puzzle-${entry.type}`,
    tags: ["puzzle", entry.type, entry.label.toLowerCase().replace(/\s+/g, "-")],
    text: entry.description,
    title: entry.label,
  }));

  return [...puzzleDocuments, ...MODE_DOCUMENTS];
}

export function createProjectSearchAgent(): AutomationAgent<ProjectSearchInput> {
  return {
    description: "Search PuzzleRivals puzzle and mode metadata with deterministic keyword ranking.",
    id: "project-search",
    inputSchema: projectSearchInputSchema,
    async execute(input) {
      const queryTokens = tokenize(input.query);
      const documents = input.documents ?? buildDefaultDocuments();

      const results = documents
        .map((document) => {
          const haystack = [...tokenize(document.title), ...tokenize(document.text), ...document.tags.map((tag) => tag.toLowerCase())];
          const score = queryTokens.reduce((total, token) => total + haystack.filter((entry) => entry === token).length, 0);

          return {
            excerpt: document.text.slice(0, 180),
            id: document.id,
            score,
            tags: document.tags,
            title: document.title,
          };
        })
        .filter((document) => document.score > 0)
        .sort((left, right) => right.score - left.score)
        .slice(0, input.limit);

      return {
        query: input.query,
        results,
        total: results.length,
      };
    },
  };
}
