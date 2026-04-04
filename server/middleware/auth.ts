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
export function getParentDomainFromHost(hostname: string): string | undefined {
  const parts = hostname.split('.')
  return parts.length > 2 ? '.' + parts.slice(-2).join('.') : undefined
}

/** 認証判定ロジック (pure function, テスト可能) */
export function resolveAuthAction(opts: {
  pathname: string
  cookie: string | undefined
  authWorkerUrl: string
  hasLwCallback: boolean
  hasLogout: boolean
  lwParam: string | null
  storedLwDomain: string | undefined
  origin: string
  hostname: string
}): { action: 'skip' } | { action: 'redirect'; url: string; setCookie?: { name: string; value: string; domain: string | undefined } } {
  if (opts.pathname.startsWith('/api/')) return { action: 'skip' }
  if (opts.cookie) return { action: 'skip' }
  if (!opts.authWorkerUrl) return { action: 'skip' }
  if (opts.hasLwCallback) return { action: 'skip' }
  if (opts.hasLogout) return { action: 'skip' }

  const redirectUri = `${opts.origin}/?lw_callback=1`

  if (opts.lwParam) {
    const params = new URLSearchParams({ domain: opts.lwParam, redirect_uri: redirectUri })
    return {
      action: 'redirect',
      url: `${opts.authWorkerUrl}/api/auth/lineworks/redirect?${params.toString()}`,
      setCookie: { name: 'lw_domain', value: opts.lwParam, domain: getParentDomainFromHost(opts.hostname) },
    }
  }

  if (opts.storedLwDomain) {
    const params = new URLSearchParams({ domain: opts.storedLwDomain, redirect_uri: redirectUri })
    return {
      action: 'redirect',
      url: `${opts.authWorkerUrl}/api/auth/lineworks/redirect?${params.toString()}`,
    }
  }

  return {
    action: 'redirect',
    url: `https://auth.mtamaramu.com/login?redirect_uri=${encodeURIComponent(redirectUri)}`,
  }
}

export default defineEventHandler((event) => {
  const url = getRequestURL(event)
  const config = useRuntimeConfig()

  const result = resolveAuthAction({
    pathname: url.pathname,
    cookie: getCookie(event, 'logi_auth_token'),
    authWorkerUrl: config.public.authWorkerUrl as string,
    hasLwCallback: url.searchParams.has('lw_callback'),
    hasLogout: url.searchParams.has('logout'),
    lwParam: url.searchParams.get('lw'),
    storedLwDomain: getCookie(event, 'lw_domain'),
    origin: url.origin,
    hostname: url.hostname,
  })

  if (result.action === 'skip') return

  if (result.setCookie) {
    setCookie(event, result.setCookie.name, result.setCookie.value, {
      domain: result.setCookie.domain,
      path: '/',
      maxAge: 30 * 24 * 60 * 60,
      secure: true,
      sameSite: 'lax',
    })
  }

  return sendRedirect(event, result.url)
})
