import { render, screen } from "@testing-library/react";
import { afterEach, expect, test, vi } from "vitest";
import { I18nProvider } from "@/lib/i18n/I18nProvider.js";
import { LeaderboardView } from "./LeaderboardView.js";

const wmocks = vi.hoisted(() => ({ address: "0xAAA0000000000000000000000000000000000001" as string | undefined }));
vi.mock("wagmi", () => ({ useAccount: () => ({ address: wmocks.address }) }));

afterEach(() => {
  wmocks.address = "0xAAA0000000000000000000000000000000000001";
});

test("marks the connected player's row with aria-current", () => {
  wmocks.address = "0xAAA0000000000000000000000000000000000001";
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

test("shows the empty message when there are no rows", () => {
  render(
    <I18nProvider initialLocale="en">
      <LeaderboardView rows={[]} />
    </I18nProvider>,
  );
  expect(screen.getByText(/no ranked scores yet/i)).toBeInTheDocument();
});

test("renders rows with no aria-current when no wallet is connected", () => {
  wmocks.address = undefined;
  render(
    <I18nProvider initialLocale="en">
      <LeaderboardView rows={[{ player: "0xBBB0000000000000000000000000000000000002", bestScore: 50, rank: 1 }]} />
    </I18nProvider>,
  );
  expect(screen.getByText(/0xBBB0…0002/i).closest("li")).not.toHaveAttribute("aria-current");
});
