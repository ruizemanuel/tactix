import { act, render, renderHook, screen } from "@testing-library/react";
import { beforeEach, expect, test } from "vitest";
import { I18nProvider, useI18n } from "./I18nProvider.js";
import { translate } from "./dictionaries.js";

beforeEach(() => localStorage.clear());

test("translate fills placeholders and falls back to English then the key", () => {
  expect(translate("es", "action.place", { n: 3 })).toBe("Colocar 3 ejércitos");
  expect(translate("es", "newGame")).toBe("Nueva partida");
  expect(translate("es", "totally.missing.key")).toBe("totally.missing.key");
});

function wrapper({ children }: { children: React.ReactNode }) {
  return <I18nProvider>{children}</I18nProvider>;
}

test("defaults to English and switches locale", () => {
  const { result } = renderHook(() => useI18n(), { wrapper });
  expect(result.current.locale).toBe("en");
  expect(result.current.t("phase.reinforce")).toBe("Reinforce");
  act(() => result.current.setLocale("es"));
  expect(result.current.locale).toBe("es");
  expect(result.current.t("phase.reinforce")).toBe("Refuerzo");
  expect(localStorage.getItem("teg.locale")).toBe("es");
});

test("renders translated children", () => {
  function Demo() {
    const { t } = useI18n();
    return <span>{t("game.you")}</span>;
  }
  render(
    <I18nProvider initialLocale="es">
      <Demo />
    </I18nProvider>,
  );
  expect(screen.getByText("Vos")).toBeInTheDocument();
});
