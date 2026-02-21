/**
 * サーバーサイド認証ミドルウェア
 *
 * logi_auth_token cookie がなければ auth-worker のログイン画面へ 302 リダイレクト。
 * HTML 描画前にリダイレクトするため、未認証時にページが一瞬見えるのを防ぐ。
 *
 * LINE WORKS 自動ログイン:
 * - ?lw=<domain> → auth-worker OAuth 直接リダイレクト（ログイン画面スキップ）
 * - lw_domain cookie → 次回以降も自動ログイン
 * - ?lw_callback → OAuth コールバック戻り（リダイレクトスキップ）
 */

/** ホスト名から親ドメインを取得（cross-subdomain cookie 用） */
function getParentDomainFromHost(hostname: string): string | undefined {
  const parts = hostname.split('.')
  return parts.length > 2 ? '.' + parts.slice(-2).join('.') : undefined
}

export default defineEventHandler((event) => {
  const url = getRequestURL(event)
  if (url.pathname.startsWith('/api/')) return

  const cookie = getCookie(event, 'logi_auth_token')
  if (cookie) return

  const config = useRuntimeConfig()
  const authWorkerUrl = config.public.authWorkerUrl as string
  if (!authWorkerUrl) return

  // OAuth コールバック戻り — クライアント JS に #fragment 処理を任せる
  if (url.searchParams.has('lw_callback')) return

  // redirect_uri に lw_callback マーカー付与（リダイレクトループ防止）
  const redirectUri = `${url.origin}/?lw_callback=1`

  // ?lw=<domain> パラメータ — LINE WORKS 自動ログイン（Bot リンク/ブックマーク）
  const lwDomain = url.searchParams.get('lw')
  if (lwDomain) {
    // ドメインを cookie に保存（30日間）次回以降の自動ログイン用
    setCookie(event, 'lw_domain', lwDomain, {
      domain: getParentDomainFromHost(url.hostname),
      path: '/',
      maxAge: 30 * 24 * 60 * 60,
      secure: true,
      sameSite: 'lax',
    })
    const params = new URLSearchParams({
      address: lwDomain,
      redirect_uri: redirectUri,
    })
    return sendRedirect(event, `${authWorkerUrl}/oauth/lineworks/redirect?${params.toString()}`)
  }

  // lw_domain cookie — 過去に LINE WORKS ログインした場合の自動ログイン
  const storedLwDomain = getCookie(event, 'lw_domain')
  if (storedLwDomain) {
    const params = new URLSearchParams({
      address: storedLwDomain,
      redirect_uri: redirectUri,
    })
    return sendRedirect(event, `${authWorkerUrl}/oauth/lineworks/redirect?${params.toString()}`)
  }

  // デフォルト: 汎用ログイン画面
  return sendRedirect(event, `${authWorkerUrl}/login?redirect_uri=${encodeURIComponent(redirectUri)}`)
})
