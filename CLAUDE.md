# CLAUDE.md

## 参考リポジトリ

- `rust-logi_ref` - 参考実装
  - https://github.com/yhonda-ohishi-pub-dev/rust-logi

## 現在の移行作業

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
