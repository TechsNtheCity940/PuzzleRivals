const encoder = new TextEncoder();

function normalizeAnswer(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

async function digestHex(value: string) {
  const hash = await crypto.subtle.digest("SHA-256", encoder.encode(value));
  return Array.from(new Uint8Array(hash))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

export async function hashSecurityAnswer(answer: string) {
  const pepper = Deno.env.get("SECURITY_QUESTIONS_PEPPER") ?? "";
  return digestHex(`${normalizeAnswer(answer)}::${pepper}`);
}

export async function answersMatch(answer: string, expectedHash: string) {
  const nextHash = await hashSecurityAnswer(answer);
  return nextHash === expectedHash;
}
