import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const rootDir = path.dirname(fileURLToPath(import.meta.url));

// DB 統合テスト用設定（npm run test:db で .env.test の DATABASE_URL に接続して実行）
export default defineConfig({
  resolve: {
    alias: {
      "@": rootDir,
    },
  },
  test: {
    include: ["tests/db/**/*.test.ts"],
    // 各テストが DB 状態を共有するため、単一ワーカーで直列実行する
    // （Vitest 4 では poolOptions/singleFork は廃止。maxWorkers: 1 で代替）
    fileParallelism: false,
    maxWorkers: 1,
    testTimeout: 30_000,
    hookTimeout: 120_000,
  },
});
