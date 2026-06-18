"use client";

import type { CombatResult } from "@teg/engine";
import { useI18n } from "@/lib/i18n/I18nProvider.js";
import { Die } from "./Die.js";

type Tone = "you" | "ai";
interface DieView {
  value: number;
  outcome?: "win" | "lose";
}

/** Per-die outcome mirroring the engine pairing (combat.ts): highest-vs-highest
 *  by index, ties favour the defender; unpaired extra dice are neutral. */
function diceViews(combat: CombatResult): { attacker: DieView[]; defender: DieView[] } {
  const pairs = Math.min(combat.attackerDice.length, combat.defenderDice.length);
  const attacker = combat.attackerDice.map((value, i) => {
    if (i >= pairs) return { value };
    const attackerWins = combat.attackerDice[i]! > combat.defenderDice[i]!;
    return { value, outcome: (attackerWins ? "win" : "lose") as "win" | "lose" };
  });
  const defender = combat.defenderDice.map((value, i) => {
    if (i >= pairs) return { value };
    const attackerWins = combat.attackerDice[i]! > combat.defenderDice[i]!;
    return { value, outcome: (attackerWins ? "lose" : "win") as "win" | "lose" };
  });
  return { attacker, defender };
}

function Row({ label, tone, dice, testid }: { label: string; tone: Tone; dice: DieView[]; testid: string }) {
  return (
    <div data-testid={testid} className="flex items-center gap-1.5">
      <span
        className="w-[64px] flex-none text-[8px] font-bold uppercase tracking-[.1em]"
        style={{ fontFamily: "var(--font-mono)", color: tone === "you" ? "var(--color-you)" : "var(--color-ai)" }}
      >
        {label}
      </span>
      {dice.map((d, i) => (
        <Die key={i} value={d.value} tone={tone} outcome={d.outcome} />
      ))}
    </div>
  );
}

export function CombatDice({ combat, youAreAttacker }: { combat: CombatResult; youAreAttacker: boolean }) {
  const { t } = useI18n();
  const { attacker, defender } = diceViews(combat);
  const attackerTone: Tone = youAreAttacker ? "you" : "ai";
  const defenderTone: Tone = youAreAttacker ? "ai" : "you";
  return (
    <div aria-hidden="true" className="flex flex-col gap-1.5 motion-safe:[animation:diceIn_150ms_ease-out]">
      <Row label={t("dice.attacker")} tone={attackerTone} dice={attacker} testid="dice-row-attacker" />
      <Row label={t("dice.defender")} tone={defenderTone} dice={defender} testid="dice-row-defender" />
    </div>
  );
}
