"use client";

import { useGame } from "@/lib/game/store.js";
import { selectableTerritories, resolveTap } from "@/lib/game/interaction.js";
import { findTradeableSet } from "@teg/engine";
import { WorldBoard } from "@/components/board/WorldBoard.js";
import { ActionPanel } from "@/components/game/ActionPanel.js";
import { StatusBar } from "@/components/game/StatusBar.js";
import { CombatResult } from "@/components/game/CombatResult.js";
import { Hand } from "@/components/game/Hand.js";

/**
 * The shared playing surface (status + board + combat + action panel) used by
 * both the practice and ranked screens. Each screen renders its own header and
 * lifecycle around this.
 *
 * @param interactive when false (e.g. a finished ranked game) the ActionPanel is
 *   never shown even on the human's turn. Defaults to true (practice).
 */
export function GameView({ interactive = true }: { interactive?: boolean }) {
  const store = useGame();
  const { state, selected, aiThinking } = store;
  if (!state) return null;

  const onYourTurn = state.players[state.currentPlayerIndex]!.id === "you" && !state.winnerId;
  const humanTurn = onYourTurn && !aiThinking;
  const occupying = !!state.pendingOccupation;
  const selectable = humanTurn && !occupying ? selectableTerritories(state, "you", selected) : [];
  const showPanel = interactive && onYourTurn;
  const youPlayer = state.players.find((p) => p.id === "you")!;
  const tradeSet = showPanel && state.phase === "reinforce" ? findTradeableSet(youPlayer.cards) : null;
  const youAreAttacker = state.lastCombat
    ? state.territories[state.lastCombat.from]?.ownerId === "you"
    : false;

  function onSelect(territoryId: string) {
    if (!humanTurn || !state) return;
    if (!selectable.includes(territoryId) && selected !== territoryId) return;
    const tap = resolveTap(state, "you", selected, territoryId);
    switch (tap.kind) {
      case "select":
        store.select(tap.territoryId);
        break;
      case "place":
        store.place(tap.territoryId, state.pendingReinforcements);
        break;
      case "attack":
        store.attack(tap.from, tap.to);
        break;
      case "fortify":
        store.fortify(tap.from, tap.to, state.territories[tap.from]!.armies - 1);
        break;
    }
  }

  return (
    <>
      <StatusBar state={state} aiThinking={aiThinking} />
      <WorldBoard state={state} selectable={selectable} selected={selected} onSelect={onSelect} />
      <CombatResult combat={state.lastCombat} youAreAttacker={youAreAttacker} />
      <Hand cards={youPlayer.cards} map={state.map} />
      {showPanel && (
        <ActionPanel
          state={state}
          tradeSet={tradeSet}
          disabled={aiThinking}
          onTradeCards={(ids) => store.tradeCards(ids)}
          onEndReinforce={() => store.endReinforce()}
          onEndAttack={() => store.endAttack()}
          onEndTurn={() => void store.endTurn()}
          onOccupy={(armies) => void store.occupy(armies)}
        />
      )}
    </>
  );
}
