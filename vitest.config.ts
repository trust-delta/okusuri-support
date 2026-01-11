import path from "node:path";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: "happy-dom",
    setupFiles: ["./vitest.setup.ts"],
    server: {
      deps: {
        inline: ["convex-test"],
      },
    },
    include: ["**/*.{test,spec}.{ts,tsx}"],
    exclude: [
      "**/node_modules/**",
      "**/dist/**",
      "**/.next/**",
      "**/convex/_generated/**",
      "**/e2e/**", // Playwright E2Eテストを除外
    ],
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      exclude: [
        "**/node_modules/**",
        "**/dist/**",
        "**/.next/**",
        "**/convex/_generated/**",
        "**/*.config.{ts,js}",
        "**/*.d.ts",
      ],
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./app/_shared"),
      "@convex": path.resolve(__dirname, "./convex"),
      "convex/_generated": path.resolve(__dirname, "./convex/_generated"),
    },
  },
});
