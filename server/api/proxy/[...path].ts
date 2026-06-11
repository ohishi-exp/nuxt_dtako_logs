/**
 * REST API プロキシ
 * /api/proxy/* → rust-alc-api の /api/* に転送
 *
 * 転送ロジック (Authorization 転送 / JWT→X-Tenant-ID 変換 / x-auth-token 互換 /
 * binary・JSON 透過) は @ippoan/auth-client/server に集約済み
 * (Refs ippoan/auth-worker#257)。挙動テストも lib 側にある。
 */
import { createApiProxyHandler } from '@ippoan/auth-client/server'

export default createApiProxyHandler({
  backendUrl: event => (useRuntimeConfig(event).alcApiUrl as string) || 'https://alc-api.ippoan.org',
})
