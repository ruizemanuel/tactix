import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { I18nProvider } from "@/lib/i18n/I18nProvider.js";

const mocks = vi.hoisted(() => ({ track: vi.fn() }));
vi.mock("@/lib/analytics/events.js", () => ({ track: mocks.track }));

import { HowToPlayButton } from "./HowToPlayButton.js";

function renderButton(variant: "lobby" | "compact" = "lobby") {
  return render(
    <I18nProvider initialLocale="en">
      <HowToPlayButton variant={variant} />
    </I18nProvider>,
  );
}

describe("HowToPlayButton", () => {
  it("opens the modal and fires the analytics event on click", () => {
    renderButton();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /how to play/i }));
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(mocks.track).toHaveBeenCalledWith("how_to_play_opened");
  });

  it("closes the modal from the close button", () => {
    renderButton();
    fireEvent.click(screen.getByRole("button", { name: /how to play/i }));
    fireEvent.click(screen.getByRole("button", { name: /close/i }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});
