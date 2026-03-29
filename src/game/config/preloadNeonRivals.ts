import { NEON_RIVALS_ASSET_MANIFEST } from "@/game/config/runModes";

let neonRivalsPrimePromise: Promise<void> | null = null;

function preloadImage(src: string) {
  return new Promise<void>((resolve) => {
    if (typeof window === "undefined") {
      resolve();
      return;
    }

    const image = new Image();
    const finalize = () => resolve();
    image.onload = finalize;
    image.onerror = finalize;
    image.src = src;
    if ("decode" in image) {
      void image.decode().catch(() => undefined).finally(finalize);
    }
  });
}

export function primeNeonRivalsExperience() {
  if (!neonRivalsPrimePromise) {
    neonRivalsPrimePromise = (async () => {
      await Promise.all([
        import("@/game/config/gameConfig"),
        ...NEON_RIVALS_ASSET_MANIFEST.map((asset) => preloadImage(asset)),
      ]);
    })();
  }

  return neonRivalsPrimePromise;
}
