import { describe, it, expect, vi, beforeEach } from 'vitest'

// 転送ロジック本体は @ippoan/auth-client/server (createApiProxyHandler) に
// 集約され、挙動テスト (header 構築 / binary・JSON 分類 / query 転送等) は
// lib 側 (auth-worker packages/auth-client) にある。ここでは本 repo の
// server route が lib に正しく配線されていること (wiring) だけを固定する。

// vi.mock は hoist されるため、factory が参照する mock は vi.hoisted で先に作る
const { createApiProxyHandlerMock } = vi.hoisted(() => ({
  createApiProxyHandlerMock: vi.fn((opts: unknown) => opts),
}))
vi.mock('@ippoan/auth-client/server', () => ({
  createApiProxyHandler: createApiProxyHandlerMock,
}))

let runtimeConfig: Record<string, unknown> = {}
vi.stubGlobal('useRuntimeConfig', () => runtimeConfig)

import handler from '../../server/api/proxy/[...path]'

interface ProxyWiring {
  backendUrl: (event: unknown) => string
}

describe('proxy handler wiring', () => {
  beforeEach(() => {
    runtimeConfig = {}
  })

  it('createApiProxyHandler に委譲している', () => {
    expect(createApiProxyHandlerMock).toHaveBeenCalledTimes(1)
    expect(typeof (handler as unknown as ProxyWiring).backendUrl).toBe('function')
  })

  it('backendUrl は runtimeConfig.alcApiUrl を解決する', () => {
    runtimeConfig = { alcApiUrl: 'https://test-api.example.com' }
    const opts = handler as unknown as ProxyWiring
    expect(opts.backendUrl({})).toBe('https://test-api.example.com')
  })

  it('alcApiUrl 未設定時は本番 URL にフォールバックする', () => {
    runtimeConfig = {}
    const opts = handler as unknown as ProxyWiring
    expect(opts.backendUrl({})).toBe('https://alc-api.ippoan.org')
  })
})
