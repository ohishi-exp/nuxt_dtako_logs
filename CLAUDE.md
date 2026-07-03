# CLAUDE.md

dtako (デジタコ) 運行ログ表示 PWA。Nuxt 3 + Cloudflare Workers (Nitro `cloudflare_module`)。
backend は rust-alc-api を **`/api/proxy/*` → auth-worker `/alc-proxy/*`** (方式 B、
rust-alc-api#434 step 3) 経由で叩く。gRPC / cf-grpc-proxy は過去の実装で、現在の
コードには存在しない (下記「過去の移行経緯」参照)。

## 構成

| ファイル | 役割 |
|---|---|
| `pages/index.vue` | メイン画面 (運行ログ地図+テーブル、Google Map) |
| `pages/vehicle-status.vue` | 現在地・DVR動画通知 (下記参照) |
| `pages/tickets/*.vue` | dtako 起票 (tickets) 管理 |
| `composables/useDtakologs.ts` | 運行ログ (日次バッチ CSV 由来、GPS含む) の取得 |
| `composables/useVehicleStatus.ts` | 現在地・DVR動画通知の取得 |
| `server/api/proxy/[...path].ts` | `/api/proxy/*` → auth-worker `/alc-proxy/*` → rust-alc-api |
| `server/api/vehicle/*.get.ts` | theearth-np.com ブラウザレス直叩き (下記参照) |
| `server/middleware/auth.ts` | 未認証時 auth-worker ログイン画面へリダイレクト |
| `server/utils/auth.ts` | `/api/*` の introspect gate (defense-in-depth) |

## デプロイ

single-env (staging = prod)。`dtako-logs.ippoan.org` (主) / `ohishi2.mtamaramu.com`
(移行期間中の互換) の2ドメインに同じ worker を配信。PR merge / tag push どちらも
`wrangler deploy` (test.yml の deploy_*_script)。

## 環境変数・binding (`wrangler.toml`)

| key | 用途 |
|---|---|
| `NUXT_PUBLIC_AUTH_WORKER_URL` | auth-worker URL |
| `NUXT_ALC_API_URL` | rust-alc-api Cloud Run URL |
| `INTERNAL_SHARED_SECRET` (Secrets Store) | auth-worker introspect / `/alc-proxy` 転送の shared secret |
| `AUTH_WORKER` (service binding) | auth-worker への worker-to-worker fetch |

## 車両現在地・DVR動画 (`/vehicle-status` ページ、Refs ohishi-exp/browser-render-rust#14)

デジタコの日次バッチ CSV 由来の運行ログ (`useDtakologs`) とは別に、theearth-np.com の
VenusBridgeService (WCF `.svc`) を直接叩いて **より即時性の高い**現在地 / DVR 動画通知を
取得する機能。ohishi-exp/dtako-scraper#22 のブラウザレス化 (Chromium を使わず素の
`fetch()` でログイン) と同じ設計を踏襲。実装は ohishi-exp/nuxt-dtako-admin#75
(dtako-scraper 側の csvdata.zip ブラウザレス化) の姉妹実装。

### アーキテクチャ

```
[browser] /vehicle-status ページ
  │ GET /api/vehicle/status | /api/vehicle/dvr | /api/vehicle/dvr-file
  ▼
[Worker server route]
  │ 1. requireAuth(event) で tenant_id を得る (auth-worker introspect)
  │ 2. DTAKO_ACCOUNTS (Secrets Store, tenant_id→comp_id/user/pass) から企業を解決
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

### 現在地 (`VehicleStateTableForBranchEx`) は推測実装

issue #14 の調査時点で実データ PoC が無かったため、レスポンスの緯度経度フィールド名は
`GPSLatitude`/`Latitude`/`Lat` 等の候補を順に試す推測実装。解決できなかった場合は
`VehicleState.locationResolved = false` を返し、`raw` (生レスポンス) を必ず添えるので、
UI 側は「未解決」と表示しつつ raw で実際のフィールド名を確認できる (黙って間違った値を
出さない、「黙って200」対策の派生)。実データで確認できたら
`server/utils/theearth-venus-client.ts` の `LAT_FIELD_CANDIDATES`/`LNG_FIELD_CANDIDATES`
を実フィールド名に絞り込むこと。

DVR 動画通知 (`Monitoring_DvrNotification2`) はログインフォームと同様、実機ブラウザトレース
(issue #14) で `sort` パラメータ形式・決定論的パス・NET780 マジックバイトまで確認済み。

### `DTAKO_ACCOUNTS` の投入 (未実施、運用側フォロー)

`server/utils/dtako-accounts.ts` は ohishi-exp/dtako-scraper の Rust 版・
ohishi-exp/nuxt-dtako-admin の `dtako-scraper-relay` DO と**同一 JSON shape**の
`DTAKO_ACCOUNTS` secret (`[{comp_id, user_name, user_pass, tenant_id}, ...]`) を
tenant_id で引く。本 repo にはまだ Secrets Store binding が **無い** (`wrangler.toml`
に未追加)。有効化する手順:

1. `DTAKO_ACCOUNTS` を CF Secrets Store に投入 (既に dtako-scraper 側で同じ値を
   持っていれば使い回せる、`secret-inject` skill 使用)
2. `wrangler.toml` に `[[secrets_store_secrets]] binding = "DTAKO_ACCOUNTS"` を追加
3. staging で `/vehicle-status` を開き、`GET /api/vehicle/status` が 503 (未投入) から
   実データ取得に変わることを確認

binding 未設定の間は `resolveDtakoAccount` が `null` を返し、`/api/vehicle/*` は
503 を返す (fail-closed、クラッシュしない)。

### 関連 issue

- Refs ohishi-exp/browser-render-rust#14 (VenusBridge / DVR / ETC ブラウザレス化調査)
- Refs ohishi-exp/dtako-scraper#22 (CSV ログブラウザレス化、姉妹実装)
- Related to ohishi-exp/nuxt_dtako_logs#32 (本機能の tracking issue)
- Related to ohishi-exp/nuxt-dtako-admin#75 (dtako-scraper 側の実装 PR)

## 過去の移行経緯 (2026-04、履歴として保持)

以前は rust-logi (Cloud Run gRPC service) を `cf-grpc-proxy` という別 Worker
(Durable Object + IAM token cache) 経由で叩いていたが、Cloud Run カスタムドメイン
マッピングでの DNS 解決・リダイレクトループ問題が頻発し、現在は **rust-alc-api を
`/alc-proxy` 経由で叩く方式 B に全面移行済み**。`cf-grpc-proxy/` ディレクトリはこの
repo に存在しない。当時のトラブルシュート詳細は git log (本ファイルの旧版) を参照。

## テスト

- `npm test` (Vitest)
- `server/utils/theearth-venus-client.ts` / `dtako-accounts.ts` / `composables/useVehicleStatus.ts`
  は fetch をモックした pure ロジックテストで高カバレッジ (100% 到達済みだが
  `coverage_100.toml` の明示登録はまだしていない — 登録ファイルは
  `composables/useAuth.ts` 等の既存4ファイルのみ)
