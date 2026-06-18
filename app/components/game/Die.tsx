"use client";

import { cn } from "@/lib/utils.js";

/** Pip centres on a 24×24 grid, per face value. */
const PIPS: Record<number, [number, number][]> = {
  1: [[12, 12]],
  2: [[8, 8], [16, 16]],
  3: [[8, 8], [12, 12], [16, 16]],
  4: [[8, 8], [16, 8], [8, 16], [16, 16]],
  5: [[8, 8], [16, 8], [12, 12], [8, 16], [16, 16]],
  6: [[8, 7], [16, 7], [8, 12], [16, 12], [8, 17], [16, 17]],
};

const TONE: Record<"you" | "ai", string> = {
  you: "var(--color-you)",
  ai: "var(--color-ai)",
};

export function Die({
  value,
  tone,
  outcome,
  className,
}: {
  value: number;
  tone: "you" | "ai";
  outcome?: "win" | "lose";
  className?: string;
}) {
  const color = TONE[tone];
  const pips = PIPS[value] ?? [];
  const isLose = outcome === "lose";
  const isWin = outcome === "win";
  return (
    <span
      data-testid="die"
      data-value={value}
      data-tone={tone}
      data-outcome={outcome ?? "neutral"}
      aria-hidden="true"
      className={cn(
        "relative inline-flex h-[26px] w-[26px] flex-none items-center justify-center rounded-md border bg-[var(--color-surface-2)]",
        isLose && "opacity-40",
        className,
      )}
      style={{
        borderColor: color,
        boxShadow: isWin ? `0 0 0 1.5px ${color}, 0 0 10px -4px ${color}` : undefined,
      }}
    >
      <svg viewBox="0 0 24 24" className="h-full w-full">
        {pips.map(([cx, cy], i) => (
          <circle key={i} cx={cx} cy={cy} r="2.1" fill={color} />
        ))}
      </svg>
      {isLose && (
        <span
          className="absolute -right-1 -top-1 text-[10px] font-bold leading-none"
          style={{ color: tone === "you" ? "var(--color-ai)" : "var(--color-you)" }}
        >
          ✕
        </span>
      )}
    </span>
  );
}
