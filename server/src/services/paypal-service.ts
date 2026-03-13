import { randomUUID } from "node:crypto";
import type { CreatePayPalOrderInput } from "../types.js";

interface PayPalAccessTokenResponse {
  access_token: string;
}

export class PayPalService {
  constructor(
    private readonly baseUrl: string,
    private readonly clientId?: string,
    private readonly clientSecret?: string,
  ) {}

  async createOrder(input: CreatePayPalOrderInput) {
    this.assertConfigured();
    const accessToken = await this.getAccessToken();
    const itemTotal = input.items.reduce((sum, item) => sum + item.unitAmount * item.quantity, 0);

    const response = await fetch(`${this.baseUrl}/v2/checkout/orders`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
        Prefer: "return=representation",
        "PayPal-Request-Id": randomUUID(),
      },
      body: JSON.stringify({
        intent: "CAPTURE",
        purchase_units: [
          {
            reference_id: input.referenceId ?? randomUUID(),
            description: input.description,
            amount: {
              currency_code: input.currencyCode,
              value: itemTotal.toFixed(2),
              breakdown: {
                item_total: {
                  currency_code: input.currencyCode,
                  value: itemTotal.toFixed(2),
                },
              },
            },
            items: input.items.map((item) => ({
              name: item.name,
              description: item.description,
              sku: item.sku,
              quantity: String(item.quantity),
              unit_amount: {
                currency_code: input.currencyCode,
                value: item.unitAmount.toFixed(2),
              },
            })),
          },
        ],
        application_context:
          input.returnUrl && input.cancelUrl
            ? {
                return_url: input.returnUrl,
                cancel_url: input.cancelUrl,
              }
            : undefined,
      }),
    });

    return this.parseResponse(response);
  }

  async captureOrder(orderId: string) {
    this.assertConfigured();
    const accessToken = await this.getAccessToken();
    const response = await fetch(`${this.baseUrl}/v2/checkout/orders/${orderId}/capture`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
        Prefer: "return=representation",
        "PayPal-Request-Id": randomUUID(),
      },
    });

    return this.parseResponse(response);
  }

  private async getAccessToken() {
    const credentials = Buffer.from(`${this.clientId}:${this.clientSecret}`).toString("base64");
    const response = await fetch(`${this.baseUrl}/v1/oauth2/token`, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: `Basic ${credentials}`,
      },
      body: "grant_type=client_credentials",
    });

    const parsed = (await this.parseResponse(response)) as PayPalAccessTokenResponse;
    return parsed.access_token;
  }

  private async parseResponse(response: Response) {
    const payload = await response.json();

    if (!response.ok) {
      throw new Error(payload.message ?? "PayPal request failed.");
    }

    return payload;
  }

  private assertConfigured() {
    if (!this.clientId || !this.clientSecret) {
      throw new Error("PayPal credentials are missing. Set PAYPAL_CLIENT_ID and PAYPAL_CLIENT_SECRET.");
    }
  }
}
