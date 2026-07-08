import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

// Unit tests run in Node against pure logic (no Next runtime, no network — fetch
// is mocked). The `@/` alias mirrors tsconfig.json so tests import the same way
// app code does.
export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL(".", import.meta.url)),
    },
  },
  test: {
    environment: "node",
    include: ["app/**/*.test.ts", "app/**/*.test.tsx"],
    globals: false,
  },
});
