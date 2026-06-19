import "@testing-library/jest-dom/vitest";

// react-zoom-pan-pinch uses ResizeObserver which jsdom does not implement.
if (typeof globalThis.ResizeObserver === "undefined") {
  globalThis.ResizeObserver = class ResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
}
