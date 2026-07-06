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

## CLAUDE.md から移設 (2026-07-06)

### 車両現在地・DVR動画 (`/vehicle-status` ページ、Refs ohishi-exp/browser-render-rust#14)

デジタコの日次バッチ CSV 由来の運行ログ (`useDtakologs`) とは別に、theearth-np.com の
VenusBridgeService (WCF `.svc`) を直接叩いて **より即時性の高い**現在地 / DVR 動画通知を
取得する機能。ohishi-exp/dtako-scraper#22 のブラウザレス化 (Chromium を使わず素の
`fetch()` でログイン) と同じ設計を踏襲。実装は ohishi-exp/nuxt-dtako-admin#75
(dtako-scraper 側の csvdata.zip ブラウザレス化) の姉妹実装。

#### アーキテクチャ

```
[browser] /vehicle-status ページ
  │ GET /api/vehicle/status | /api/vehicle/dvr | /api/vehicle/dvr-file
  ▼
[Worker server route]
  │ 1. requireAuth(event) で tenant_id を得る (auth-worker introspect)
  │ 2. DTAKO_ACCOUNTS (Cloudflare dashboard の Worker 設定、tenant_id→comp_id/user/pass) から企業を解決
  │ 3. theearth-venus-client.ts で theearth-np.com に直接ログイン
  │    (Cloudflare Workers は素の fetch() で外部サイトに直接到達可能。
  │     dtako-scraper-relay の Workers VPC binding は「Kagoya VPS の
  │     localhost:8081 に居る dtako-scraper」に到達するためのもので、
  │     theearth-np.com 自体は普通の公開サイトなので不要)
  │ 4. VenusBridgeService (`.svc`) へ JSON POST (VehicleStateTableForBranchEx /
  │    Monitoring_DvrNotification2) して結果を返す
  └ DVR 動画ファイルは決定論的パス
    `/dvrData/{comp_id}/{support_id}/{vehicleCD}/{filename}/{filename}.vdf`
    (NET780 独自コンテナ形式、cookie 付き GET) を fetch してそのまま配信
```

#### 現在地 (`VehicleStateTableForBranchEx`) は推測実装

issue #14 の調査時点で実データ PoC が無かったため、レスポンスの緯度経度フィールド名は
`GPSLatitude`/`Latitude`/`Lat` 等の候補を順に試す推測実装。解決できなかった場合は
`VehicleState.locationResolved = false` を返し、`raw` (生レスポンス) を必ず添えるので、
UI 側は「未解決」と表示しつつ raw で実際のフィールド名を確認できる (黙って間違った値を
出さない、「黙って200」対策の派生)。実データで確認できたら
`server/utils/theearth-venus-client.ts` の `LAT_FIELD_CANDIDATES`/`LNG_FIELD_CANDIDATES`
を実フィールド名に絞り込むこと。

DVR 動画通知 (`Monitoring_DvrNotification2`) はログインフォームと同様、実機ブラウザトレース
(issue #14) で `sort` パラメータ形式・決定論的パス・NET780 マジックバイトまで確認済み。

#### `DTAKO_ACCOUNTS` の投入 (未実施、運用側フォロー) — 意図的に Secrets Store を使わない

`server/utils/dtako-accounts.ts` は ohishi-exp/dtako-scraper の Rust 版・
ohishi-exp/nuxt-dtako-admin の `dtako-scraper-relay` DO と**同一 JSON shape**の
`DTAKO_ACCOUNTS` (`[{comp_id, user_name, user_pass, tenant_id}, ...]`) を
tenant_id で引く。

**この値は `wrangler.toml` にも Secrets Store にも置かない。** Cloudflare dashboard の
Worker (`nuxt-dtako-logs`) → Settings → Variables and Secrets から、**plain な
Environment Variable** (Secret ではなく Variable) として直接追加する運用にした。

- `wrangler.toml` に書かない (= git 履歴に平文パスワードを残さない)
- Secrets Store の書き込み専用 (write-only) ではなく、**dashboard で値を見ながら
  設定・確認できる** ことを優先した意図的な選択 (org 標準の「秘密は Secrets Store 経由」
  からの逸脱だが、他社の運行管理システムへのログイン情報という性質上、この repo の
  運用者が手元で見て編集できる利便性を優先した)
- `resolveDtakoAccount()` (`server/utils/dtako-accounts.ts`) は文字列 binding /
  Secrets Store binding (`.get()`) のどちらでも動く実装のため、**コード変更は不要**。
  dashboard の plain Environment Variable は `env.DTAKO_ACCOUNTS` に文字列として届く
- `wrangler deploy` は wrangler.toml に無い binding を消さない (dashboard 側で
  設定した env var / secret は deploy をまたいで保持される)

有効化する手順:

1. Cloudflare dashboard → Workers & Pages → `nuxt-dtako-logs` → Settings →
   Variables and Secrets → 「Add」→ **Type: Text** (Secret ではない) → Name:
   `DTAKO_ACCOUNTS` → Value に JSON 文字列を貼る → Deploy
2. staging で `/vehicle-status` を開き、`GET /api/vehicle/status` が 503 (未投入) から
   実データ取得に変わることを確認

未設定の間は `resolveDtakoAccount` が `null` を返し、`/api/vehicle/*` は 503 を返す
(fail-closed、クラッシュしない)。

#### 関連 issue

- Refs ohishi-exp/browser-render-rust#14 (VenusBridge / DVR / ETC ブラウザレス化調査)
- Refs ohishi-exp/dtako-scraper#22 (CSV ログブラウザレス化、姉妹実装)
- Related to ohishi-exp/nuxt_dtako_logs#32 (本機能の tracking issue)
- Related to ohishi-exp/nuxt-dtako-admin#75 (dtako-scraper 側の実装 PR)

### 過去の移行経緯 (2026-04、履歴として保持)

以前は rust-logi (Cloud Run gRPC service) を `cf-grpc-proxy` という別 Worker
(Durable Object + IAM token cache) 経由で叩いていたが、Cloud Run カスタムドメイン
マッピングでの DNS 解決・リダイレクトループ問題が頻発し、現在は **rust-alc-api を
`/alc-proxy` 経由で叩く方式 B に全面移行済み**。`cf-grpc-proxy/` ディレクトリはこの
repo に存在しない。当時のトラブルシュート詳細は git log (本ファイルの旧版) を参照。
