# CLAUDE.md

このファイルは本リポジトリで作業する Claude Code への開発指針です。

> 注: 本プロジェクトはまだ雛形作成前です。記述は確定済みの設計方針に基づきます。
> アプリ雛形を作成したら、実際のディレクトリ構成・コマンド・依存バージョンを反映して本ファイルを更新してください。

## プロジェクト概要

ハイブリッド勤務の企業向けに、社員が「いつ出社するか」をカレンダーで表明し合う Web アプリ。

解決する課題:

- 出社して仕事したいが、相談できる先輩が出社しているか分からない
- 鍵を持つ人が出勤していないとオフィスに入れない
- リモートメインだが、誰かと出社日を合わせてランチに行きたい

そのため「誰がいつ出社するか」を可視化し、出社日を一言コメント付きで登録できる体験をコアに据える。

## 技術スタック

| 領域 | 採用 |
|------|------|
| フレームワーク | Next.js（App Router / TypeScript）フルスタック |
| DB / ORM | PostgreSQL + Prisma |
| 認証 | Better Auth（メール + パスワード） |
| カレンダーUI | FullCalendar |
| スタイリング | Tailwind CSS + shadcn/ui |
| テスト | Vitest（ユニット）+ Playwright（E2E） |
| デプロイ | Vercel |

サーバー処理は **Server Actions** を基本とし、必要に応じて Route Handler（`app/api/...`）を併用する。

インフラ方針:

- デプロイ先は **Vercel** を想定し、アプリ自体に **Docker は使用しない**。
- DB は **Neon / Supabase 等のマネージド Postgres 無料枠**を使用する。
- DB を使うテストは開発用と分離したテスト用 DB（Neon のブランチ機能 or 別 DB）を `DATABASE_URL` の切替で使用する。

## MVP スコープ

含む:

- メール + パスワードによるログイン
- 月表示カレンダー（全員の出社予定・コメントを表示）
- 自分の出社日登録 / 取消（一言コメント付き）
- プロフィール: 1日あたり交通費の設定、通知オン/オフ設定（値の保持のみ）、当月の交通費サマリと上限接近アラート（**アプリ内表示**）
- 管理画面（admin ロール限定）: ユーザー追加・編集（氏名/メール/初期パスワード/ロール/鍵所持/個人上限交通費）、管理者によるパスワード再設定、会社カレンダー（出社日・休日）の指定
- ユーザー登録は **管理者がユーザーを追加**する方式（自由サインアップなし）

非目標（= ロードマップ。MVP では実装しない）:

- メール / Slack の通知**配信**（設定値の保持までで止める）
- 交通費アラートの通知（MVP はアプリ内表示のみ）
- OAuth（Google / Slack）ログイン
- パスワードリセットの自己フロー（MVP は管理者による再設定で代替）

## データモデル（概要）

Better Auth 管理テーブル（`user` / `session` / `account` / `verification`）に加え、以下を定義する。

- **User**（Better Auth の user を拡張）
  - `role`: `ADMIN | MEMBER`（デフォルト `MEMBER`）
  - `hasKey`: boolean（鍵所持）
  - `dailyTransportCost`: int（1日あたり交通費・円）
  - `transportCostLimit`: int（個人ごとの月次上限・管理者設定）
  - `notifyEmail` / `notifySlack`: boolean（保持のみ）
- **AttendanceDay**（出社表明）
  - `userId`(FK), `date`, `comment`(nullable), `createdAt`
  - **ユニーク制約 `(userId, date)`**（同一日の重複登録を防止）
- **CompanyDay**（会社カレンダー: 出社日 / 休日マスタ）
  - `date`(unique), `type`: `OFFICE_DAY | HOLIDAY`, `label`(nullable)

日付の扱い:

- `AttendanceDay.date` / `CompanyDay.date` は**タイムゾーンを持たない日付（`@db.Date`）**で保持する。
- 「当月」などの日付判定は **JST 基準**で行う（国内利用前提）。

## ディレクトリ方針（予定）

```
app/                 # App Router（ページ・Server Actions）
  (auth)/login/
  page.tsx           # ダッシュボード兼カレンダー
  profile/
  admin/
lib/auth.ts          # Better Auth 設定
lib/                 # 共通ユーティリティ（権限判定・交通費集計など）
prisma/
  schema.prisma
  seed.ts
middleware.ts        # 認証 / admin ガード
```

## 開発コマンド（雛形作成後に確定）

```bash
npm run dev                 # 開発サーバー起動
npx prisma migrate dev      # マイグレーション
npx prisma db seed          # シード投入
npx prisma studio           # データ確認
npm run lint                # Lint
```

## 規約・注意点

- TypeScript を使用する。
- **admin 権限チェックはサーバー側で必須**（クライアントの表示制御だけに頼らない）。`/admin` 配下と管理系 Action は role=ADMIN を検証する。
- 出社登録は `(userId, date)` のユニーク制約で重複を防ぐ（upsert / delete で扱う）。
- 出社登録のコメントは上限 **100 文字**（暫定）でバリデーションする。
- 休日（`CompanyDay` の `HOLIDAY`）への出社登録は**警告を表示したうえで許可**する（登録自体は可能）。
- 交通費サマリは「当月の出社登録日数 × `dailyTransportCost`」で算出し、`transportCostLimit` の **80%（暫定）を超えた場合**にアラート表示する（**80% ちょうどでは表示しない**）。
- `transportCostLimit` が未設定（0）のユーザーはアラート判定の対象外（警告を表示しない）。
- 「テスト作成」の指示時はテストコードのみを生成する（実装コードは含めない）。
- 不要になったバックグラウンドプロセス（dev サーバー等）は終了させる。
