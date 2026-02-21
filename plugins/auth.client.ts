/**
 * Auth プラグイン (ブラウザ専用)
 *
 * アプリ起動時に JWT を復元/検証し、未認証ならログイン画面へリダイレクト
 * enforce: 'pre' で grpc-client.client.ts より先に実行される
 *
 * LINE WORKS 自動ログイン:
 * ?lw=<domain> パラメータを検出してドメインを保存し、
 * redirectToLogin() が LINE WORKS OAuth を直接開始する
 */
export default defineNuxtPlugin({
  name: 'auth',
  enforce: 'pre',
  setup() {
    const { consumeFragment, loadFromStorage, recoverFromCookie, isAuthenticated, redirectToLogin, authState, saveLwDomain } = useAuth()

    // 0. ?lw=<domain> パラメータ → LINE WORKS ドメイン保存
    const urlParams = new URLSearchParams(window.location.search)
    const lwParam = urlParams.get('lw')
    if (lwParam) {
      saveLwDomain(lwParam)
      // URL からパラメータを除去
      urlParams.delete('lw')
      const newSearch = urlParams.toString()
      const cleanUrl = window.location.pathname + (newSearch ? `?${newSearch}` : '') + window.location.hash
      history.replaceState(null, '', cleanUrl)
    }

    // 1. URL fragment からトークン取得を試行（auth-worker リダイレクト後）
    const foundInFragment = consumeFragment()

    if (foundInFragment) {
      // lw_domain cookie → localStorage 同期（サーバーミドルウェアが設定した cookie を永続化）
      const lwCookie = document.cookie.split('; ').find(c => c.startsWith('lw_domain='))
      if (lwCookie) {
        const domain = decodeURIComponent(lwCookie.split('=')[1] || '')
        if (domain) saveLwDomain(domain)
      }
      // ?lw_callback パラメータを URL からクリーンアップ
      const currentUrl = new URL(window.location.href)
      if (currentUrl.searchParams.has('lw_callback')) {
        currentUrl.searchParams.delete('lw_callback')
        const cleanPath = currentUrl.pathname + (currentUrl.search || '')
        history.replaceState(null, '', cleanPath)
      }
    }

    if (!foundInFragment) {
      // 2. localStorage から復元
      loadFromStorage()
    }

    // 2.5. Cookie からの復旧（トップページや他アプリで認証済みの場合）
    if (!isAuthenticated.value) {
      recoverFromCookie()
    }

    // 3. 未認証 → ログイン画面へ（redirectToLogin 内で lw_domain をチェック）
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
