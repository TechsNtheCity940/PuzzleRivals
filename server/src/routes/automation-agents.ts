import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { serverConfig } from "../config.js";
import {
  buildAutomationAgentRegistry,
  executeAutomationAgentTask,
  listAutomationAgents,
} from "../automation-agents/registry.js";
import { automationAgentTaskSchema } from "../automation-agents/types.js";

export async function registerAutomationAgentRoutes(app: FastifyInstance) {
  const registry = buildAutomationAgentRegistry();

  app.get(serverConfig.automationRoutePrefix, async () => ({
    agents: listAutomationAgents(registry),
    routePrefix: serverConfig.automationRoutePrefix,
    stubMode: serverConfig.agentStubMode,
  }));

  app.post(`${serverConfig.automationRoutePrefix}/execute`, async (request, reply) => {
    const task = automationAgentTaskSchema.parse(request.body ?? {});
    const requestIdHeader = z.string().optional().parse(request.headers["x-request-id"]);

    const result = await executeAutomationAgentTask(registry, task, {
      locale: task.context.locale,
      now: new Date(),
      requestId: task.context.requestId ?? requestIdHeader,
      seed: task.context.seed,
    });

    reply.send(result);
  });
}
