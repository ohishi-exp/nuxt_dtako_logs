# CLAUDE.md

## 参考リポジトリ

- `rust-logi_ref` - 参考実装
  - https://github.com/yhonda-ohishi-pub-dev/rust-logi

## 現在の移行作業

### cf-grpc-proxy エラー1001修正 (進行中)

#### 問題の概要
ブラウザからの gRPC リクエスト (`/api/grpc/...`) がエラーコード 1001 で失敗する。
バックエンド（CloudRun rust-logi）自体は正常。

#### アーキテクチャ
```
ブラウザ → ohishi2.mtamaramu.com → nuxt-dtako-logs Worker
  → Service Binding → cf-grpc-proxy Worker
  → Durable Object (GrpcProxyDO) → IAMトークン取得 → CloudRun (rust-logi)
```

#### 完了
- [x] Cloudflare Access が `/api/grpc/*` パスをブロックしていた → Bypass ポリシー追加済み
- [x] cf-grpc-proxy 内部から `a.run.app` ドメインの DNS 解決が失敗（error 1001 / HTTP 409）する問題を特定
  - Cloudflare Workers 内部の DNS リゾルバが `a.run.app` → `v2.run.app` CNAME チェーンを解決できない
  - `ghs.googlehosted.com` も同様に Workers から解決不可（error 1001）
- [x] DNS-only CNAME レコード追加: `cloudrun-backend.mtamaramu.com` → `ghs.googlehosted.com`（Cloudflare Dashboard）
- [x] GCP Cloud Run カスタムドメインマッピング追加: `cloudrun-backend.mtamaramu.com` → `rust-logi` サービス
  - SSL 証明書プロビジョニング完了（Google Trust Services WR3 発行）
  - `curl` 直接テストで Cloud Run に到達確認（403 = 認証なしで正常）
- [x] Google Search Console でドメイン所有権確認完了（TXT レコード追加済み）
- [x] cf-grpc-proxy のデバッグログ削除済み

#### 試行済み・失敗した方法
- **方法B（CNAME Proxied）**: Cloudflare のオリジン接続 SNI は URL ホスト名をそのまま使用し、CNAME ターゲットには変えない → 404 のまま
- **方法D（cf.resolveOverride）**: cf-grpc-proxy は Service Binding 経由でアクセスされゾーンルートにないため resolveOverride が無効 → error 1001
- **ghs.googlehosted.com 直接 fetch**: Workers の DNS リゾルバが解決不可 → error 1001
- **cloudrun-backend.mtamaramu.com（ghs.googlehosted.com CNAME）fetch**: Workers から fetch するとリダイレクトループ発生（同一ゾーン内ホスト名への fetch の問題の可能性）

#### 根本問題
Cloudflare Workers の `fetch()` で `cloudrun-backend.mtamaramu.com`（CNAME → `ghs.googlehosted.com`、DNS-only）にアクセスすると **リダイレクトループ** が発生する。`curl` では正常（403）。Workers 固有の問題。

#### 未完了・次に試すべきこと
1. **リダイレクトループの原因調査**
   - Workers の fetch から `cloudrun-backend.mtamaramu.com` への接続がなぜリダイレクトループになるか不明
   - CNAME を `ghs.googlehosted.com` ではなく `rust-logi-566bls5vfq-an.a.run.app` に戻してみる（カスタムドメインマッピングがあれば Cloud Run が `cloudrun-backend.mtamaramu.com` を認識する可能性）
     - ただし TLS 証明書の問題あり（`a.run.app` サーバーに `cloudrun-backend.mtamaramu.com` 証明書がない）
2. **別アプローチの検討**
   - **外部プロキシ経由**: Cloud Run の前に GCP Load Balancer を置く（サーバーレス NEG）
   - **Cloudflare Tunnel**: cloudflared を GCP 上で動かし、Cloudflare 経由でアクセス
   - **Workers TCP connect()**: `connect()` API で直接 TCP/TLS 接続し SNI を制御（複雑）
3. **リクエストボディが 0 バイトになる問題** - Nuxt サーバールート (`server/api/grpc/[...path].ts`) の `readRawBody()` で body が空になる（別問題、後で対処）

#### 現在のコード状態
- `cf-grpc-proxy/src/index.ts` - `RUST_LOGI_PROXY_URL`（cloudrun-backend.mtamaramu.com）経由で Cloud Run にプロキシ
- `cf-grpc-proxy/wrangler.toml` - `RUST_LOGI_URL` + `RUST_LOGI_PROXY_URL` 設定済み
- Cloudflare SSL/TLS: **Full (Strict)** に変更済み（Flexible からの変更でリダイレクトループ解消）
- Cloudflare DNS: `cloudrun-backend.mtamaramu.com` CNAME → `ghs.googlehosted.com`（DNS-only）
- Cloudflare DNS: TXT `mtamaramu.com` → `google-site-verification=PO4rETjgCuU6-9NJESs2xoKVhXPieRphXRHueVQJ8eU`
- GCP Cloud Run: `cloudrun-backend.mtamaramu.com` → `rust-logi` ドメインマッピング（SSL 証明書発行済み）
- Cloudflare Access: `/api/grpc/*` に Bypass ポリシー設定済み

#### 関連ファイル
- `cf-grpc-proxy/src/index.ts` - gRPC プロキシ本体（Durable Object + IAM トークンキャッシュ）
- `cf-grpc-proxy/wrangler.toml` - Worker 設定（環境変数、DO バインディング）
- `server/api/grpc/[...path].ts` - Nuxt サーバールート（Service Binding 経由で cf-grpc-proxy に転送）
- `wrangler.toml` - Nuxt Worker 設定（Service Binding `GRPC_PROXY_SERVICE` → `cf-grpc-proxy`）

#### 確認コマンド
```bash
# cf-grpc-proxy デプロイ
cd cf-grpc-proxy && npx wrangler deploy

# ログ監視
wrangler tail cf-grpc-proxy --format=json

# テスト（workers.dev 経由）
curl -X POST 'https://nuxt-dtako-logs.m-tama-ramu.workers.dev/api/grpc/logi.dtakologs.DtakologsService/CurrentListAll' \
  -H 'Content-Type: application/grpc-web+proto' -H 'X-Grpc-Web: 1' \
  --data-binary $'\x00\x00\x00\x00\x00' -s -w '\nHTTP: %{http_code}\n'

# Cloud Run カスタムドメイン直接テスト（curl からは正常動作する）
curl -X POST 'https://cloudrun-backend.mtamaramu.com/logi.dtakologs.DtakologsService/CurrentListAll' \
  -H 'Content-Type: application/grpc-web+proto' -H 'X-Grpc-Web: 1' \
  --data-binary $'\x00\x00\x00\x00\x00' -s -w '\nHTTP: %{http_code}\n' -D -

# ドメインマッピング状態確認
gcloud beta run domain-mappings describe --domain cloudrun-backend.mtamaramu.com --region asia-northeast1
```

#### 引き継ぎサマリー
**解決済み**: SSL/TLS モードが Flexible だったためリダイレクトループが発生していた。Full (Strict) に変更後、`cloudrun-backend.mtamaramu.com` への fetch で Cloud Run に正常到達（HTTP 200、gRPC レスポンス受信）。

**現在のコード**: `RUST_LOGI_PROXY_URL`（`cloudrun-backend.mtamaramu.com`）経由で Cloud Run にプロキシ。

**残課題**:
- ブラウザからの E2E テスト未実施
- リクエストボディが 0 バイトになる問題（Nuxt サーバールート `readRawBody()` の問題、別途対処）

---

### 詳細ページのレイアウト調整 (進行中)

#### 完了
- [x] マップと詳細ログを中央揃えに変更 (`justify-center`)
- [x] マップと詳細ログを一つの枠（`border border-white`）に統合
- [x] 横並びレイアウトに変更（`flex`）
- [x] マップとテーブルの間に区切り線追加（`border-r border-white`）
- [x] マップの幅を485pxに調整（メインテーブルとの幅合わせ）

#### 未完了
1. **枠のズレ修正** - マップ+詳細テーブルの枠とメインテーブルの枠がまだ完全に揃っていない可能性あり
   - 詳細エリア: 約1294px（マップ485px + テーブル807px）
   - メインテーブル: 約1294px
   - 幅の微調整が必要な場合あり

#### 関連ファイル
- `pages/index.vue` - メインページ（15-43行目が詳細エリア、44行目以降がメインテーブル）

#### 現在の構造
```html
<!-- 詳細エリア（マップ+ログテーブル） -->
<div class="flex justify-center hidden" ref="hiddenEl">
  <div class="flex border border-white mx-auto lg:w-max">
    <div ref="gmap" class="h-[500px] min-w-[485px] border-r border-white"></div>
    <UTable ... wrapper: 'h-[500px] overflow-auto' ...>
  </div>
</div>

<!-- メインテーブル -->
<UTable ... wrapper: 'max-full h-screen border border-white lg:w-max mx-auto' ...>
```

#### 確認コマンド
```bash
# ローカル確認
npm run dev

# デプロイ
npm run deploy

# DevToolsで幅確認
const tables = document.querySelectorAll('table');
tables.forEach((t, i) => console.log(`テーブル${i}:`, t.parentElement?.offsetWidth));
```

#### デプロイURL
- https://nuxt-dtako-logs.m-tama-ramu.workers.dev
