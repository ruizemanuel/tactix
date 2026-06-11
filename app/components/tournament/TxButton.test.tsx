import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { I18nProvider } from "@/lib/i18n/I18nProvider.js";
import { TxButton } from "./TxButton.js";

function renderBtn(props: { onRun: () => Promise<unknown>; onDone?: () => void }) {
  return render(
    <I18nProvider initialLocale="en">
      <TxButton label="Go" {...props} />
    </I18nProvider>,
  );
}

describe("TxButton lifecycle", () => {
  it("calls onDone on success and shows no error", async () => {
    const onRun = vi.fn().mockResolvedValue(undefined);
    const onDone = vi.fn();
    renderBtn({ onRun, onDone });
    fireEvent.click(screen.getByRole("button", { name: /go/i }));
    await waitFor(() => expect(onDone).toHaveBeenCalledTimes(1));
    expect(screen.queryByText(/transaction failed/i)).not.toBeInTheDocument();
  });

  it("shows the error and does NOT call onDone on failure", async () => {
    const onRun = vi.fn().mockRejectedValue(new Error("revert"));
    const onDone = vi.fn();
    renderBtn({ onRun, onDone });
    fireEvent.click(screen.getByRole("button", { name: /go/i }));
    await waitFor(() => expect(screen.getByText(/transaction failed/i)).toBeInTheDocument());
    expect(onDone).not.toHaveBeenCalled();
  });

  it("clears the error and succeeds on retry", async () => {
    const onRun = vi
      .fn()
      .mockRejectedValueOnce(new Error("revert"))
      .mockResolvedValueOnce(undefined);
    const onDone = vi.fn();
    renderBtn({ onRun, onDone });
    const btn = screen.getByRole("button", { name: /go/i });
    fireEvent.click(btn);
    await waitFor(() => expect(screen.getByText(/transaction failed/i)).toBeInTheDocument());
    fireEvent.click(btn);
    await waitFor(() => expect(onDone).toHaveBeenCalledTimes(1));
    expect(screen.queryByText(/transaction failed/i)).not.toBeInTheDocument();
  });
});
