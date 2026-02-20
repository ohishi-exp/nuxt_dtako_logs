/**
 * Auth プラグイン (ブラウザ専用)
 *
 * アプリ起動時に JWT を復元/検証し、未認証ならログイン画面へリダイレクト
 * enforce: 'pre' で grpc-client.client.ts より先に実行される
 */
export default defineNuxtPlugin({
  name: 'auth',
  enforce: 'pre',
  setup() {
    const { consumeFragment, loadFromStorage, isAuthenticated, redirectToLogin, authState } = useAuth()

    // 1. URL fragment からトークン取得を試行（auth-worker リダイレクト後）
    const foundInFragment = consumeFragment()

    if (!foundInFragment) {
      // 2. localStorage から復元
      loadFromStorage()
    }

    // 3. 未認証 → ログイン画面へ
    if (!isAuthenticated.value) {
      redirectToLogin()
      return
    }

    // 4. 認証済み → 期限切れタイマーを設定
    const state = authState.value
    if (state) {
      const now = Math.floor(Date.now() / 1000)
      const msUntilExpiry = (state.expiresAt - now) * 1000
      if (msUntilExpiry > 0) {
        setTimeout(() => {
          if (!isAuthenticated.value) {
            redirectToLogin()
          }
        }, msUntilExpiry)
      }
    }
  },
})
