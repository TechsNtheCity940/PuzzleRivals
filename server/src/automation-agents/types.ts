import { z } from "zod";

export const automationAgentTaskSchema = z.object({
  agent: z.string().min(1),
  input: z.record(z.string(), z.unknown()).default({}),
  context: z.object({
    locale: z.string().optional(),
    requestId: z.string().optional(),
    seed: z.number().int().optional(),
  }).default({}),
});

export type AutomationAgentTask = z.infer<typeof automationAgentTaskSchema>;

export interface AutomationAgentExecutionContext {
  locale?: string;
  now: Date;
  requestId?: string;
  seed?: number;
}

export interface AutomationAgentResult<TOutput = unknown> {
  data: TOutput;
  meta: {
    agent: string;
    durationMs: number;
    mode: "stub" | "deterministic" | "live";
    requestId?: string;
    seed?: number;
  };
  ok: true;
}

export interface AutomationAgent<TInput = Record<string, unknown>, TOutput = unknown> {
  description: string;
  execute: (input: TInput, context: AutomationAgentExecutionContext) => Promise<TOutput>;
  id: string;
  inputSchema: z.ZodTypeAny;
}
