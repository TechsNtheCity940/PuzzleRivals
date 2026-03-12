import { createAdminClient } from "./supabase.ts";
import { getLobbySnapshot } from "./matchmaking.ts";

async function subscribeChannel(channel: { subscribe: (callback: (status: string) => void) => unknown }) {
  await new Promise<void>((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error("Timed out subscribing to Realtime channel.")), 5_000);

    channel.subscribe((status) => {
      if (status === "SUBSCRIBED") {
        clearTimeout(timeout);
        resolve();
      }

      if (status === "CHANNEL_ERROR" || status === "TIMED_OUT" || status === "CLOSED") {
        clearTimeout(timeout);
        reject(new Error(`Realtime subscription failed with status: ${status}`));
      }
    });
  });
}

export async function broadcastLobbySnapshot(lobbyId: string) {
  const admin = createAdminClient();
  const snapshot = await getLobbySnapshot(lobbyId);
  const channel = admin.channel(`lobby:${lobbyId}`);

  await subscribeChannel(channel);
  try {
    await channel.send({
      type: "broadcast",
      event: "lobby.snapshot",
      payload: snapshot,
    });
  } finally {
    await admin.removeChannel(channel);
  }

  return snapshot;
}
