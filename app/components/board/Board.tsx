import type { GameState } from "@teg/engine";

export interface BoardProps {
  state: GameState;
  /** Territory ids the human can currently act on (tappable/highlighted). */
  selectable: string[];
  /** The currently selected "from" territory, if any. */
  selected: string | null;
  /** Called when the human taps a territory. */
  onSelect: (territoryId: string) => void;
}
