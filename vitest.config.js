import { defineConfig } from "vitest/config";
import tsconfigPaths from "vite-tsconfig-paths";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react(), tsconfigPaths()],
  test: {
    globals: true,
    setupFiles: ["./tests/setup.js"],
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html", "lcov"],
      reportsDirectory: "./coverage",
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 80,
        statements: 80,
      },
      exclude: [
        "node_modules/**",
        "build/**",
        "public/**",
        "**/*.config.*",
        "**/entry.*",
        "tests/**",
        "extensions/**",
        "scripts/**",
        "docs/**",
        ".cache/**",
        "**/error.server.*",
      ],
    },
    include: [
      "tests/unit/**/*.test.{js,jsx,ts,tsx}",
      "tests/integration/**/*.test.{js,jsx,ts,tsx}",
    ],
    exclude: ["node_modules/**", "build/**", "tests/e2e/**"],
    environmentMatchGlobs: [
      // Server-side utilities run in Node environment
      ["tests/unit/utils/**", "node"],
      ["tests/integration/**", "node"],
      // React component tests run in jsdom
      ["tests/unit/components/**", "jsdom"],
    ],
    environment: "node",
    testTimeout: 10000,
    hookTimeout: 10000,
    reporters: ["verbose", "json"],
    outputFile: {
      json: "./test-results/vitest-results.json",
    },
  },
});
