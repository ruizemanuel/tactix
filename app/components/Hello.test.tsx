import { render, screen } from "@testing-library/react";
import { expect, test } from "vitest";
import { Hello } from "./Hello.js";

test("renders the name", () => {
  render(<Hello name="TEG" />);
  expect(screen.getByText("Hello TEG")).toBeInTheDocument();
});
