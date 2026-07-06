# CLAUDE.md

dtako (デジタコ) 運行ログ表示 PWA。Nuxt 3 + Cloudflare Workers (Nitro `cloudflare_module`)。
backend は rust-alc-api を **`/api/proxy/*` → auth-worker `/alc-proxy/*`** (方式 B、
rust-alc-api#434 step 3) 経由で叩く。gRPC / cf-grpc-proxy は過去の実装で現在のコードに
存在しない。詳細・移行経緯は `.claude/skills/nuxt_dtako_logs-map/SKILL.md` 参照。

## 構成

| ファイル | 役割 |
|---|---|
| `pages/index.vue` | メイン画面 (運行ログ地図+テーブル、Google Map) |
| `pages/vehicle-status.vue` | 現在地・DVR動画通知 (詳細は map skill) |
| `pages/tickets/*.vue` | dtako 起票 (tickets) 管理 |
| `composables/useDtakologs.ts` | 運行ログ (日次バッチ CSV 由来) の取得 |
| `server/api/proxy/[...path].ts` | `/api/proxy/*` → auth-worker `/alc-proxy/*` |
| `server/middleware/auth.ts` | 未認証時 auth-worker ログイン画面へリダイレクト |

## デプロイ

single-env (staging = prod)。`dtako-logs.ippoan.org` (主) / `ohishi2.mtamaramu.com`
(互換) の2ドメインに同じ worker を配信。PR merge / tag push どちらも `wrangler deploy`。

## 環境変数・binding (`wrangler.toml`)

| key | 用途 |
|---|---|
| `NUXT_PUBLIC_AUTH_WORKER_URL` / `NUXT_ALC_API_URL` | auth-worker / rust-alc-api URL |
| `INTERNAL_SHARED_SECRET` (Secrets Store) | `/alc-proxy` 転送の shared secret |
| `AUTH_WORKER` (service binding) | auth-worker への worker-to-worker fetch |

## `DTAKO_ACCOUNTS` ★strict (org 標準からの意図的逸脱)

`DTAKO_ACCOUNTS` (tenant_id→comp_id/user/pass) は **`wrangler.toml` にも Secrets Store
にも書かない**。Cloudflare dashboard の Worker Settings → Variables and Secrets から
**plain な Environment Variable** (Secret ではない) として直接投入する。手順・理由は
map skill 参照。未設定の間 `/api/vehicle/*` は 503 (fail-closed、クラッシュしない)。

## テスト

- `npm test` (Vitest)

詳細は `.claude/skills/nuxt_dtako_logs-map/SKILL.md` 参照。
