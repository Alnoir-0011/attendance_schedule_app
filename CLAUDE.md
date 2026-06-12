# CLAUDE.md

このファイルは本リポジトリで作業する Claude Code への開発指針です。

> 注: 雛形（Next.js 16 / React 19 / Tailwind v4 / shadcn/ui / Vitest 4 / Playwright）は作成済み。
> Node.js は **22.11.0**（`.node-version` で固定。nodenv 管理）。

## プロジェクト概要

ハイブリッド勤務の企業向けに、社員が「いつ出社するか」をカレンダーで表明し合う Web アプリ。

解決する課題:

- 出社して仕事したいが、相談できる先輩が出社しているか分からない
- 鍵を持つ人が出勤していないとオフィスに入れない
- リモートメインだが、誰かと出社日を合わせてランチに行きたい

そのため「誰がいつ出社するか」を可視化し、出社日を一言コメント付きで登録できる体験をコアに据える。

## 技術スタック

| 領域           | 採用                                           |
| -------------- | ---------------------------------------------- |
| フレームワーク | Next.js（App Router / TypeScript）フルスタック |
| DB / ORM       | PostgreSQL + Prisma                            |
| 認証           | Better Auth（メール + パスワード）             |
| カレンダーUI   | FullCalendar                                   |
| スタイリング   | Tailwind CSS + shadcn/ui                       |
| テスト         | Vitest（ユニット）+ Playwright（E2E）          |
| デプロイ       | Vercel                                         |

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
- ダークモード切替（shadcn/ui 由来の `.dark` 用 CSS 変数は定義済みだが、切替手段は未実装）

## データモデル（概要）

Better Auth 管理テーブル（`user` / `session` / `account` / `verification`）に加え、以下を定義する。

- **User**（Better Auth の user を拡張）
  - `role`: `ADMIN | MEMBER`（デフォルト `MEMBER`）
  - `hasKey`: boolean（鍵所持）
  - `dailyTransportCost`: int（1日あたり交通費・円）
  - `transportCostLimit`: int（個人ごとの月次上限・管理者設定）
  - `notifyEmail` / `notifySlack`: boolean（保持のみ）
- **AttendanceDay**（出社表明）
  - `userId`(FK), `date`, `comment`(nullable), `createdAt`, `updatedAt`
  - **ユニーク制約 `(userId, date)`**（同一日の重複登録を防止）
- **CompanyDay**（会社カレンダー: 出社日 / 休日マスタ）
  - `date`(unique), `type`: `OFFICE_DAY | HOLIDAY`, `label`(nullable), `createdAt`, `updatedAt`

日付の扱い:

- `AttendanceDay.date` / `CompanyDay.date` は**タイムゾーンを持たない日付（`@db.Date`）**で保持する。
- 「当月」などの日付判定は **JST 基準**で行う（国内利用前提）。

## ディレクトリ方針（予定）

```
app/                 # App Router（ページ・Server Actions）
  (auth)/login/      # ログインページ（ヘッダーなし）
  (main)/            # 認証済みページ群（layout.tsx で共通ヘッダーを表示）
    page.tsx         # ダッシュボード兼カレンダー
    profile/
    admin/
  api/auth/[...all]/ # Better Auth のルートハンドラ
components/
  app-header.tsx     # 共通ヘッダー（ブランド・ナビ・ユーザー名・ログアウト）
  nav-links.tsx      # ナビリンク（client。usePathname でアクティブ表示、admin リンクの出し分け）
  ui/                # shadcn/ui 生成物
lib/auth.ts          # Better Auth 設定
lib/session.ts       # セッション取得・認証ガード（getSession / requireAuth / requireAdmin）
lib/authz.ts         # 権限判定（isAdmin）
lib/actions/         # 共通 Server Actions（login / logout など）
lib/                 # 共通ユーティリティ（交通費集計など）
prisma/
  schema.prisma
  seed.ts
proxy.ts             # 認証ガード（Next.js 16 では middleware.ts でなく proxy.ts）
```

- `(main)` レイアウトの session チェックはヘッダー表示用。**各ページの `requireAuth` / `requireAdmin` は省略しない**（レイアウトはナビゲーション時に再実行されないため、ガードとして信頼しない）。

## 開発コマンド

```bash
npm run dev                 # 開発サーバー起動
npm run build               # 本番ビルド
npm run lint                # Lint（ESLint）
npm run test                # ユニットテスト（Vitest・1回実行。DB 不要）
npm run test:watch          # ユニットテスト（watch）
npm run test:db             # DB 統合テスト（.env.test の DB に migrate deploy してから実行）
npm run test:e2e            # E2E テスト（Playwright・chromium）
npm run format              # Prettier 整形
npm run format:check        # Prettier チェック
```

Prisma 系コマンド:

```bash
npx prisma migrate dev      # マイグレーション（開発用 DB に適用）
npx prisma db seed          # シード投入（admin 1名 + member 3名、当月の出社予定・会社カレンダー）
npx prisma studio           # データ確認
npx prisma generate         # クライアント生成（npm install 時に postinstall で自動実行）
```

注意点:

- Vitest の設定は `vitest.config.mts`（**拡張子 `.mts` 必須**。`package.json` に `"type": "module"` がないため、`.ts` だと CJS 読み込みになり ESM 専用依存（std-env 4）で起動エラーになる）。
- ユニットテストは `**/*.test.{ts,tsx}`（`e2e/` は除外）、E2E は `e2e/**/*.spec.ts` に配置する。
- React コンポーネントのユニットテスト環境（jsdom / `@testing-library/react` 等）は**未導入**。コンポーネントテストを書く際は先にこれらを導入し、`vitest.config.mts` に `environment` を設定すること。
- Playwright は chromium のみ・`reporter: "list"`（HTML レポートサーバーを自動起動しない）。`webServer` 設定により `npm run test:e2e` だけでサーバーが起動・終了する（ローカルは `npm run dev`、CI ではビルド済みの `npm run start` を使用）。
- E2E はシードユーザーでログインするため、**ローカル実行前に `npx prisma db seed` で開発用 DB をシード済みにしておく**こと。

## 認証（Better Auth）

- `lib/auth.ts` が本体設定。Server Actions から signIn/signOut するため **`nextCookies()` プラグインを必ず plugins の最後に置く**。
- ログイン/ログアウトは `lib/actions/auth.ts` の Server Action（`auth.api.signInEmail` / `signOut`）で行う。クライアント SDK は未使用。
- サーバー側ガードは `lib/session.ts`: `requireAuth()`（未認証→`/login`）/ `requireAdmin()`（ADMIN 以外→`/`）。React の `cache()` でリクエスト内メモ化済み。
- `proxy.ts`（Next.js 16 の命名。旧 middleware.ts は非推奨。<https://nextjs.org/docs/app/api-reference/file-conventions/proxy> 参照）は **Cookie の有無による楽観的ガードのみ**。ロール判定・改ざん検証はサーバー側ガードが担う。
- **proxy で「Cookie があれば `/login` → `/` へ戻す」をやってはいけない**。Cookie の存在はセッションの有効性を保証せず、無効な Cookie（シード再投入・セッション失効後の残留）があるとサーバー側ガードとの間で無限リダイレクトループになる。ログイン済みユーザーを `/login` から戻す処理はログインページ側（`getSession` で検証してから `redirect("/")`）で行う。
- 権限判定ロジックは `lib/authz.ts`（`isAdmin`）に置き、ユニットテスト対象にする。
- リダイレクト先は固定パスのみ。**「ログイン後に元のページへ戻す」（`?next=` 等）を実装する場合は、オープンリダイレクト防止のためサーバー側で遷移先を必ず検証する**こと。
- アプリ独自の `/api/` ルートハンドラを追加する場合は、proxy 任せにせず**ハンドラ自身でサーバー側の認証チェックを行う**こと（proxy の除外対象は `/api/auth/` 配下のみ）。

## カレンダー（FullCalendar）

- `components/attendance-calendar.tsx`（client）が本体。データ取得は `lib/actions/attendance.ts` の Server Action（`getCalendarData` / `registerAttendance` / `cancelAttendance`）。
- 日付は文字列 `"YYYY-MM-DD"` でクライアント⇔サーバーを受け渡し、サーバー側で `@db.Date` 相当（UTC 0時の Date）に変換する。
- データ取得は FullCalendar の **visible range 単位**（`datesSet` で前後月の表示分も含めて取得）。登録/取消後は保持している範囲で再取得する。
- イベント変換・コメント検証などの**純粋ロジックは `lib/attendance.ts`** に置き、ユニットテスト対象にする（UI やアクションに直接書かない）。
- 登録は upsert（既存なら**内容更新**として動作）、取消は deleteMany（未登録なら何もしない）。
- 出社・退社の予定時刻は**各々任意**（片方のみ可）。`AttendanceDay.startTime` / `endTime` に `"HH:mm"` 文字列（**30分刻み**）で保持し、検証はアプリ層（`validateTimeRange`）で行う。両方指定時は出社 < 退社。表示は `formatTimeRange`（`9:00〜17:30` / `10:00〜` / `〜16:00`）。
- E2E（`e2e/calendar.spec.ts`）はシードが使っていない日（20・25・26日）をテストごとに分けて使い、**変更したデータはテスト内で取り消して復元**する。シードの出社日は 2・9・16・24 日、休日は 20 日。E2E がログインする 在宅 次郎（member2）の登録は **9日のみ**。

## DB（Neon + Prisma）

- Neon プロジェクト: `attendance_schedule_app-db`（Vercel 連携の組織配下）。開発用は `main` ブランチ、テスト用は `test` ブランチ。
- `.env` に開発用、`.env.test` にテスト用の接続情報を置く（どちらも gitignore 対象。キーは `.env.example` 参照）。`DATABASE_URL` はプーラー経由、`DIRECT_URL` は直接接続（マイグレーション用）。
- 接続文字列には **`connect_timeout=15` を必ず付与**する。Neon 無料枠はアイドル時にコンピュートがサスペンドされ、コールドスタートがデフォルトタイムアウト（5秒）を超えて `P1001` になることがある（GitHub Secrets 側も同様）。
- Prisma クライアントは `lib/generated/prisma` に生成される（gitignore 対象。`postinstall` で自動生成）。アプリからは `lib/prisma.ts` の `prisma` を使う。
- DB 統合テストは `tests/db/` に置き、`npm run test:db` で実行する（`npm run test` からは除外。直列実行・タイムアウト長め）。
- シードは Better Auth の API（`auth.api.signUpEmail`）経由でユーザーを作成するため、シードユーザーで実際にログインできる（メール: `admin@example.com` / `member1〜3@example.com`、パスワードは `prisma/seed.ts` の `SEED_PASSWORD`）。シードは全削除→再投入の冪等動作。

## CI（GitHub Actions）

`.github/workflows/ci.yml` で main への push と Pull Request 時に、以下の5ジョブを実行する:

| ジョブ      | 内容                                                                                                  |
| ----------- | ----------------------------------------------------------------------------------------------------- |
| `lint`      | `npm run lint` / `npm run format:check`                                                               |
| `unit-test` | `npm run test`（Vitest）                                                                              |
| `db-test`   | `npm run test:db`。Secrets から `.env.test` を生成し、Neon の test ブランチに接続                     |
| `build`     | `npm run build`。`.next`（cache 除く）をアーティファクト `next-build` としてアップロード              |
| `e2e`       | `build` に依存。Neon の e2e ブランチに migrate + seed 後、`next start` 起動で `npm run test:e2e` 実行 |

- `lint` / `unit-test` / `db-test` / `build` は並列実行。`e2e` のみ `build` 完了後に実行される。
- `db-test` / `e2e` は共有 DB を使うため、それぞれ `concurrency: db-test` / `concurrency: e2e-db` で**ワークフロー実行間でも直列化**される（連続 push 時、間に挟まれた待機中ジョブはキャンセルされることがある）。
- 必要な Secrets: `TEST_DATABASE_URL` / `TEST_DIRECT_URL`（Neon test ブランチ）、`E2E_DATABASE_URL` / `E2E_DIRECT_URL`（Neon e2e ブランチ）。
- E2E 失敗時は `test-results/` がアーティファクトとして保存される。
- Node のバージョンは `.node-version` を参照する。CI を通らない変更はマージしない。

## 規約・注意点

- TypeScript を使用する。
- **admin 権限チェックはサーバー側で必須**（クライアントの表示制御だけに頼らない）。`/admin` 配下と管理系 Action は role=ADMIN を検証する。
- 出社登録は `(userId, date)` のユニーク制約で重複を防ぐ（upsert / delete で扱う）。
- 出社登録のコメントは上限 **100 文字**（暫定）でバリデーションする。
- 休日（`CompanyDay` の `HOLIDAY`）への出社登録は**警告を表示したうえで許可**する（登録自体は可能）。
- 交通費サマリは「当月の出社登録日数 × `dailyTransportCost`」で算出し、`transportCostLimit` の **80%（暫定）を超えた場合**にアラート表示する（**80% ちょうどでは表示しない**）。
- `transportCostLimit` が未設定（0）のユーザーはアラート判定の対象外（警告を表示しない）。
- 交通費の算出・アラート判定・JST 当月範囲は `lib/transport-cost.ts` の純関数（ユニットテスト対象）。`transportCostLimit` の編集は管理者のみ（#7）で、プロフィールでは表示のみ。
- E2E の `profile.spec.ts` は同一ユーザーの設定を書き換えるため**ファイル内直列実行**（`test.describe.configure({ mode: "serial" })`）。日付は 27日 を使用（カレンダー E2E の 20・25・26日 と分担）。
- 「テスト作成」の指示時はテストコードのみを生成する（実装コードは含めない）。
- 不要になったバックグラウンドプロセス（dev サーバー等）は終了させる。
