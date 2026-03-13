import { z } from "zod";
import type { FastifyInstance } from "fastify";
import { AuthService } from "../services/auth-service.js";
import { DatabaseService } from "../services/database-service.js";
import type { PayPalService } from "../services/paypal-service.js";

const createOrderSchema = z.object({
  currencyCode: z.string().length(3).default("USD"),
  referenceId: z.string().optional(),
  description: z.string().optional(),
  returnUrl: z.string().url().optional(),
  cancelUrl: z.string().url().optional(),
  items: z.array(
    z.object({
      name: z.string().min(1),
      quantity: z.number().int().positive(),
      unitAmount: z.number().positive(),
      description: z.string().optional(),
      sku: z.string().optional(),
    }),
  ).min(1),
});

export async function registerPayPalRoutes(
  app: FastifyInstance,
  payPalService: PayPalService,
  authService: AuthService,
  database: DatabaseService,
) {
  app.post("/api/paypal/orders", async (request, reply) => {
    const authenticated = authService.requireAuthenticatedUser(request);
    const input = createOrderSchema.parse(request.body);
    const order = await payPalService.createOrder(input);
    if (order?.id) {
      database.savePayPalOrder(order.id, authenticated.user.id, order.status ?? "CREATED", order);
    }
    reply.send({ order });
  });

  app.post("/api/paypal/orders/:orderId/capture", async (request, reply) => {
    const authenticated = authService.requireAuthenticatedUser(request);
    const params = z.object({ orderId: z.string().min(1) }).parse(request.params);
    const capture = await payPalService.captureOrder(params.orderId);
    database.savePayPalOrder(params.orderId, authenticated.user.id, capture.status ?? "CAPTURED", capture);
    reply.send({ capture });
  });
}
