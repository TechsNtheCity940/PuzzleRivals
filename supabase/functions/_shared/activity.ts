import type { SupabaseClient } from "jsr:@supabase/supabase-js@2";
import type { ProductRow } from "./store.ts";

type ActivityEventType = "match" | "purchase" | "social";

type UpsertProfileActivityEventInput = {
  userId: string;
  eventType: ActivityEventType;
  sourceType: string;
  sourceKey: string;
  label: string;
  title: string;
  description: string;
  occurredAt?: string;
  metadata?: Record<string, unknown>;
};

type MatchActivityInput = {
  userId: string;
  roundId: string;
  roundNo: number;
  mode: string;
  puzzleType: string;
  placement: number;
  liveProgress: number;
  xpDelta: number;
  coinDelta: number;
  eloDelta: number;
  occurredAt?: string;
};

type ArcadeRunActivityInput = {
  userId: string;
  runId: string;
  mode: string;
  objectiveTitle: string;
  objectiveLabel: string;
  status: "complete" | "failed";
  score: number;
  xpDelta: number;
  coinDelta: number;
  passXpDelta: number;
  shardDelta: number;
  occurredAt?: string;
};

type PurchaseActivityInput = {
  userId: string;
  purchaseId: string;
  product: ProductRow;
  status: string;
  currency: string;
  amount: number | string;
  occurredAt?: string;
};

function isMissingActivitySchema(error: unknown) {
  return Boolean(
    error &&
      typeof error === "object" &&
      "code" in error &&
      (error.code === "42P01" || error.code === "42703" || error.code === "PGRST204"),
  );
}

function asNumber(value: number | string, fallback = 0) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return fallback;
}

function toTitleCase(value: string) {
  return value
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (match) => match.toUpperCase());
}

function formatSignedValue(value: number, label: string) {
  if (!value) {
    return null;
  }

  return `${value > 0 ? "+" : ""}${value} ${label}`;
}

function formatCurrencyAmount(value: number | string, currency: string) {
  const amount = asNumber(value, 0);
  if (currency === "USD") {
    return `$${amount.toFixed(2)}`;
  }
  if (currency === "GEMS") {
    return `${amount} Gems`;
  }
  if (currency === "COINS") {
    return `${amount} Coins`;
  }
  return `${currency} ${amount.toFixed(2)}`;
}

export async function upsertProfileActivityEvent(
  admin: SupabaseClient,
  input: UpsertProfileActivityEventInput,
) {
  const { error } = await admin.from("profile_activity_events").upsert({
    user_id: input.userId,
    event_type: input.eventType,
    source_type: input.sourceType,
    source_key: input.sourceKey,
    label: input.label,
    title: input.title,
    description: input.description,
    metadata: input.metadata ?? {},
    occurred_at: input.occurredAt ?? new Date().toISOString(),
    is_read: false,
  }, { onConflict: "user_id,source_type,source_key" });

  if (error) {
    if (isMissingActivitySchema(error)) {
      return false;
    }
    throw error;
  }

  return true;
}

export async function recordMatchActivity(
  admin: SupabaseClient,
  input: MatchActivityInput,
) {
  const modeLabel = toTitleCase(input.mode);
  const puzzleLabel = toTitleCase(input.puzzleType);
  const performanceBits = [
    input.placement ? `#${input.placement} finish` : null,
    formatSignedValue(input.xpDelta, "XP"),
    formatSignedValue(input.coinDelta, "Coins"),
    formatSignedValue(input.eloDelta, "ELO"),
    !input.placement && input.liveProgress ? `${input.liveProgress}% progress` : null,
  ].filter((entry): entry is string => Boolean(entry));

  const title = input.placement === 1
    ? `Won a ${modeLabel.toLowerCase()} ${puzzleLabel} round`
    : input.placement
      ? `Finished #${input.placement} in ${puzzleLabel}`
      : input.liveProgress >= 100
        ? `Solved ${puzzleLabel}`
        : `Played ${puzzleLabel}`;

  return upsertProfileActivityEvent(admin, {
    userId: input.userId,
    eventType: "match",
    sourceType: "round_result",
    sourceKey: input.roundId,
    label: `${modeLabel} Match`,
    title,
    description: [performanceBits.join(" | "), input.roundNo ? `Round ${input.roundNo}` : null]
      .filter((entry): entry is string => Boolean(entry))
      .join(" | "),
    occurredAt: input.occurredAt,
    metadata: {
      roundId: input.roundId,
      roundNo: input.roundNo,
      mode: input.mode,
      puzzleType: input.puzzleType,
      placement: input.placement,
      liveProgress: input.liveProgress,
      xpDelta: input.xpDelta,
      coinDelta: input.coinDelta,
      eloDelta: input.eloDelta,
    },
  });
}

export async function recordArcadeRunActivity(
  admin: SupabaseClient,
  input: ArcadeRunActivityInput,
) {
  const performanceBits = [
    `Score ${input.score.toLocaleString()}`,
    formatSignedValue(input.xpDelta, "XP"),
    formatSignedValue(input.coinDelta, "Coins"),
    formatSignedValue(input.passXpDelta, "Pass XP"),
    formatSignedValue(input.shardDelta, "Shards"),
  ].filter((entry): entry is string => Boolean(entry));

  return upsertProfileActivityEvent(admin, {
    userId: input.userId,
    eventType: "match",
    sourceType: "neon_rivals_run",
    sourceKey: input.runId,
    label: "Neon Rivals Run",
    title: input.status === "complete" ? `Cleared ${input.objectiveTitle}` : `Missed ${input.objectiveTitle}`,
    description: [input.objectiveLabel, performanceBits.join(" | ")]
      .filter((entry): entry is string => Boolean(entry))
      .join(" | "),
    occurredAt: input.occurredAt,
    metadata: {
      runId: input.runId,
      mode: input.mode,
      objectiveTitle: input.objectiveTitle,
      objectiveLabel: input.objectiveLabel,
      status: input.status,
      score: input.score,
      xpDelta: input.xpDelta,
      coinDelta: input.coinDelta,
      passXpDelta: input.passXpDelta,
      shardDelta: input.shardDelta,
    },
  });
}

export async function recordPurchaseActivity(
  admin: SupabaseClient,
  input: PurchaseActivityInput,
) {
  const productName = String(input.product.metadata?.name ?? input.product.id);
  const productKind = input.product.kind;
  const status = input.status || "captured";
  const title = status === "captured"
    ? `Unlocked ${productName}`
    : status === "approved"
      ? `Purchase approved for ${productName}`
      : status === "failed"
        ? `Purchase failed for ${productName}`
        : `Checkout started for ${productName}`;

  return upsertProfileActivityEvent(admin, {
    userId: input.userId,
    eventType: "purchase",
    sourceType: "purchase",
    sourceKey: input.purchaseId,
    label: status === "captured" ? "Purchase" : "Checkout",
    title,
    description: [formatCurrencyAmount(input.amount, input.currency), productKind, status]
      .filter((entry): entry is string => Boolean(entry))
      .join(" | "),
    occurredAt: input.occurredAt,
    metadata: {
      purchaseId: input.purchaseId,
      productId: input.product.id,
      productKind,
      status,
      currency: input.currency,
      amount: asNumber(input.amount, 0),
    },
  });
}
