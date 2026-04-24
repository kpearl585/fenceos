import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    include: ["src/**/__tests__/**/*.test.{ts,tsx}"],
    // jsdom lets hook tests use renderHook / DOM APIs. Pure-fn tests
    // don't care either way, and jsdom setup is cheap enough to run
    // for all tests rather than per-file configuration.
    environment: "jsdom",
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
});
