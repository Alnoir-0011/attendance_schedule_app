import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const rootDir = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      "@": rootDir,
    },
  },
  test: {
    include: ["**/*.test.{ts,tsx}"],
    // tests/db は DB 接続が必要な統合テストのため通常実行から除外（npm run test:db で実行）
    exclude: ["node_modules", ".next", "e2e", "tests/db", "lib/generated"],
  },
});
