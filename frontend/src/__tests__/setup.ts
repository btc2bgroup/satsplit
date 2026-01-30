import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

afterEach(() => {
  cleanup();
});

// Provide a stub clipboard for jsdom
if (!navigator.clipboard) {
  Object.defineProperty(navigator, "clipboard", {
    value: {
      writeText: async () => {},
      readText: async () => "",
    },
    writable: true,
    configurable: true,
  });
}
