---
name: nuxt_dtako_logs-map
generated-from: nuxt_dtako_logs:1fe3bb61734cb2f8f97f7ce597c771e3a5ded504
paths: [components/, composables/, pages/, server/]
description: ippoan/nuxt_dtako_logs (デジタコ運行ログ表示 Nuxt 4 PWA / Cloudflare Workers) の構造ナビゲーション。デジタルタコグラフ (dtako) の運行ログを地図 + テーブルで表示し rust-alc-api へ proxy する PWA。single page + Google Map・REST proxy・auth middleware の配置と、CLAUDE.md の大幅 drift を 1 枚にまとめる。トリガー:「nuxt_dtako_logs」「nuxt-dtako-logs」「デジタコ」「dtako」「運行ログ」「タコグラフ」「ohishi2.mtamaramu.com」「useDtakologs」等。
---

# nuxt_dtako_logs-map — ippoan/nuxt_dtako_logs 構造ナビゲーション

デジタルタコグラフ (dtako) の運行ログを地図 + テーブルで表示する Nuxt 4 PWA。
Cloudflare Workers (`cloudflare-module` nitro preset) にデプロイ。トップレベル直下が
Nuxt root (app/ ディレクトリは無く `pages/` `components/` `server/` が直置き)。
実質 single page (`pages/index.vue`) のログビューア。

> ここは索引。細部 (関数シグネチャ・行) は repo 側が正。
> frontmatter の `generated-from` が現在の tree-sha とズレたら
> session-start-skill-coverage hook が再生成を促す → tree-sha を更新する。

## 区画

| 区画 | 主要ファイル | 役割 |
|---|---|---|
| **pages** | `pages/index.vue` | 唯一のページ。Google Map + ログテーブル (詳細エリア + メインテーブル) |
| **components** | `components/allState.vue` `components/date/{ShortSt,DataDatetimeSt,ShortDatetimeSt,ShortShortSt}.vue` | 状態表示 / 日時フォーマット表示 |
| **composables** | `composables/useDtakologs.ts` `composables/useAuth.ts` | 運行ログ取得 / 認証 |
| **server route** | `server/api/proxy/[...path].ts` | `/api/proxy/*` → auth-worker `/alc-proxy/*` → rust-alc-api `/api/*` REST proxy。#434 step 3 で `createAuthWorkerProxyHandler` (方式 B、AUTH_WORKER service binding に thin-forward) に置換 |
| **server 認証** | `server/middleware/auth.ts` | cookie 未認証なら auth-worker へ 302 |
| **plugins** | `plugins/auth.client.ts` `plugins/google-map.client.ts` | client 認証初期化 / Google Maps loader |

## entrypoint

- **nitro**: `nuxt.config.ts` → `nitro.preset = "cloudflare-module"`、`main = ./.output/server/index.mjs` (wrangler.toml)。
- **REST proxy**: `/api/proxy/[...path].ts` → auth-worker `/alc-proxy/*` → `${alcApiUrl}/api/${path}`。**#434 step 3 で `@ippoan/auth-client/server` の `createAuthWorkerProxyHandler` に置換** (方式 B、旧 `createIdentityProxyHandler` = 方式 A を置換)。consumer は introspect / ACL / OIDC mint を持たず、`X-Alc-Proxy-Secret` (=INTERNAL_SHARED_SECRET、consumer proof) + `X-Alc-Proxy-Origin` + browser JWT を付けて **AUTH_WORKER service binding に丸投げ**するだけ。auth-worker (ippoan/auth-worker#308) が secret を constant-time 検証 → JWT 検証 + ACL + OIDC mint + `X-Tenant-ID`/`X-User-*` 注入 → rust-alc-api (#441 で dumb backend 化) に転送。SA key は consumer 側から完全排除。`INTERNAL_SHARED_SECRET` は Secrets Store binding (.get())、`AUTH_WORKER` service binding は必須 (未設定は 503)。carins (ippoan/nuxt-pwa-carins#40) と同型。
- **wrangler**: top-level = prod (`nuxt-dtako-logs`, **ohishi2.mtamaramu.com** custom domain)。`[env.staging]` = `nuxt-dtako-logs-staging` (route 無し)。`NUXT_ALC_API_URL` / `NUXT_PUBLIC_AUTH_WORKER_URL` を env で切替。
- **Google Map**: `plugins/google-map.client.ts` + `runtimeConfig.public.googlemapKey` (空既定、実値は env)。

## gotcha

- **CLAUDE.md は大幅 drift (要注意)**: CLAUDE.md は「cf-grpc-proxy エラー1001 / Service Binding / GrpcProxyDO / Durable Object / IAM トークン / cloudrun-backend.mtamaramu.com」という gRPC-proxy 移行の進捗メモだが、**実コードにその構造は無い**。`cf-grpc-proxy/` ディレクトリも `server/api/grpc/` も現存せず、今は `server/api/proxy/[...path].ts` の **シンプルな rust-alc-api REST proxy**。CLAUDE.md は過去の handover 残骸なのでコードを正とする。
- repo dir 名は **アンダースコア** `nuxt_dtako_logs` だが、wrangler の worker 名は **ハイフン** `nuxt-dtako-logs`。custom domain は `ohishi2.mtamaramu.com` (他兄弟の `*.ippoan.org` と違う)。
- `build.transpile: ['@ippoan/auth-client']` 必須 (ESM 解決のため)。`@vite-pwa/nuxt` で PWA (share_target / file_handlers は車検証アプリ由来のまま流用)。
- HMR は `vite:extendConfig` hook で `wss` + `path: hmr/` + `clientPort: 443` を強制 (tunnel dev 用)。

## CCoW/CI から見た立ち位置

- rust-alc-api を叩く consumer 群の 1 つ (carins / nuxt-trouble / alc-app の兄弟)。認証は `@ippoan/auth-client` + auth-worker (auth.ippoan.org)。
- CI: `.github/workflows/{test,tag-release}.yml` (frontend-ci 系)。`coverage_100.toml` + `docker-compose.test.yml` (rust-alc-api コンテナで live テスト可能)。`tests/` に composables/server/integration テストあり。

## 関連 skill

- `auth-worker-map` — `@ippoan/auth-client` / logi_auth_token cookie の発行元
- `nuxt-pwa-carins-map` / `nuxt-trouble-map` / `alc-app-map` — 同じ rust-alc-api consumer の兄弟 repo (carins と proxy 実装がほぼ同型)
- `repo-map` / `cross-repo-symbol-index` — この map の運用方針 (generated-from 鮮度)
