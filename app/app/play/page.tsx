import Link from "next/link";
import { PlayScreen } from "@/components/game/PlayScreen.js";

export default function PlayPage() {
  return (
    <div className="relative">
      <Link
        href="/"
        className="absolute left-3 top-3 z-10 rounded-lg border border-[var(--color-hairline-2)] px-3 py-[6px] text-[11px] font-bold uppercase tracking-[.08em] text-[var(--color-text)] hover:bg-white/10"
        style={{ fontFamily: "var(--font-mono)" }}
      >
        ← Lobby
      </Link>
      <PlayScreen />
    </div>
  );
}
