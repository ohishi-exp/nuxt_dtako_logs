import { describe, it, expect, vi, beforeEach } from 'vitest'

// 転送ロジック本体は @ippoan/auth-client/server (createApiProxyHandler) に
// 集約され、挙動テスト (header 構築 / binary・JSON 分類 / query 転送等) は
// lib 側 (auth-worker packages/auth-client) にある。ここでは本 repo の
// server route の wiring を固定する:
//   1. createApiProxyHandler に委譲し backendUrl が runtimeConfig を解決する
//   2. #290 Phase 4 / #293: forward 前に requireAuth (introspect edge gate) を
//      await し、throw 時は proxy に到達しない (backend 到達前に弾く)

// vi.hoisted は imports より前に走る。proxy module は load 時に
// defineEventHandler(...) を呼ぶので global を先に用意する。
const { createApiProxyHandlerMock, proxyFn, requireAuthMock } = vi.hoisted(() => {
  const proxyFn = vi.fn(() => 'PROXY_RESULT')
  ;(globalThis as Record<string, unknown>).defineEventHandler = (fn: unknown) => fn
  return {
    proxyFn,
    createApiProxyHandlerMock: vi.fn((_opts: unknown) => proxyFn),
    requireAuthMock: vi.fn(async () => {}),
  }
})
vi.mock('@ippoan/auth-client/server', () => ({ createApiProxyHandler: createApiProxyHandlerMock }))
vi.mock('../../server/utils/auth', () => ({ requireAuth: requireAuthMock }))

let runtimeConfig: Record<string, unknown> = {}
vi.stubGlobal('useRuntimeConfig', () => runtimeConfig)

import handler from '../../server/api/proxy/[...path]'

interface ProxyWiring {
  backendUrl: (event: unknown) => string
}

describe('proxy handler wiring (introspect edge gate, #290 Phase 4)', () => {
  beforeEach(() => {
    runtimeConfig = {}
    requireAuthMock.mockClear()
    requireAuthMock.mockResolvedValue(undefined)
    proxyFn.mockClear()
  })

  it('createApiProxyHandler に委譲している', () => {
    expect(createApiProxyHandlerMock).toHaveBeenCalledTimes(1)
  })

  it('backendUrl は runtimeConfig.alcApiUrl を解決する', () => {
    const opts = createApiProxyHandlerMock.mock.calls[0]![0] as ProxyWiring
    runtimeConfig = { alcApiUrl: 'https://test-api.example.com' }
    expect(opts.backendUrl({})).toBe('https://test-api.example.com')
  })

  it('alcApiUrl 未設定時は本番 URL にフォールバックする', () => {
    const opts = createApiProxyHandlerMock.mock.calls[0]![0] as ProxyWiring
    runtimeConfig = {}
    expect(opts.backendUrl({})).toBe('https://alc-api.ippoan.org')
  })

  it('forward 前に requireAuth (introspect gate) を await してから proxy に委譲する', async () => {
    const event = { id: 'e1' }
    const res = await (handler as unknown as (e: unknown) => Promise<unknown>)(event)
    expect(requireAuthMock).toHaveBeenCalledWith(event)
    expect(proxyFn).toHaveBeenCalledWith(event)
    expect(res).toBe('PROXY_RESULT')
  })

  it('requireAuth が throw したら proxy は呼ばれない (edge で弾く)', async () => {
    requireAuthMock.mockRejectedValueOnce(new Error('401'))
    await expect(
      (handler as unknown as (e: unknown) => Promise<unknown>)({}),
    ).rejects.toThrow('401')
    expect(proxyFn).not.toHaveBeenCalled()
  })
})
