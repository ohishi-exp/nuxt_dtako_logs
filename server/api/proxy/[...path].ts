/**
 * REST API プロキシ
 * /api/proxy/* → rust-alc-api の /api/* に転送
 *
 * 転送ロジック (Authorization 転送 / JWT→X-Tenant-ID 変換 / x-auth-token 互換 /
 * binary・JSON 透過) は @ippoan/auth-client/server に集約済み
 * (Refs ippoan/auth-worker#257)。挙動テストも lib 側にある。
 *
 * #290 Phase 4 / #293: forward の前段で requireAuth (auth-worker introspect)
 * を挟み、署名 + APP_TENANT_ACL を edge で検証する (defense-in-depth)。
 * 不正署名 / 別アプリ cookie / 不許可テナントは backend 到達前に 401 で弾く。
 */
import { createApiProxyHandler } from '@ippoan/auth-client/server'
import { requireAuth } from '../../utils/auth'

const proxy = createApiProxyHandler({
  backendUrl: event => (useRuntimeConfig(event).alcApiUrl as string) || 'https://alc-api.ippoan.org',
})

export default defineEventHandler(async (event) => {
  await requireAuth(event)
  return proxy(event)
})
