import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { I18nProvider } from "@/lib/i18n/I18nProvider.js";
import { HowToPlayModal } from "./HowToPlayModal.js";

function renderModal(
  props: { open: boolean; onClose?: () => void },
  locale: "en" | "es" = "en",
) {
  return render(
    <I18nProvider initialLocale={locale}>
      <HowToPlayModal open={props.open} onClose={props.onClose ?? (() => {})} />
    </I18nProvider>,
  );
}

describe("HowToPlayModal", () => {
  it("renders nothing when closed", () => {
    renderModal({ open: false });
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("renders the title and overview objective when open", () => {
    renderModal({ open: true });
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(
      screen.getByText(/Be the first to control 20 territories/i),
    ).toBeInTheDocument();
  });

  it("renders all five detail section titles", () => {
    renderModal({ open: true });
    expect(screen.getByText("Combat & dice")).toBeInTheDocument();
    expect(screen.getByText("Country cards & trading")).toBeInTheDocument();
    expect(screen.getByText("Objectives: common & secret")).toBeInTheDocument();
    expect(
      screen.getByText("Continents, territories & reinforcements"),
    ).toBeInTheDocument();
    expect(screen.getByText("How your score works (ranked)")).toBeInTheDocument();
  });

  it("moves focus to the close button on open", () => {
    renderModal({ open: true });
    expect(screen.getByRole("button", { name: /close/i })).toHaveFocus();
  });

  it("calls onClose when Escape is pressed", () => {
    const onClose = vi.fn();
    renderModal({ open: true, onClose });
    fireEvent.keyDown(document, { key: "Escape" });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("closes on backdrop click but not on panel click", () => {
    const onClose = vi.fn();
    renderModal({ open: true, onClose });
    fireEvent.click(screen.getByRole("dialog"));
    expect(onClose).not.toHaveBeenCalled();
    fireEvent.click(screen.getByTestId("howto-backdrop"));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("renders Spanish copy under the es locale", () => {
    renderModal({ open: true }, "es");
    expect(screen.getByText("Combate y dados")).toBeInTheDocument();
    expect(
      screen.getByText(/Sé el primero en controlar 20 territorios/i),
    ).toBeInTheDocument();
  });
});
