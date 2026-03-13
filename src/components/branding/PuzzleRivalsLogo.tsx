export default function PuzzleRivalsLogo() {
  return (
    <div className="relative overflow-hidden rounded-[32px] border border-white/10 bg-slate-950/80 shadow-[0_28px_70px_rgba(0,0,0,0.35)]">
      <img
        src="/brand/puzzle-rivals-logo.png"
        alt="Puzzle Rivals Big Brain Moves"
        className="block w-full object-cover"
        draggable={false}
      />
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.04),transparent_24%,rgba(2,6,23,0.12))]" />
    </div>
  );
}
