import "dotenv/config";
import { defineConfig } from "prisma/config";

// .env が無い環境（CI / Vercel など postinstall で prisma generate だけ動く場面）でも
// config の読み込みが失敗しないよう、未設定時はプレースホルダにフォールバックする。
// generate は DB に接続しないため実害はない。migrate / db seed など DB に接続する
// コマンドは .env（または環境変数で DATABASE_URL）がある環境でのみ実行すること。
const PLACEHOLDER_URL =
  "postgresql://placeholder:placeholder@localhost:5432/placeholder";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  engine: "classic",
  datasource: {
    url: process.env.DATABASE_URL ?? PLACEHOLDER_URL,
    // マイグレーションは直接接続（非プーラー）を使う
    directUrl:
      process.env.DIRECT_URL ?? process.env.DATABASE_URL ?? PLACEHOLDER_URL,
  },
});
