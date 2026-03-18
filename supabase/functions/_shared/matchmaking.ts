import { createAdminClient } from "./supabase.ts";
import { getPuzzleMeta } from "./puzzle.ts";
import { isRapidFirePuzzleType } from "./match-rules.ts";

export async function getLobbySnapshot(lobbyId: string) {
  const admin = createAdminClient();

  const [{ data: lobby, error: lobbyError }, { data: playerRows, error: playersError }, { data: round, error: roundError }] =
    await Promise.all([
      admin.from("lobbies").select("*").eq("id", lobbyId).maybeSingle(),
      admin
        .from("lobby_players")
        .select("*")
        .eq("lobby_id", lobbyId)
        .is("left_at", null)
        .order("seat_no", { ascending: true }),
      admin.from("rounds").select("*").eq("lobby_id", lobbyId).order("round_no", { ascending: false }).limit(1).maybeSingle(),
    ]);

  if (lobbyError) throw lobbyError;
  if (playersError) throw playersError;
  if (roundError) throw roundError;

  const playerIds = (playerRows ?? []).map((player) => String(player.user_id));
  const { data: profiles, error: profilesError } = playerIds.length > 0
    ? await admin
      .from("profiles")
      .select("id, username, rank, elo, avatar_id, frame_id")
      .in("id", playerIds)
    : { data: [], error: null };

  if (profilesError) throw profilesError;

  const { data: loadoutProfiles } = playerIds.length > 0
    ? await admin
      .from("profiles")
      .select("id, player_card_id, banner_id, emblem_id, title_id")
      .in("id", playerIds)
    : { data: [], error: null };

  const { data: results, error: resultsError } = round
    ? await admin.from("round_results").select("*").eq("round_id", round.id)
    : { data: [], error: null };

  if (resultsError) throw resultsError;

  const resultMap = new Map((results ?? []).map((result) => [String(result.user_id), result]));
  const { data: botRows, error: botError } = playerIds.length > 0
    ? await admin.from("bot_profiles").select("user_id").in("user_id", playerIds)
    : { data: [], error: null };

  if (botError) throw botError;

  const botIds = new Set((botRows ?? []).map((entry) => String(entry.user_id)));
  const { data: inventoryRows, error: inventoryError } = playerIds.length > 0
    ? await admin
      .from("user_inventory")
      .select("user_id, product_id, is_equipped, products!inner(id, kind, metadata)")
      .in("user_id", playerIds)
    : { data: [], error: null };

  if (inventoryError) throw inventoryError;

  const profileById = new Map(
    (profiles ?? []).map((profile) => [String(profile.id), profile]),
  );
  const loadoutByUserId = new Map(
    (loadoutProfiles ?? []).map((profile) => [String(profile.id), profile]),
  );

  const selectedProductIds = [...new Set((loadoutProfiles ?? []).flatMap((profile) => [
    profile.player_card_id,
    profile.banner_id,
    profile.emblem_id,
    profile.title_id,
  ].filter((value): value is string => typeof value === "string" && value.length > 0)))];

  const { data: selectedProducts, error: selectedProductsError } = selectedProductIds.length > 0
    ? await admin.from("products").select("id, kind, metadata").in("id", selectedProductIds)
    : { data: [], error: null };

  if (selectedProductsError) throw selectedProductsError;

  const selectedProductNameById = new Map(
    (selectedProducts ?? []).map((product) => [
      String(product.id),
      typeof product.metadata?.name === "string" ? product.metadata.name : null,
    ]),
  );

  const cosmeticsByUserId = new Map<string, {
    playerCardId: string | null;
    bannerId: string | null;
    emblemId: string | null;
    titleId: string | null;
    playerCardName: string | null;
    bannerName: string | null;
    emblemName: string | null;
    titleName: string | null;
  }>();

  for (const row of inventoryRows ?? []) {
    const userId = String(row.user_id);
    const product = Array.isArray(row.products) ? row.products[0] : row.products;
    const metadata = (product?.metadata ?? {}) as Record<string, unknown>;
    const name = typeof metadata.name === "string" ? metadata.name : null;
    if (!product?.kind || !name) continue;

    const bucket = cosmeticsByUserId.get(userId) ?? {
      playerCardId: null,
      bannerId: null,
      emblemId: null,
      titleId: null,
      playerCardName: null,
      bannerName: null,
      emblemName: null,
      titleName: null,
    };

    const shouldUse = Boolean(row.is_equipped) || !bucket[`${product.kind === "player_card" ? "playerCardName" : product.kind === "banner" ? "bannerName" : product.kind === "emblem" ? "emblemName" : "titleName"}` as "playerCardName" | "bannerName" | "emblemName" | "titleName"];
    if (product.kind === "player_card" && shouldUse) {
      bucket.playerCardId = String(product.id);
      bucket.playerCardName = name;
    }
    if (product.kind === "banner" && shouldUse) {
      bucket.bannerId = String(product.id);
      bucket.bannerName = name;
    }
    if (product.kind === "emblem" && shouldUse) {
      bucket.emblemId = String(product.id);
      bucket.emblemName = name;
    }
    if (product.kind === "title" && shouldUse) {
      bucket.titleId = String(product.id);
      bucket.titleName = name;
    }
    cosmeticsByUserId.set(userId, bucket);
  }

  const snapshotPlayers = (playerRows ?? []).map((player) => {
    const profile = profileById.get(String(player.user_id));
    const equipped = loadoutByUserId.get(String(player.user_id));
    const result = resultMap.get(String(player.user_id));
    const cosmetics = cosmeticsByUserId.get(String(player.user_id));
    return {
      playerId: player.user_id,
      username: profile?.username ?? "Rival",
      elo: Number(profile?.elo ?? 0),
      rank: profile?.rank ?? "bronze",
      avatarId: profile?.avatar_id ?? null,
      frameId: profile?.frame_id ?? null,
      playerCardId: equipped?.player_card_id ?? cosmetics?.playerCardId ?? null,
      bannerId: equipped?.banner_id ?? cosmetics?.bannerId ?? null,
      emblemId: equipped?.emblem_id ?? cosmetics?.emblemId ?? null,
      titleId: equipped?.title_id ?? cosmetics?.titleId ?? null,
      playerCardName: selectedProductNameById.get(String(equipped?.player_card_id ?? "")) ?? cosmetics?.playerCardName ?? null,
      bannerName: selectedProductNameById.get(String(equipped?.banner_id ?? "")) ?? cosmetics?.bannerName ?? null,
      emblemName: selectedProductNameById.get(String(equipped?.emblem_id ?? "")) ?? cosmetics?.emblemName ?? null,
      titleName: selectedProductNameById.get(String(equipped?.title_id ?? "")) ?? cosmetics?.titleName ?? null,
      isBot: botIds.has(String(player.user_id)),
      ready: player.is_ready,
      nextRoundVote: player.next_round_vote,
      joinedAt: player.joined_at,
      progress: Number(result?.live_progress ?? 0),
      practiceProgress: Number(result?.practice_progress ?? 0),
      solvedAtMs: result?.solved_at_ms ? Number(result.solved_at_ms) : null,
      completions: Number(result?.live_completions ?? (result?.solved_at_ms ? 1 : 0)),
      score: Number(result?.live_score ?? (result?.solved_at_ms ? 100 : 0)),
      currentSeed: Number(result?.current_live_seed ?? round?.live_seed ?? 0),
      pace: 0,
      reward: result?.placement
        ? {
            xp: Number(result.xp_delta ?? 0),
            coins: Number(result.coin_delta ?? 0),
            elo: Number(result.elo_delta ?? 0),
          }
        : undefined,
    };
  });

  return {
    lobby: {
      id: lobby?.id,
      mode: lobby?.mode,
      status: lobby?.status,
      maxPlayers: lobby?.max_players,
      createdAt: lobby?.created_at,
      updatedAt: lobby?.updated_at,
      expiresAt: lobby?.updated_at,
      players: snapshotPlayers,
      selection: round
        ? {
            puzzleType: round.puzzle_type,
            difficulty: round.difficulty,
            practiceSeed: Number(round.practice_seed),
            liveSeed: Number(round.live_seed),
            selectedAt: round.created_at,
            meta: getPuzzleMeta(round.puzzle_type),
          }
        : null,
      practiceStartsAt: round?.practice_started_at ?? null,
      practiceEndsAt: lobby?.practice_ends_at ?? null,
      liveStartsAt: round?.live_started_at ?? null,
      liveEndsAt: lobby?.live_ends_at ?? null,
      intermissionStartsAt: round?.finished_at ?? null,
      intermissionEndsAt: lobby?.intermission_ends_at ?? null,
      results: round && (round.status === "intermission" || round.status === "complete")
        ? {
            completedAt: round.finished_at,
            standings: [...snapshotPlayers]
              .filter((player) => player.reward)
              .sort((left, right) => Number(resultMap.get(left.playerId)?.placement ?? 99) - Number(resultMap.get(right.playerId)?.placement ?? 99))
              .map((player, index) => ({
                playerId: player.playerId,
                username: player.username,
                progress: player.progress,
                solvedAtMs: player.solvedAtMs,
                rank: Number(resultMap.get(player.playerId)?.placement ?? index + 1),
                completions: player.completions,
                score: player.score,
                reward: player.reward!,
                isBot: botIds.has(player.playerId),
              })),
            rapidFire: isRapidFirePuzzleType(round.puzzle_type),
          }
        : null,
    },
  };
}
