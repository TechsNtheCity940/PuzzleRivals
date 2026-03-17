import { createAdminClient } from "./supabase.ts";
import { getPuzzleMeta } from "./puzzle.ts";
import { isRapidFirePuzzleType } from "./match-rules.ts";

export async function getLobbySnapshot(lobbyId: string) {
  const admin = createAdminClient();

  const [{ data: lobby, error: lobbyError }, { data: players, error: playersError }, { data: round, error: roundError }] =
    await Promise.all([
      admin.from("lobbies").select("*").eq("id", lobbyId).maybeSingle(),
      admin
        .from("lobby_players")
        .select("*, profiles!inner(id, username, rank, elo, avatar_id, frame_id, player_card_id, banner_id, emblem_id, title_id)")
        .eq("lobby_id", lobbyId)
        .is("left_at", null)
        .order("seat_no", { ascending: true }),
      admin.from("rounds").select("*").eq("lobby_id", lobbyId).order("round_no", { ascending: false }).limit(1).maybeSingle(),
    ]);

  if (lobbyError) throw lobbyError;
  if (playersError) throw playersError;
  if (roundError) throw roundError;

  const { data: results, error: resultsError } = round
    ? await admin.from("round_results").select("*").eq("round_id", round.id)
    : { data: [], error: null };

  if (resultsError) throw resultsError;

  const resultMap = new Map((results ?? []).map((result) => [String(result.user_id), result]));
  const playerIds = (players ?? []).map((player) => String(player.user_id));
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

  const selectedProductIds = [...new Set(
    (players ?? []).flatMap((player) => [
      player.profiles.player_card_id,
      player.profiles.banner_id,
      player.profiles.emblem_id,
      player.profiles.title_id,
    ].filter((value): value is string => typeof value === "string" && value.length > 0)),
  )];

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
      playerCardName: null,
      bannerName: null,
      emblemName: null,
      titleName: null,
    };

    if (product.kind === "player_card" && !bucket.playerCardName) bucket.playerCardName = name;
    if (product.kind === "banner" && !bucket.bannerName) bucket.bannerName = name;
    if (product.kind === "emblem" && !bucket.emblemName) bucket.emblemName = name;
    if (product.kind === "title" && !bucket.titleName) bucket.titleName = name;
    cosmeticsByUserId.set(userId, bucket);
  }

  const snapshotPlayers = (players ?? []).map((player) => {
    const result = resultMap.get(String(player.user_id));
    const cosmetics = cosmeticsByUserId.get(String(player.user_id));
    return {
      playerId: player.user_id,
      username: player.profiles.username,
      elo: player.profiles.elo,
      rank: player.profiles.rank,
      avatarId: player.profiles.avatar_id,
      frameId: player.profiles.frame_id,
      playerCardId: player.profiles.player_card_id,
      bannerId: player.profiles.banner_id,
      emblemId: player.profiles.emblem_id,
      titleId: player.profiles.title_id,
      playerCardName: selectedProductNameById.get(String(player.profiles.player_card_id ?? "")) ?? cosmetics?.playerCardName ?? null,
      bannerName: selectedProductNameById.get(String(player.profiles.banner_id ?? "")) ?? cosmetics?.bannerName ?? null,
      emblemName: selectedProductNameById.get(String(player.profiles.emblem_id ?? "")) ?? cosmetics?.emblemName ?? null,
      titleName: selectedProductNameById.get(String(player.profiles.title_id ?? "")) ?? cosmetics?.titleName ?? null,
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
