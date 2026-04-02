function getPayPalBaseUrl() {
  return (Deno.env.get("PAYPAL_ENV") ?? "live") === "live"
    ? "https://api-m.paypal.com"
    : "https://api-m.sandbox.paypal.com";
}

async function parseResponse(response: Response) {
  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload.message ?? "PayPal request failed.");
  }
  return payload;
}

async function getAccessToken() {
  const clientId = Deno.env.get("PAYPAL_CLIENT_ID");
  const clientSecret = Deno.env.get("PAYPAL_CLIENT_SECRET");

  if (!clientId || !clientSecret) {
    throw new Error("PayPal is not configured. Set PAYPAL_CLIENT_ID and PAYPAL_CLIENT_SECRET.");
  }

  const credentials = btoa(`${clientId}:${clientSecret}`);
  const response = await fetch(`${getPayPalBaseUrl()}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${credentials}`,
    },
    body: "grant_type=client_credentials",
  });

  const payload = await parseResponse(response) as { access_token: string };
  return payload.access_token;
}

export function getPayPalWebhookId() {
  const webhookId = Deno.env.get("PAYPAL_WEBHOOK_ID");
  if (!webhookId) {
    throw new Error("PayPal webhook is not configured. Set PAYPAL_WEBHOOK_ID.");
  }
  return webhookId;
}

export async function verifyPayPalWebhookSignature(input: {
  authAlgo: string;
  certUrl: string;
  transmissionId: string;
  transmissionSig: string;
  transmissionTime: string;
  webhookId: string;
  webhookEvent: Record<string, unknown>;
}) {
  const accessToken = await getAccessToken();
  const response = await fetch(`${getPayPalBaseUrl()}/v1/notifications/verify-webhook-signature`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({
      auth_algo: input.authAlgo,
      cert_url: input.certUrl,
      transmission_id: input.transmissionId,
      transmission_sig: input.transmissionSig,
      transmission_time: input.transmissionTime,
      webhook_id: input.webhookId,
      webhook_event: input.webhookEvent,
    }),
  });

  const payload = await parseResponse(response) as { verification_status?: string };
  return payload.verification_status === "SUCCESS";
}

export async function createPayPalOrder(input: {
  name: string;
  description: string;
  orderId: string;
  amountUsd: number;
  returnUrl: string;
  cancelUrl: string;
}) {
  const accessToken = await getAccessToken();
  const response = await fetch(`${getPayPalBaseUrl()}/v2/checkout/orders`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
      Prefer: "return=representation",
      "PayPal-Request-Id": crypto.randomUUID(),
    },
    body: JSON.stringify({
      intent: "CAPTURE",
      purchase_units: [
        {
          reference_id: input.orderId,
          description: input.description,
          amount: {
            currency_code: "USD",
            value: input.amountUsd.toFixed(2),
            breakdown: {
              item_total: {
                currency_code: "USD",
                value: input.amountUsd.toFixed(2),
              },
            },
          },
          items: [
            {
              name: input.name,
              quantity: "1",
              unit_amount: {
                currency_code: "USD",
                value: input.amountUsd.toFixed(2),
              },
            },
          ],
        },
      ],
      application_context: {
        return_url: input.returnUrl,
        cancel_url: input.cancelUrl,
      },
    }),
  });

  return parseResponse(response);
}

export async function capturePayPalOrder(orderId: string) {
  const accessToken = await getAccessToken();
  const response = await fetch(`${getPayPalBaseUrl()}/v2/checkout/orders/${orderId}/capture`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
      Prefer: "return=representation",
      "PayPal-Request-Id": crypto.randomUUID(),
    },
  });

  return parseResponse(response);
}
