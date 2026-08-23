import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

export default defineConfig({
  resolve: {
    alias: {
      "@engine": fileURLToPath(new URL("./src/engine", import.meta.url)),
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  test: {
    projects: [
      {
        resolve: {
          alias: {
            "@engine": fileURLToPath(new URL("./src/engine", import.meta.url)),
            "@": fileURLToPath(new URL("./src", import.meta.url)),
          },
        },
        test: {
          name: "node",
          environment: "node",
          include: ["src/**/*.test.ts"],
        },
      },
      {
        resolve: {
          alias: {
            "@engine": fileURLToPath(new URL("./src/engine", import.meta.url)),
            "@": fileURLToPath(new URL("./src", import.meta.url)),
          },
        },
        test: {
          name: "dom",
          environment: "jsdom",
          include: ["src/**/*.dom.test.tsx"],
        },
      },
    ],
    coverage: {
      provider: "v8",
      include: ["src/engine/**/*.ts", "src/lib/**/*.ts"],
      exclude: [
        "src/engine/**/*.test.ts",
        "src/engine/**/fixtures/**",
        "src/lib/**/*.test.ts",
        "src/lib/**/__tests__/**",
      ],
      thresholds: {
        statements: 80,
        branches: 75,
        functions: 80,
        lines: 80,
        "src/engine/**": {
          statements: 95,
          branches: 90,
          functions: 95,
          lines: 95,
        },
      },
    },
  },
});
