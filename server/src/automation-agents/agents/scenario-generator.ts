import { z } from "zod";
import type { StructuredModelClient } from "../model-client.js";
import type { AutomationAgent, AutomationAgentExecutionContext } from "../types.js";

const scenarioGeneratorInputSchema = z.object({
  constraints: z.record(z.string(), z.unknown()).default({}),
  count: z.number().int().min(1).max(12).default(3),
  kind: z.enum(["text", "scenario", "numbers", "quiz", "puzzle-seed"]),
  seed: z.number().int().optional(),
  tone: z.string().trim().min(1).max(40).default("neutral"),
  topic: z.string().trim().min(1).max(80),
});

type ScenarioGeneratorInput = z.infer<typeof scenarioGeneratorInputSchema>;

class SeededRandom {
  private seed: number;

  constructor(seed: number) {
    this.seed = Math.floor(seed) % 2147483647;
    if (this.seed <= 0) {
      this.seed += 2147483646;
    }
  }

  next() {
    this.seed = (this.seed * 16807) % 2147483647;
    return (this.seed - 1) / 2147483646;
  }

  nextInt(min: number, max: number) {
    return Math.floor(this.next() * (max - min + 1)) + min;
  }

  pick<T>(items: T[]) {
    return items[this.nextInt(0, items.length - 1)];
  }
}

const OPENERS = ["rapid", "layered", "tense", "playful", "precise", "cinematic"];
const TWISTS = ["a hidden timer", "a missing clue", "an unreliable witness", "a rival team", "a silent failure", "a mirrored pattern"];
const ACTIONS = ["verify", "rank", "compose", "search", "repair", "shuffle"];

function resolveSeed(input: ScenarioGeneratorInput, context: AutomationAgentExecutionContext) {
  if (typeof input.seed === "number") return input.seed;
  if (typeof context.seed === "number") return context.seed;

  return Array.from(`${input.kind}:${input.topic}:${input.tone}`).reduce(
    (total, char) => total + char.charCodeAt(0),
    1009,
  );
}

function buildDeterministicPayload(input: ScenarioGeneratorInput, seed: number) {
  const rng = new SeededRandom(seed);

  if (input.kind === "text") {
    return Array.from({ length: input.count }, (_, index) => ({
      id: `${seed}-text-${index + 1}`,
      text: `${capitalize(rng.pick(OPENERS))} ${input.topic} copy for ${input.tone} delivery with ${rng.pick(TWISTS)}.`,
    }));
  }

  if (input.kind === "scenario") {
    return Array.from({ length: input.count }, (_, index) => ({
      id: `${seed}-scenario-${index + 1}`,
      objective: `The player must ${rng.pick(ACTIONS)} the critical signal before the final phase.`,
      summary: `Design a ${input.tone} ${input.topic} scenario around ${rng.pick(TWISTS)}.`,
    }));
  }

  if (input.kind === "numbers") {
    return Array.from({ length: input.count }, (_, index) => ({
      id: `${seed}-number-${index + 1}`,
      label: `${input.topic}-${index + 1}`,
      value: rng.nextInt(10, 999),
    }));
  }

  if (input.kind === "quiz") {
    return Array.from({ length: input.count }, (_, index) => {
      const correctOption = rng.nextInt(0, 3);
      const options = Array.from({ length: 4 }, (_, optionIndex) => `${capitalize(input.topic)} option ${optionIndex + 1}`);
      return {
        correctOption,
        id: `${seed}-quiz-${index + 1}`,
        options,
        prompt: `Which ${input.topic} option best matches the ${input.tone} brief?`,
      };
    });
  }

  return Array.from({ length: input.count }, (_, index) => ({
    difficulty: rng.nextInt(1, 5),
    id: `${seed}-puzzle-${index + 1}`,
    puzzleSeed: seed + index * 17,
    theme: input.topic,
  }));
}

function capitalize(value: string) {
  return `${value.charAt(0).toUpperCase()}${value.slice(1)}`;
}

export function createScenarioGeneratorAgent(modelClient: StructuredModelClient): AutomationAgent<ScenarioGeneratorInput> {
  return {
    description: "Generate deterministic text, scenarios, numbers, quizzes, and puzzle seeds for project workflows.",
    id: "scenario-generator",
    inputSchema: scenarioGeneratorInputSchema,
    async execute(input, context) {
      const seed = resolveSeed(input, context);
      const fallback = {
        constraints: input.constraints,
        items: buildDeterministicPayload(input, seed),
        kind: input.kind,
        seed,
        topic: input.topic,
      };

      return modelClient.completeJson({
        fallback,
        systemPrompt: "Return concise structured JSON for a narrow project automation task.",
        userPrompt: `Build ${input.count} ${input.kind} items for topic "${input.topic}" with tone "${input.tone}".`,
      });
    },
  };
}
