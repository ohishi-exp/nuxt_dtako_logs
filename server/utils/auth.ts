import type { H3Event } from 'h3'
import { requireAuth as introspectRequireAuth } from '@ippoan/auth-client/server'

// proxy edge の introspect gate (ippoan/auth-worker#290 Phase 4 / #293)。
//
// 本 Worker の /api/proxy/* は元々 browser JWT を **署名検証せず** rust-alc-api に
// 転送していた (X-Tenant-ID も unsigned decode)。偽造署名 / 別アプリの
// .ippoan.org 共有 cookie が backend に届き得る穴 (#290 穴 #3) を、forward の
// 前段で auth-worker POST /auth/introspect を叩いて塞ぐ (defense-in-depth)。
// 本 Worker は JWT_SECRET (署名鍵) を持たず、INTERNAL_SHARED_SECRET で
// introspect を認証する。署名検証・APP_TENANT_ACL 判定は auth-worker に集約。

/** Secrets Store binding (`.get()`) / 文字列 のいずれでも値を取り出す。 */
async function resolveSecret(binding: unknown): Promise<string | null> {
  if (typeof binding === 'string') return binding
  if (binding && typeof (binding as { get?: unknown }).get === 'function') {
    return (await (binding as { get(): Promise<string> }).get()) ?? null
  }
  return null
}

function cfEnv(event: H3Event): Record<string, unknown> {
  return (event.context.cloudflare as { env?: Record<string, unknown> } | undefined)?.env ?? {}
}

/**
 * /api/proxy/* の前段で呼ぶ introspect gate。INTERNAL_SHARED_SECRET で
 * auth-worker の introspect を叩き、active (署名 OK + 許可テナント) でなければ
 * auth-client 側が 401 を throw する。binding 未設定は 503。origin は
 * auth-client が getRequestURL(event).origin から解決する (custom_domain の
 * 公開 origin)。
 */
export async function requireAuth(event: H3Event): Promise<void> {
  const env = cfEnv(event)
  const sharedSecret = await resolveSecret(env.INTERNAL_SHARED_SECRET)
  if (!sharedSecret) {
    throw createError({
      statusCode: 503,
      statusMessage: 'INTERNAL_SHARED_SECRET binding が未設定です',
    })
  }
  const authWorkerUrl =
    typeof env.NUXT_PUBLIC_AUTH_WORKER_URL === 'string' && env.NUXT_PUBLIC_AUTH_WORKER_URL
      ? env.NUXT_PUBLIC_AUTH_WORKER_URL
      : 'https://auth.ippoan.org'
  await introspectRequireAuth(event, { authWorkerUrl, sharedSecret })
}
