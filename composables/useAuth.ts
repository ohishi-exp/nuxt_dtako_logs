/**
 * Auth状態管理 composable
 *
 * JWT の保存・復元・URL fragment 解析・ログインリダイレクトを担当
 * localStorage + cookie の二重保存（cookie は server-side handler 用）
 */

const AUTH_STORAGE_KEY = 'logi_auth'
const AUTH_COOKIE_NAME = 'logi_auth_token'

interface AuthState {
  token: string
  orgId: string
  expiresAt: number // unix timestamp (seconds)
}

function readStorage(): AuthState | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem(AUTH_STORAGE_KEY)
    if (!raw) return null
    return JSON.parse(raw) as AuthState
  } catch {
    return null
  }
}

function writeStorage(state: AuthState): void {
  localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(state))

  // cookie にもトークンを保存（server-side handler 用: share_target 等）
  const now = Math.floor(Date.now() / 1000)
  const maxAge = Math.max(state.expiresAt - now, 0)
  document.cookie = `${AUTH_COOKIE_NAME}=${state.token}; path=/; max-age=${maxAge}; secure; samesite=lax`
}

function clearStorage(): void {
  localStorage.removeItem(AUTH_STORAGE_KEY)
  document.cookie = `${AUTH_COOKIE_NAME}=; path=/; max-age=0; secure; samesite=lax`
}

export const useAuth = () => {
  const config = useRuntimeConfig()
  const authWorkerUrl = config.public.authWorkerUrl as string

  // Global reactive state (shared across all composable calls via key 'auth')
  const authState = useState<AuthState | null>('auth', () => null)

  /** localStorage からトークンを復元。期限切れなら破棄。 */
  function loadFromStorage(): void {
    const stored = readStorage()
    if (stored) {
      const now = Math.floor(Date.now() / 1000)
      if (stored.expiresAt > now) {
        authState.value = stored
      } else {
        clearStorage()
        authState.value = null
      }
    }
  }

  /**
   * auth-worker リダイレクト後の URL fragment を解析・保存。
   * Fragment: #token=<jwt>&org_id=<uuid>&expires_at=<RFC3339>
   * @returns true if token was found and stored
   */
  function consumeFragment(): boolean {
    if (typeof window === 'undefined') return false
    const hash = window.location.hash
    if (!hash || !hash.includes('token=')) return false

    const params = new URLSearchParams(hash.slice(1))
    const token = params.get('token')
    const orgId = params.get('org_id')
    const expiresAtStr = params.get('expires_at')

    if (!token || !orgId) return false

    // expires_at: RFC3339 string or unix timestamp
    let expiresAt: number
    if (expiresAtStr) {
      const asNum = Number(expiresAtStr)
      if (!isNaN(asNum) && expiresAtStr.length >= 10) {
        expiresAt = asNum
      } else {
        const parsed = new Date(expiresAtStr).getTime()
        expiresAt = isNaN(parsed) ? Math.floor(Date.now() / 1000) + 86400 : Math.floor(parsed / 1000)
      }
    } else {
      expiresAt = Math.floor(Date.now() / 1000) + 86400
    }

    const state: AuthState = { token, orgId, expiresAt }
    writeStorage(state)
    authState.value = state

    // Clean fragment from URL without reload
    history.replaceState(null, '', window.location.pathname + window.location.search)
    return true
  }

  /** auth-worker ログイン画面へリダイレクト */
  function redirectToLogin(): void {
    if (!authWorkerUrl) {
      console.error('[Auth] authWorkerUrl is not configured')
      return
    }
    const redirectUri = window.location.origin + '/'
    window.location.href = `${authWorkerUrl}/login?redirect_uri=${encodeURIComponent(redirectUri)}`
  }

  /** ログアウト: ストレージ/cookie クリア → ログイン画面 */
  function logout(): void {
    clearStorage()
    authState.value = null
    redirectToLogin()
  }

  const isAuthenticated = computed(() => {
    if (!authState.value) return false
    const now = Math.floor(Date.now() / 1000)
    return authState.value.expiresAt > now
  })

  const token = computed(() => authState.value?.token ?? null)
  const orgId = computed(() => authState.value?.orgId ?? null)

  return {
    authState,
    isAuthenticated,
    token,
    orgId,
    loadFromStorage,
    consumeFragment,
    redirectToLogin,
    logout,
  }
}
