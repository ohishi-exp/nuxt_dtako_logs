/**
 * Auth プラグイン (ブラウザ専用)
 *
 * アプリ起動時に JWT を復元/検証し、未認証ならログイン画面へリダイレクト。
 * enforce: 'pre' で grpc-client.client.ts より先に実行される。
 *
 * 共通フロー (?lw= 保存 / fragment・storage・cookie 復元 / 未認証 redirect /
 * 期限切れタイマー) は @ippoan/auth-client の initAuthSession に集約済み
 * (Refs ippoan/auth-worker#257)。本 repo は単一組織運用のため組織一覧取得は
 * 行わない。
 */
import { initAuthSession } from '@ippoan/auth-client'

export default defineNuxtPlugin({
  name: 'auth',
  enforce: 'pre',
  setup() {
    initAuthSession({ fetchOrganizations: false })
  },
})
