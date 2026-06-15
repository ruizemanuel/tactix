import { render, screen } from "@testing-library/react";
import { expect, test, vi } from "vitest";
import { I18nProvider } from "@/lib/i18n/I18nProvider.js";
import { LeaderboardView } from "./LeaderboardView.js";

vi.mock("wagmi", () => ({ useAccount: () => ({ address: "0xAAA0000000000000000000000000000000000001" }) }));

test("marks the connected player's row with aria-current", () => {
  render(
    <I18nProvider initialLocale="en">
      <LeaderboardView
        rows={[
          { player: "0xBBB0000000000000000000000000000000000002", bestScore: 50, rank: 1 },
          { player: "0xAAA0000000000000000000000000000000000001", bestScore: 30, rank: 2 },
        ]}
      />
    </I18nProvider>,
  );
  const me = screen.getByText(/0xAAA0…0001/i).closest("li");
  expect(me).toHaveAttribute("aria-current", "true");
  const other = screen.getByText(/0xBBB0…0002/i).closest("li");
  expect(other).not.toHaveAttribute("aria-current");
});
