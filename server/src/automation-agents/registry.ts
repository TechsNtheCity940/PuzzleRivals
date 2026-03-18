import { serverConfig } from "../config.js";
import { createProjectSearchAgent } from "./agents/project-search.js";
import { createScenarioGeneratorAgent } from "./agents/scenario-generator.js";
import { createModelClient } from "./model-client.js";
import type {
  AutomationAgent,
  AutomationAgentExecutionContext,
  AutomationAgentResult,
  AutomationAgentTask,
} from "./types.js";

export function buildAutomationAgentRegistry() {
  const modelClient = createModelClient(serverConfig.agentStubMode);
  const agents: AutomationAgent<any>[] = [
    createScenarioGeneratorAgent(modelClient),
    createProjectSearchAgent(),
  ];

  return new Map(agents.map((agent) => [agent.id, agent]));
}

export function listAutomationAgents(registry: Map<string, AutomationAgent<any>>) {
  return Array.from(registry.values()).map((agent) => ({
    description: agent.description,
    id: agent.id,
  }));
}

export async function executeAutomationAgentTask(
  registry: Map<string, AutomationAgent<any>>,
  task: AutomationAgentTask,
  context: AutomationAgentExecutionContext,
): Promise<AutomationAgentResult> {
  const agent = registry.get(task.agent);
  if (!agent) {
    throw new Error(`Unknown automation agent: ${task.agent}`);
  }

  const startedAt = Date.now();
  const parsedInput = agent.inputSchema.parse(task.input);
  const data = await agent.execute(parsedInput, context);

  return {
    data,
    meta: {
      agent: agent.id,
      durationMs: Date.now() - startedAt,
      mode: serverConfig.agentStubMode ? "stub" : "deterministic",
      requestId: context.requestId,
      seed: context.seed,
    },
    ok: true,
  };
}
