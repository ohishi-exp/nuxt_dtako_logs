import { describe, it, expect, vi, beforeEach } from 'vitest'

// Override setup.ts globals with test-specific stubs
const mockFetch = vi.fn()
vi.stubGlobal('fetch', mockFetch)
vi.stubGlobal('useRuntimeConfig', () => ({
  alcApiUrl: 'https://test-api.example.com',
  public: {},
}))
vi.stubGlobal('getRouterParam', (_event: unknown, param: string) => {
  if (param === 'path') return ((_event as any).__testPath as string) || ''
  return ''
})
vi.stubGlobal('getHeader', (event: unknown, name: string) => {
  return (event as any).__testHeaders?.[name.toLowerCase()]
})
vi.stubGlobal('getQuery', (event: unknown) => {
  return (event as any).__testQuery || {}
})
vi.stubGlobal('readBody', async (event: unknown) => {
  return (event as any).__testBody
})
vi.stubGlobal('setHeader', vi.fn())
vi.stubGlobal('setResponseStatus', vi.fn())

import handler from '../../server/api/proxy/[...path]'

function makeEvent(opts: {
  method?: string
  path?: string
  headers?: Record<string, string>
  query?: Record<string, string>
  body?: unknown
}) {
  return {
    __testPath: opts.path || '',
    __testHeaders: Object.fromEntries(
      Object.entries(opts.headers || {}).map(([k, v]) => [k.toLowerCase(), v]),
    ),
    __testQuery: opts.query || {},
    __testBody: opts.body,
    method: opts.method || 'GET',
  } as any
}

function mockResponse(status: number, data: unknown = {}) {
  const body = JSON.stringify(data)
  return {
    status,
    headers: new Map([['content-type', 'application/json']]),
    text: () => Promise.resolve(body),
    json: () => Promise.resolve(data),
  }
}

describe('proxy handler', () => {
  beforeEach(() => {
    mockFetch.mockReset()
    // Re-stub in case Nuxt environment overrides
    ;(globalThis as any).useRuntimeConfig = () => ({
      alcApiUrl: 'https://test-api.example.com',
      public: {},
    })
  })

  it('proxies GET request to backend', async () => {
    mockFetch.mockResolvedValueOnce(mockResponse(200, [{ id: 1 }]))
    const result = await handler(makeEvent({
      path: 'dtako-logs/current',
      headers: { authorization: 'Bearer test-token' },
    }))
    expect(mockFetch).toHaveBeenCalledTimes(1)
    expect(mockFetch.mock.calls[0][0].toString()).toContain('/api/dtako-logs/current')
    expect(result).toEqual([{ id: 1 }])
  })

  it('extracts tenant_id from JWT', async () => {
    const payload = btoa(JSON.stringify({ tenant_id: 'test-tenant-123' }))
    const token = `h.${payload}.s`
    mockFetch.mockResolvedValueOnce(mockResponse(200))
    await handler(makeEvent({ path: 'x', headers: { authorization: `Bearer ${token}` } }))
    expect(mockFetch.mock.calls[0][1].headers['X-Tenant-ID']).toBe('test-tenant-123')
  })

  it('uses org claim as fallback', async () => {
    const payload = btoa(JSON.stringify({ org: 'org-456' }))
    mockFetch.mockResolvedValueOnce(mockResponse(200))
    await handler(makeEvent({ path: 'x', headers: { authorization: `Bearer h.${payload}.s` } }))
    expect(mockFetch.mock.calls[0][1].headers['X-Tenant-ID']).toBe('org-456')
  })

  it('handles x-auth-token (gRPC compat)', async () => {
    const payload = btoa(JSON.stringify({ tenant_id: 'xt' }))
    const token = `h.${payload}.s`
    mockFetch.mockResolvedValueOnce(mockResponse(200))
    await handler(makeEvent({ path: 'x', headers: { 'x-auth-token': token } }))
    expect(mockFetch.mock.calls[0][1].headers['Authorization']).toBe(`Bearer ${token}`)
    expect(mockFetch.mock.calls[0][1].headers['X-Tenant-ID']).toBe('xt')
  })

  it('explicit X-Tenant-ID takes priority', async () => {
    const payload = btoa(JSON.stringify({ tenant_id: 'jwt-tid' }))
    mockFetch.mockResolvedValueOnce(mockResponse(200))
    await handler(makeEvent({
      path: 'x',
      headers: { authorization: `Bearer h.${payload}.s`, 'x-tenant-id': 'explicit' },
    }))
    expect(mockFetch.mock.calls[0][1].headers['X-Tenant-ID']).toBe('explicit')
  })

  it('forwards query parameters', async () => {
    mockFetch.mockResolvedValueOnce(mockResponse(200, []))
    await handler(makeEvent({ path: 'by-date', query: { date_time: '2026-04-04', vehicle_cd: '42' } }))
    const url = mockFetch.mock.calls[0][0].toString()
    expect(url).toContain('date_time=2026-04-04')
    expect(url).toContain('vehicle_cd=42')
  })

  it('forwards POST body as JSON', async () => {
    mockFetch.mockResolvedValueOnce(mockResponse(200))
    await handler(makeEvent({
      method: 'POST', path: 'bulk',
      headers: { 'content-type': 'application/json' },
      body: { data: [1] },
    }))
    const opts = mockFetch.mock.calls[0][1]
    expect(opts.method).toBe('POST')
    expect(opts.body).toBe(JSON.stringify({ data: [1] }))
  })

  it('returns null for 204', async () => {
    mockFetch.mockResolvedValueOnce({ status: 204, headers: new Map(), text: () => Promise.resolve('') })
    expect(await handler(makeEvent({ path: 'x' }))).toBeNull()
  })

  it('handles invalid JWT gracefully', async () => {
    mockFetch.mockResolvedValueOnce(mockResponse(200))
    await handler(makeEvent({ path: 'x', headers: { authorization: 'Bearer bad' } }))
    expect(mockFetch).toHaveBeenCalledTimes(1)
  })

  it('handles POST without body', async () => {
    mockFetch.mockResolvedValueOnce(mockResponse(200))
    const orig = (globalThis as any).readBody
    ;(globalThis as any).readBody = vi.fn().mockRejectedValueOnce(new Error('no body'))
    await handler(makeEvent({ method: 'POST', path: 'x' }))
    expect(mockFetch.mock.calls[0][1].body).toBeUndefined()
    ;(globalThis as any).readBody = orig
  })

  it('forwards content-type header', async () => {
    mockFetch.mockResolvedValueOnce(mockResponse(200))
    await handler(makeEvent({ path: 'x', headers: { 'content-type': 'application/json' } }))
    expect(mockFetch.mock.calls[0][1].headers['Content-Type']).toBe('application/json')
  })

  it('handles response without content-type', async () => {
    mockFetch.mockResolvedValueOnce({ status: 200, headers: new Map(), text: () => Promise.resolve('{}') })
    expect(await handler(makeEvent({ path: 'x' }))).toEqual({})
  })

  it('handles invalid x-auth-token gracefully', async () => {
    mockFetch.mockResolvedValueOnce(mockResponse(200))
    await handler(makeEvent({ path: 'x', headers: { 'x-auth-token': 'bad-jwt' } }))
    expect(mockFetch).toHaveBeenCalledTimes(1)
    // Authorization is set but X-Tenant-ID is not (catch block)
    const hdrs = mockFetch.mock.calls[0][1].headers
    expect(hdrs['Authorization']).toBe('Bearer bad-jwt')
    expect(hdrs['X-Tenant-ID']).toBeUndefined()
  })

  it('falls back to empty path when getRouterParam returns undefined', async () => {
    mockFetch.mockResolvedValueOnce(mockResponse(200))
    const orig = (globalThis as any).getRouterParam
    ;(globalThis as any).getRouterParam = () => undefined
    await handler(makeEvent({ path: '' }))
    const url = mockFetch.mock.calls[0][0].toString()
    expect(url).toContain('/api/')
    ;(globalThis as any).getRouterParam = orig
  })

  it('falls back to default URL when alcApiUrl is empty', async () => {
    mockFetch.mockResolvedValueOnce(mockResponse(200))
    ;(globalThis as any).useRuntimeConfig = () => ({ alcApiUrl: '', public: {} })
    await handler(makeEvent({ path: 'test' }))
    const url = mockFetch.mock.calls[0][0].toString()
    expect(url).toContain('alc-api.ippoan.org')
    // Restore
    ;(globalThis as any).useRuntimeConfig = () => ({ alcApiUrl: 'https://test-api.example.com', public: {} })
  })

  it('x-auth-token uses org claim as tenant fallback', async () => {
    const payload = btoa(JSON.stringify({ org: 'org-from-xauth' }))
    const token = `h.${payload}.s`
    mockFetch.mockResolvedValueOnce(mockResponse(200))
    await handler(makeEvent({ path: 'x', headers: { 'x-auth-token': token } }))
    expect(mockFetch.mock.calls[0][1].headers['X-Tenant-ID']).toBe('org-from-xauth')
  })

  it('handles empty response body', async () => {
    mockFetch.mockResolvedValueOnce({ status: 200, headers: new Map(), text: () => Promise.resolve('') })
    expect(await handler(makeEvent({ path: 'x' }))).toBeNull()
  })

  it('handles non-JSON response body', async () => {
    mockFetch.mockResolvedValueOnce({ status: 500, headers: new Map(), text: () => Promise.resolve('Internal Server Error') })
    expect(await handler(makeEvent({ path: 'x' }))).toEqual({ error: 'Internal Server Error' })
  })

  it('no auth headers sends no tenant', async () => {
    mockFetch.mockResolvedValueOnce(mockResponse(200))
    await handler(makeEvent({ path: 'x' }))
    const headers = mockFetch.mock.calls[0][1].headers
    expect(headers['Authorization']).toBeUndefined()
    expect(headers['X-Tenant-ID']).toBeUndefined()
  })
})
